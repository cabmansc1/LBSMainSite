import { NextResponse } from "next/server";
import { zoneBySlug } from "@/lib/zones";
import { pushToMissionControl } from "@/lib/mission-control";
import { addWaitlistEntry } from "@/lib/waitlist";

/**
 * Category waitlist: when a category is exclusive on the current
 * mailing, capture the business and notify them first when the next
 * card in that zone opens.
 *
 * This used to insert into the Drizzle `waitlist_entries` table after
 * joining `mailing_zones` to turn a slug into an id. Neither table was
 * ever created, so every submission threw and returned a 500, and the
 * category the whole feature exists to record was not stored anywhere.
 * Both now go through lib/waitlist.ts, keyed by zone slug.
 */

/**
 * Stored in the category column for smaller-card interest, so these
 * rows are one query away in the admin and in Mission Control without
 * needing a second table for a list we hope stays short.
 */
const SMALLER_CARD_INTEREST = "Interest: 2,500 household card";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const zone = zoneBySlug(String(body.zoneSlug ?? ""));
  const email = String(body.email ?? "").trim();

  // Two different waits share this endpoint. The original is "your
  // category is taken on this card, tell me when it frees up", which
  // needs a category. The other is "I want the smaller card when you
  // price it", which has no category to reserve: there is no card yet.
  // Both are the same promise to email someone when something opens.
  const smallerCard = body.interest === "smaller-card";
  const category = smallerCard
    ? SMALLER_CARD_INTEREST
    : String(body.category ?? "").trim();

  if (!zone || !category || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      {
        error: smallerCard
          ? "Pick a neighborhood and give us a valid email."
          : "Zone, category, and a valid email are required.",
      },
      { status: 422 },
    );
  }

  const businessName =
    typeof body.businessName === "string" ? body.businessName : undefined;

  void pushToMissionControl({
    type: "waitlist_joined",
    businessName,
    email,
    category,
    zoneSlug: zone.slug,
  });

  if (!process.env.DB_HOST) {
    return NextResponse.json({ ok: true, preview: true });
  }

  // Mission Control is a dry run whenever MC_READ_ONLY is set, which it
  // is on staging, so this row is the only durable record of the lead.
  // If it does not land, say so rather than promising a callback that
  // nothing is holding.
  const saved = await addWaitlistEntry({
    zoneSlug: zone.slug,
    category,
    email,
    businessName,
  });
  if (!saved) {
    return NextResponse.json(
      { error: "We could not save that. Please call us on (843) 212-2969." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
