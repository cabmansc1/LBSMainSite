import { NextResponse } from "next/server";
import { getOrderBySession } from "@/lib/orders";

/**
 * Read-only status for the success page to poll. Returns only the order
 * belonging to the session the buyer was just redirected with, and only
 * its status, reference, and amount.
 */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session" }, { status: 400 });
  }
  const order = await getOrderBySession(sessionId);
  if (!order) return NextResponse.json({ status: "unknown" });
  return NextResponse.json({
    status: order.status,
    reference: order.reference,
    amountCents: order.amountCents,
  });
}
