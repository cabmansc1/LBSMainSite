import { NextResponse } from "next/server";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { pushToMissionControl } from "@/lib/mission-control";
import { markPaid, markRefunded } from "@/lib/orders";

/**
 * Stripe webhook: the single source of truth for payment state.
 *
 * The success page only reads; it never flips an order, which closes the
 * race the legacy site had between the success page and the webhook.
 * Every handler is idempotent, because Stripe retries and can deliver
 * the same event more than once.
 */
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
        });

        // Only push the first time, so a retried webhook cannot place the
        // same advertiser on a card twice in Mission Control.
        if (firstTime) {
          void pushToMissionControl({
            type: "order_paid",
            businessName: md.businessName,
            category: md.category,
            email: s.customer_email ?? undefined,
            zoneSlug: md.zone ?? md.card,
            spot: md.spotSize ?? md.spotType,
            amountCents: s.amount_total ?? undefined,
            reference: md.reference ?? s.id,
          });
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
    }
  } catch (e) {
    // A 500 makes Stripe retry, which is right for a transient failure.
    console.error(`[stripe] handling ${event.type} (${event.id}) failed:`, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
