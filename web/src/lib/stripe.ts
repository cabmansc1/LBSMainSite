import "server-only";
import Stripe from "stripe";

/**
 * Stripe wrapper. Keys come from env (test mode on staging, live only
 * at cutover). When no key is configured the checkout API runs in
 * preview mode and simulates the redirect so flows stay testable.
 */
export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;

/**
 * The webhook signing secrets this deploy will accept, in order.
 *
 * Stripe signs with the secret of the endpoint that fired, and an
 * endpoint is tied to one URL. During cutover the app answers on two,
 * the Railway domain and the real one, so two endpoints exist and only
 * one of their secrets could be the single configured value. Whoever
 * forgot to swap it at DNS time would get a checkout that works
 * perfectly while nothing downstream ever runs.
 *
 * So the variable takes a list. Set both secrets before cutover and
 * there is nothing to remember on the day; delete the retired one
 * afterwards. Separated by commas or whitespace, because both are what
 * people actually type.
 */
export const webhookSecrets = (): string[] =>
  (process.env.STRIPE_WEBHOOK_SECRET ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/**
 * A recurring subscription, for Directory Premium.
 *
 * price_data rather than a saved Stripe Price, matching the one-off
 * checkout above and for the same reason: the amount is editable in our
 * admin, so it has to be the amount we send. Stripe holds whatever a
 * subscriber signed up at, so a later price change applies to new
 * subscribers and never silently re-bills anyone.
 */
export async function createSubscriptionSession(opts: {
  name: string;
  amountCents: number;
  interval: "month" | "year";
  email: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: opts.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: opts.amountCents,
          recurring: { interval: opts.interval },
          product_data: { name: opts.name },
        },
      },
    ],
    allow_promotion_codes: true,
    // On both, because the session metadata is what
    // checkout.session.completed carries and the subscription metadata
    // is what every later subscription event carries. Without the
    // second, a cancellation months from now would arrive with no way
    // to tell which listing it belonged to.
    metadata: opts.metadata,
    subscription_data: { metadata: opts.metadata },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
}

export async function createCheckoutSession(opts: {
  name: string;
  amountCents: number;
  email?: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: opts.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: opts.amountCents,
          product_data: { name: opts.name },
        },
      },
    ],
    // Discounts are Stripe's job: create a coupon and a promotion code
    // there and this flag puts the "Add promotion code" field on the
    // hosted checkout page. Nothing to configure on our side.
    allow_promotion_codes: true,
    metadata: opts.metadata,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
}
