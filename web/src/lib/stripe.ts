import "server-only";
import Stripe from "stripe";

/**
 * Stripe wrapper. Keys come from env (test mode on staging, live only
 * at cutover). When no key is configured the checkout API runs in
 * preview mode and simulates the redirect so flows stay testable.
 */
export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
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
