import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { deleteOrders } from "@/lib/orders";

/**
 * Deleting orders. Admin only, and never called by anything automatic:
 * an order is the record that someone paid, so the only good reason to
 * remove one is that it was never a real sale.
 */
export async function DELETE(req: Request) {
  await requireAdmin();

  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Nothing selected" }, { status: 422 });
  }

  const deleted = await deleteOrders(ids);
  return NextResponse.json({ ok: true, deleted });
}
