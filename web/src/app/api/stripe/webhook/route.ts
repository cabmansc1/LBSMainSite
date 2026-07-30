import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { pushToMissionControl } from "@/lib/mission-control";
import { markPaid, markRefunded } from "@/lib/orders";
import { findOrCreatePortalUser } from "@/lib/auth";
import { sendOrderReceipt } from "@/lib/order-receipt";
import { pushOrderToGhl } from "@/lib/order-ghl";

/**
 * Stripe webhook: the single source of truth for payment state.
 *
 * The success page only reads; it never flips an order, which closes the
 * race the legacy site had between the success page and the webhook.
 * Every handler is idempotent, because Stripe retries and can deliver
 * the same event more than once.
 */
/**
 * When the current period ends, wherever this API version keeps it.
 *
 * Stripe moved `current_period_end` from the subscription onto its
 * items. Reading only one of the two places would silently record a
 * null renewal date, which is the kind of thing nobody notices until
 * somebody asks when they are next billed.
 */
function periodEndOf(sub: Stripe.Subscription): Date | null {
  const onSub = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  const onItem = (
    sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined
  )?.current_period_end;
  const seconds = onSub ?? onItem;
  return typeof seconds === "number" ? new Date(seconds * 1000) : null;
}

/**
 * A Premium listing's first payment.
 *
 * The subscription is fetched rather than trusted from the session,
 * because the session carries an id and nothing about the status, the
 * period or the amount. Recording it is what verifies the listing and
 * puts it on the paid plan.
 */
async function activateDirectoryPremium(
  session: Stripe.Checkout.Session,
  md: Record<string, string>,
) {
  const businessId = Number(md.businessId);
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? "");

  if (!businessId || !subscriptionId) {
    console.error("[stripe] premium session missing ids:", session.id);
    return;
  }

  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  const { recordSubscription, isLive } = await import(
    "@/lib/directory-subscriptions"
  );

  const email = session.customer_email ?? session.customer_details?.email ?? "";

  await recordSubscription({
    businessId,
    email,
    stripeCustomerId:
      typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? ""),
    stripeSubscriptionId: sub.id,
    term: md.term === "annual" ? "annual" : "monthly",
    status: sub.status,
    amountCents: sub.items?.data?.[0]?.price?.unit_amount ?? 0,
    currentPeriodEnd: periodEndOf(sub),
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
  });

  // The listing is public from this moment, so the pages that list it
  // have to be told.
  for (const path of ["/directory", "/admin/directory"]) {
    revalidatePath(path);
  }

  // Only once it is actually live. A welcome for a subscription that
  // failed its first payment would be pointing at a page nobody can see.
  if (isLive(sub.status)) {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    const rows = (await db.execute(
      sql`SELECT business_name, slug FROM directory_businesses WHERE id = ${businessId} LIMIT 1`,
    )) as unknown as [{ business_name: string; slug: string }[]];
    const biz = rows[0]?.[0];

    const facts = {
      businessName: String(biz?.business_name ?? ""),
      email,
      plan: (md.term === "annual" ? "annual" : "monthly") as "annual" | "monthly",
      businessId,
      slug: String(biz?.slug ?? ""),
      siteOrigin: process.env.SITE_ORIGIN?.trim() || undefined,
    };

    const { sendPremiumWelcome, sendSignupAlert } = await import(
      "@/lib/registration-emails"
    );
    // Both swallow their own failures: a webhook that returns non-2xx
    // because Resend was down would make Stripe retry the whole event.
    await Promise.all([sendPremiumWelcome(facts), sendSignupAlert(facts)]);
  }
}

