import { NextResponse } from "next/server";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { pushToMissionControl } from "@/lib/mission-control";

/**
 * Stripe webhook: the single source of truth for payment state (the
 * success page only polls; it never flips orders itself, which closes
 * the race the legacy site had between success page and webhook).
 * Signature-verified; order updates land when the DB connects.
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

  switch (event.type) {
    case "checkout.session.completed": {
      // Idempotent flip pending -> paid, guarded by status='pending'
      // in the UPDATE's WHERE clause once the orders table connects.
      const s = event.data.object;
      const md = (s.metadata ?? {}) as Record<string, string>;
      void pushToMissionControl({
        type: "order_paid",
        businessName: md.businessName,
        category: md.category,
        email: s.customer_email ?? undefined,
        zoneSlug: md.zone ?? md.card,
        spot: md.spotSize ?? md.spotType,
        amountCents: s.amount_total ?? undefined,
        reference: s.id,
      });
      break;
    }
    case "charge.refunded": {
      break;
    }
  }

  return NextResponse.json({ received: true });
}
