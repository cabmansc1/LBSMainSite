import { NextResponse } from "next/server";
import {
  buildDraftFor,
  issueLabel,
  listIssues,
} from "@/lib/advertiser-newsletter";
import { sendAlertEmail } from "@/lib/email";
import { siteOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";

/**
 * Builds the next advertiser update and says it is ready.
 *
 * Point a scheduler at this on the 1st and the 15th. It never sends
 * anything to an advertiser: it assembles a draft from the open cards,
 * the deadlines and the categories still free, and emails Andrew a link
 * to read it. Sending is a button he presses.
 *
 * Safe to call more than once. The draft is keyed to the date, so a
 * second call the same day returns the one already there rather than
 * making a duplicate nobody can tell apart, and the "ready" note only
 * goes out when a draft was genuinely created.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";

  // Same reasoning as the waitlist sweep: this touches customer-facing
  // machinery, so an endpoint anybody can hit is one anybody can use.
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

  const label = issueLabel(new Date());
  const result = await buildDraftFor(label);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (result.created) {
    const link = `${siteOrigin()}/admin/newsletter/${result.id}`;
    const issue = (await listIssues(1))[0];
    const cards = issue?.content.cards.length ?? 0;
    await sendAlertEmail("newsletter", {
      subject: `Advertiser update for ${label} is ready to read`,
      text: [
        `The ${label} advertiser update has been built and is waiting for you.`,
        "",
        cards === 1
          ? "It covers 1 open card."
          : `It covers ${cards} open cards.`,
        "",
        "Nothing has been sent. Read it, edit the intro and the story, then",
        "press Send when you are happy with it.",
        "",
        link,
      ].join("\n"),
    });
  }

  return NextResponse.json({ ok: true, label, ...result });
}