export async function POST(req: Request) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const md = (s.metadata ?? {}) as Record<string, string>;

        // A directory subscription, not a postcard order. Nothing below
        // applies to it: there is no lbs_orders row, no card in Mission
        // Control and no spot to place.
        if (md.kind === "directory_premium") {
          await activateDirectoryPremium(s, md);
          break;
        }

        // Only a session Stripe considers settled counts as paid.
        if (s.payment_status !== "paid") break;

        const paymentIntent =
          typeof s.payment_intent === "string"
            ? s.payment_intent
            : (s.payment_intent?.id ?? undefined);

        // Idempotent: pending -> paid, once.
        const firstTime = await markPaid({
          sessionId: s.id,
          paymentIntent,
          reference: md.reference,
          // Stripe's total, so a promotion code is reflected rather than
          // the list price the order was created at.
          amountCents: s.amount_total ?? undefined,
        });

        // Only push the first time, so a retried webhook cannot place the
        // same advertiser on a card twice in Mission Control.
        if (firstTime) {
          // Buying is what creates the account. Without this the
          // customer pays and then meets a login wall, which is the
          // dead end the success page used to point them at.
          //
          // Fire and forget, and it returns null rather than throwing:
          // a payment must never fail because a login could not be
          // made. The same lookup runs at sign-in, so a failure here
          // self-heals the first time they ask for a code.
          const buyerEmail = s.customer_email ?? md.email;
          if (buyerEmail) {
            void findOrCreatePortalUser(buyerEmail).catch((e) =>
              console.error("[stripe] could not create portal user:", e),
            );
          }

          void pushToMissionControl({
            type: "order_paid",
            businessName: md.businessName,
            category: md.category,
            email: s.customer_email ?? undefined,
            phone: md.phone || undefined,
            zoneSlug: md.zone ?? md.card,
            // Checkout recorded which of the zone's cards was bought.
            // Dropping it here is what let a paid advertiser land on the
            // wrong Summerville card.
            cardId: md.cardId || undefined,
            spot: md.spotSize ?? md.spotType,
            amountCents: s.amount_total ?? undefined,
            reference: md.reference ?? s.id,
          });

          // Inside the same guard as the placement, for the same reason:
          // Stripe delivers an event more than once, and a second
          // receipt for one payment reads as a second charge.
          //
          // Fire and forget, and it swallows its own failures. Returning
          // a non-2xx because Resend was down would make Stripe retry
          // the whole event, and the retry re-runs everything above to
          // fix an email that is not worth re-running any of it.
          void sendOrderReceipt({
            sessionId: s.id,
            email: s.customer_email ?? md.email,
            amountCents: s.amount_total ?? undefined,
            metadata: md,
          }).catch((e) => console.error("[stripe] receipt failed:", e));

          // Same guard again. A purchase reached Mission Control, the
          // inbox and the database and never the CRM, so a contact who
          // paid stayed tagged a lead and kept receiving the pitch.
          void pushOrderToGhl({
            reference: md.reference ?? s.id,
            email: s.customer_email ?? md.email,
            businessName: md.businessName,
            phone: md.phone || undefined,
            category: md.category,
            zoneSlug: md.zone ?? md.card,
            cardId: md.cardId || undefined,
            cardName: md.cardName || undefined,
            mailMonth: md.mailMonth || undefined,
            spot: md.spotSize ?? md.spotType,
            amountCents: s.amount_total ?? undefined,
          }).catch((e) => console.error("[stripe] ghl push failed:", e));
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntent =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : (charge.payment_intent?.id ?? undefined);
        if (paymentIntent) await markRefunded(paymentIntent);
        break;
      }

      // Everything after the first payment: renewals, a card that
      // stopped working, a cancellation, a reactivation. All of them
      // are the same operation here, because the listing's plan is
      // derived from the status rather than from which event arrived.
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const md = (sub.metadata ?? {}) as Record<string, string>;
        if (md.kind !== "directory_premium") break;

        const businessId = Number(md.businessId);
        if (!businessId) {
          console.error("[stripe] subscription event with no businessId:", sub.id);
          break;
        }

        const { recordSubscription } = await import(
          "@/lib/directory-subscriptions"
        );
        await recordSubscription({
          businessId,
          email: typeof sub.customer === "string" ? "" : "",
          stripeCustomerId:
            typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? ""),
          stripeSubscriptionId: sub.id,
          term: md.term === "annual" ? "annual" : "monthly",
          // deleted arrives with whatever status it ended on; treating
          // it as canceled outright keeps the two events from
          // disagreeing about a subscription that is over.
          status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
          amountCents: sub.items?.data?.[0]?.price?.unit_amount ?? 0,
          currentPeriodEnd: periodEndOf(sub),
          cancelAtPeriodEnd: !!sub.cancel_at_period_end,
        });

        for (const path of ["/directory", "/admin/directory"]) {
          revalidatePath(path);
        }
        break;
      }
    }
  } catch (e) {
    // A 500 makes Stripe retry, which is right for a transient failure.
    console.error(`[stripe] handling ${event.type} (${event.id}) failed:`, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
