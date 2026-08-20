import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  setWaitlistNotified,
  deleteWaitlistEntries,
  notifyWaitlistEntries,
  reassignWaitlistCategory,
} from "@/lib/waitlist";

/**
 * How many notices go out in one click.
 *
 * The sends are sequential and paced, so the batch size is really a
 * budget for how long this request may run. It is also a hand on the
 * brake: the difference between a mistaken click and an apology to
 * everyone on the list is worth a second confirmation.
 */
const MAX_PER_SEND = 20;

/** Working the waitlist queue: send the notice, mark handled, undo, or remove. Admin only. */
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

  // The action the button's label promises: mail them, then record it.
  if (action === "notify") {
    if (ids.length > MAX_PER_SEND) {
      return NextResponse.json(
        { error: `Send to ${MAX_PER_SEND} at a time or fewer.` },
        { status: 422 },
      );
    }
    const result = await notifyWaitlistEntries(ids);
    // ok means the run happened, not that every address took it. Who
    // did and did not go is in outcomes, and the client shows it rather
    // than collapsing a partial send into one word.
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "notified" || action === "waiting") {
    const changed = await setWaitlistNotified(ids, action === "notified");
    return NextResponse.json({ ok: true, changed });
  }
  if (action === "delete") {
    const deleted = await deleteWaitlistEntries(ids);
    return NextResponse.json({ ok: true, deleted });
  }

  // One row, not a selection: moving somebody is a decision about that
  // person and the category they were offered instead, and there is no
  // version of it that is right for twenty rows at once.
  if (action === "reassign") {
    if (ids.length !== 1) {
      return NextResponse.json(
        { error: "Move one at a time." },
        { status: 422 },
      );
    }
    const result = await reassignWaitlistCategory(
      ids[0],
      String((body as { category?: unknown }).category ?? ""),
    );
    if (!result.ok) return NextResponse.json(result, { status: 422 });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 422 });
}
