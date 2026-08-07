import { NextResponse } from "next/server";
import { sweepWaitlist } from "@/lib/waitlist-sweep";

export const dynamic = "force-dynamic";

/**
 * Checks whether anybody on the waitlist can now have what they asked
 * for, and tells them.
 *
 * Meant for a scheduler: Railway's cron, a GitHub Actions schedule, or
 * any pinger. Once or twice an hour is plenty. A category coming free is
 * measured in days, and the only cost of being slow is that somebody
 * hears an hour later than they might have.
 *
 * Nothing here needs the request. It compares Mission Control against
 * the waitlist and sends, so calling it twice in a row does nothing the
 * second time: the sender marks what it delivered and only unnotified
 * rows are ever considered.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";

  // Refuses rather than running open. This sends real email to real
  // customers, so an endpoint anybody can hit is an endpoint anybody can
  // use to mail your waitlist.
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set, so this endpoint is disabled." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const given =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("key") ??
    "";
  if (given !== secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await sweepWaitlist();
  return NextResponse.json({ ok: true, ...result });
}
