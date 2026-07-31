import "server-only";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { getLivePricing } from "@/lib/pricing-store";
import { getLiveDirectoryPricing } from "@/lib/directory-pricing";
import { ALL_SIZES, type Reach } from "@/lib/pricing";
import { emailEnabled } from "@/lib/email";

/**
 * Is this deploy actually able to take live money and finish the job?
 *
 * Every failure this looks for has the same shape: the payment works,
 * the customer is charged, and something after the charge quietly does
 * not happen. A webhook secret from the wrong mode, an endpoint pointing
 * at the staging URL, Mission Control still in dry run. None of them
 * show up on the checkout page; all of them show up a day later as a
 * customer who paid and is not on a card.
 *
 * Read-only. It creates nothing in Stripe.
 */

export type CheckState = "ok" | "warn" | "fail";

export type Check = {
  label: string;
  state: CheckState;
  detail: string;
};

/** The events the webhook actually handles. */
export const REQUIRED_EVENTS = [
  "checkout.session.completed",
  "charge.refunded",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

const WEBHOOK_PATH = "/api/stripe/webhook";

/**
 * Test or live, read off the key rather than from a variable somebody
 * set to describe it. sk_ is a secret key, rk_ a restricted one.
 */
export function stripeKeyMode(): "live" | "test" | "unknown" | "none" {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return "none";
  if (/^(sk|rk)_live_/.test(key)) return "live";
  if (/^(sk|rk)_test_/.test(key)) return "test";
  return "unknown";
}

/** Where Stripe should be sending events for this deploy. */
export function expectedWebhookUrl(): string | null {
  const origin = (
    process.env.PUBLIC_SITE_URL ??
    process.env.SITE_ORIGIN ??
    ""
  ).trim();
  return origin ? `${origin.replace(/\/+$/, "")}${WEBHOOK_PATH}` : null;
}

const covers = (events: string[]) =>
  events.includes("*")
    ? []
    : REQUIRED_EVENTS.filter((e) => !events.includes(e));

export async function stripePreflight(): Promise<Check[]> {
  const checks: Check[] = [];
  const mode = stripeKeyMode();

  if (!stripeEnabled()) {
    return [
      {
        label: "Secret key",
        state: "fail",
        detail:
          "STRIPE_SECRET_KEY is not set. Checkout runs in preview mode: it simulates the redirect and takes no money.",
      },
    ];
  }

  checks.push({
    label: "Secret key",
    state: mode === "live" ? "ok" : mode === "test" ? "warn" : "fail",
    detail:
      mode === "live"
        ? "Live key. Real cards, real money."
        : mode === "test"
          ? "Test key. Payments here are not real; use 4242 4242 4242 4242."
          : "The key does not start with sk_live_, sk_test_, rk_live_ or rk_test_. Stripe will reject it.",
  });

  // Everything below needs Stripe to answer, and one unreachable API
  // must not take the page down: a preflight that cannot run is itself
  // the finding.
  let account;
  let liveMode = false;
  try {
    // retrieveCurrent is this key's own account. The balance call is
    // what proves which mode Stripe thinks we are in: the key prefix is
    // a string anyone can mistype, livemode is Stripe's own answer.
    const stripe = getStripe();
    const [acct, balance] = await Promise.all([
      stripe.accounts.retrieveCurrent(),
      stripe.balance.retrieve(),
    ]);
    account = acct;
    liveMode = balance.livemode;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    checks.push({
      label: "Stripe connection",
      state: "fail",
      // Stripe's own message names the problem precisely (expired key,
      // wrong mode, revoked) and contains no secret.
      detail: `Could not read the account: ${message}`,
    });
    return checks;
  }

  const name =
    account.business_profile?.name ??
    account.settings?.dashboard?.display_name ??
    account.id;
  checks.push({
    label: "Account",
    state: account.charges_enabled ? "ok" : "fail",
    detail: account.charges_enabled
      ? `${name} can accept charges, in ${liveMode ? "live" : "test"} mode.${account.payouts_enabled ? "" : " Payouts are not enabled yet, so money collects in Stripe rather than reaching the bank."}`
      : `${name} cannot accept charges yet. Finish Stripe's account activation before pointing customers at checkout.`,
  });

  // The prefix is a string somebody typed; livemode is Stripe's answer.
  // They only disagree if a key was edited by hand, and that disagreement
  // is worth more than either fact on its own.
  if ((mode === "live") !== liveMode && mode !== "unknown") {
    checks.push({
      label: "Key mode",
      state: "fail",
      detail: `The key looks like a ${mode} key but Stripe answers in ${liveMode ? "live" : "test"} mode. Re-copy it from the dashboard.`,
    });
  }

  // The webhook is the only thing that turns a payment into a placed
  // advertiser, a receipt and a CRM record. Everything about it is
  // checked, because a missing one fails silently and looks exactly
  // like a working checkout.
  checks.push({
    label: "Webhook signing secret",
    state: process.env.STRIPE_WEBHOOK_SECRET ? "ok" : "fail",
    detail: process.env.STRIPE_WEBHOOK_SECRET
      ? "Set. It must be the secret for the endpoint below, in this same mode: a test-mode secret with a live key rejects every event as an invalid signature."
      : "STRIPE_WEBHOOK_SECRET is not set. The webhook answers 503 and no payment is ever fulfilled.",
  });

  const wantUrl = expectedWebhookUrl();
  checks.push({
    label: "Public site URL",
    state: wantUrl ? (wantUrl.startsWith("https://") ? "ok" : "warn") : "fail",
    detail: wantUrl
      ? wantUrl.startsWith("https://")
        ? `Return URLs and the webhook endpoint use ${wantUrl.replace(WEBHOOK_PATH, "")}`
        : `${wantUrl} is not https. Stripe will not deliver to it.`
      : "Neither PUBLIC_SITE_URL nor SITE_ORIGIN is set. Return URLs fall back to the forwarded host, which is right on Railway but worth setting explicitly before cutover.",
  });

  try {
    const endpoints = await getStripe().webhookEndpoints.list({ limit: 30 });
    const ours = endpoints.data.filter((e) => e.url.endsWith(WEBHOOK_PATH));
    const match = wantUrl ? ours.find((e) => e.url === wantUrl) : ours[0];

    if (!match) {
      checks.push({
        label: "Webhook endpoint",
        state: "fail",
        detail: ours.length
          ? `This ${mode} account has an endpoint at ${ours.map((e) => e.url).join(", ")}, which is not ${wantUrl}. Events are going somewhere else.`
          : `No endpoint in this ${mode} account points at ${wantUrl ?? WEBHOOK_PATH}. Payments will complete and nothing will be fulfilled.`,
      });
    } else {
      const missing = covers(match.enabled_events);
      const enabled = match.status === "enabled";
      checks.push({
        label: "Webhook endpoint",
        state: enabled && missing.length === 0 ? "ok" : "fail",
        detail: !enabled
          ? `${match.url} exists but is disabled in Stripe.`
          : missing.length
            ? `${match.url} is not subscribed to ${missing.join(", ")}.`
            : `${match.url}, enabled, subscribed to all ${REQUIRED_EVENTS.length} events we handle.`,
      });
    }
  } catch (e) {
    // A restricted key can read balances without listing endpoints, so
    // this is a gap in the check rather than a fault in the setup.
    checks.push({
      label: "Webhook endpoint",
      state: "warn",
      detail: `Could not list endpoints with this key: ${e instanceof Error ? e.message : String(e)}. Check it by hand in the Stripe dashboard.`,
    });
  }

  // Not Stripe's business, but it decides whether a paid order becomes
  // a placed advertiser, and it is one variable away from silently not.
  checks.push({
    label: "Mission Control writes",
    state: process.env.MC_READ_ONLY === "1" ? "fail" : "ok",
    detail:
      process.env.MC_READ_ONLY === "1"
        ? "MC_READ_ONLY=1. Paid orders are logged instead of placed: the customer pays and never appears on a card. Clear it before taking live payments."
        : "Live. A paid order is written to the card.",
  });

  checks.push({
    label: "Receipts",
    state: emailEnabled() ? "ok" : "warn",
    detail: emailEnabled()
      ? "Sending. A paid order emails a receipt."
      : "No RESEND_API_KEY, so receipts are logged rather than sent. Stripe still emails its own if that is switched on in the dashboard.",
  });

  // A price of zero is a real setting and means "not sold". Checkout
  // refuses it, so this is only worth flagging where it looks like an
  // oversight rather than a decision.
  try {
    const pricing = await getLivePricing();
    const zeros = (["5k", "10k"] as Reach[]).flatMap((reach) =>
      ALL_SIZES.filter((size) => pricing[reach][size].priceCents <= 0).map(
        (size) => `${reach} ${size}`,
      ),
    );
    const directory = await getLiveDirectoryPricing();
    const directoryZeros = [
      directory.monthlyCents <= 0 ? "monthly" : null,
      directory.annualCents <= 0 ? "annual" : null,
    ].filter(Boolean);

    checks.push({
      label: "Prices",
      state: zeros.length || directoryZeros.length ? "warn" : "ok",
      detail:
        zeros.length || directoryZeros.length
          ? `Not on sale: ${[...zeros, ...directoryZeros.map((d) => `directory ${d}`)].join(", ")}. Checkout refuses these, which is right if it was deliberate.`
          : "Every ad size and both directory terms have a price.",
    });
  } catch (e) {
    checks.push({
      label: "Prices",
      state: "warn",
      detail: `Could not read pricing: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  return checks;
}
