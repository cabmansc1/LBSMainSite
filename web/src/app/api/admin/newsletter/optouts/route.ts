import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  optOutMany,
  parseEmailList,
  removeOptOut,
} from "@/lib/newsletter-audience";

/**
 * The suppression list, from the admin side.
 *
 * Until this existed the only way onto lbs_newsletter_optouts was a
 * recipient clicking unsubscribe in an email, so a request made any
 * other way — a reply, a phone call, a bounce — had nowhere to go. The
 * advertiser update's audience is rebuilt from Mission Control, the
 * directory and the leads table on every send, so deleting a row
 * somewhere else does not remove anybody: this list is the only thing
 * that does.
 */

/**
 * How many addresses one paste may carry.
 *
 * Not a performance limit — it is a hand on the brake. Suppressing
 * somebody is invisible to them and to us; they simply stop hearing
 * from us. A paste that large is more likely a wrong column than a
 * decision.
 */
const MAX_PER_PASTE = 200;

export async function POST(req: Request) {
  await requireAdmin();

  let body: { action?: unknown; emails?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const action = String(body.action ?? "");

  if (action === "add") {
    const addresses = parseEmailList(String(body.emails ?? ""));
    if (addresses.length === 0) {
      return NextResponse.json(
        { error: "No addresses in that." },
        { status: 422 },
      );
    }
    if (addresses.length > MAX_PER_PASTE) {
      return NextResponse.json(
        { error: `That is ${addresses.length} addresses. ${MAX_PER_PASTE} at a time is the limit.` },
        { status: 422 },
      );
    }
    const result = await optOutMany(addresses, "admin");
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "remove") {
    const email = String(body.email ?? "").trim();
    if (!email) {
      return NextResponse.json({ error: "No address given." }, { status: 422 });
    }
    const removed = await removeOptOut(email);
    if (!removed) {
      return NextResponse.json(
        { error: "That did not save." },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
