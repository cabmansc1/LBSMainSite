import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { setWaitlistNotified, deleteWaitlistEntries } from "@/lib/waitlist";

/** Working the waitlist queue: mark handled, undo, or remove. Admin only. */
export async function POST(req: Request) {
  await requireAdmin();

  let body: { ids?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Nothing selected" }, { status: 422 });
  }

  const action = String(body.action ?? "");
  if (action === "notified" || action === "waiting") {
    const changed = await setWaitlistNotified(ids, action === "notified");
    return NextResponse.json({ ok: true, changed });
  }
  if (action === "delete") {
    const deleted = await deleteWaitlistEntries(ids);
    return NextResponse.json({ ok: true, deleted });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 422 });
}
