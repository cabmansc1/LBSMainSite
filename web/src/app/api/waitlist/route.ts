import { after, NextResponse } from "next/server";
import { zoneBySlug } from "@/lib/zones";
import { pushToMissionControl } from "@/lib/mission-control";
import { ghlSend } from "@/lib/ghl";
import { buildTags, tagFields } from "@/lib/ghl-tags";
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
 * Stored in the category column for interest in a card size we are not
 * currently mailing, so these rows are one query away in the admin and
 * in Mission Control without needing a second table for a list we hope
 * stays short.
 *
 * The larger card is a real product with real prices; it just has no
 * card scheduled at the moment. Somebody asking for one is demand data
 * that decides whether to schedule it, so it is worth the same capture
 * as the smaller card that does not exist yet.
 */
const INTEREST_CATEGORY: Record<string, string> = {
  "smaller-card": "Interest: 2,500 household card",
  "larger-card": "Interest: 10,000 household card",
};

const INTEREST_TAG = {
  "smaller-card": "waitlist-smaller-card",
  "larger-card": "waitlist-larger-card",
} as const;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const zone = zoneBySlug(String(body.zoneSlug ?? ""));
  const email = String(body.email ?? "").trim();

  // Two kinds of wait share this endpoint. The original is "your
  // category is taken on this card, tell me when it frees up", which
  // needs a category. The others are "I want a card at that size", which
  // have no category to reserve because there is no card yet. All of
  // them are the same promise to email someone when something opens.
  const interest = String(body.interest ?? "");
  const interestCategory = INTEREST_CATEGORY[interest];
  const category = interestCategory ?? String(body.category ?? "").trim();

  if (!zone || !category || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      {
        error: interestCategory
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

  // Somebody whose category was taken is the warmest lead the site
  // produces short of a sale: they tried to buy and were turned away by
  // inventory rather than by price. This was reaching Mission Control
  // and the database and never the CRM, which is where a lead actually
  // gets worked.
  after(() =>
    ghlSend(
      {
        email,
        name: businessName,
        companyName: businessName,
        source: interestCategory
          ? `Waitlist: ${interestCategory}, ${zone.name}`
          : `Waitlist: ${category} in ${zone.name}`,
        signup_type: "waitlist",
        category: interestCategory ? "" : category,
        location: zone.name,
        zone: zone.slug,
        ...tagFields(
          buildTags({
            kind: interestCategory
              ? INTEREST_TAG[interest as keyof typeof INTEREST_TAG]
              : "waitlist-category",
            zoneSlug: zone.slug,
            category: interestCategory ? undefined : category,
          }),
        ),
        submitted_at: new Date().toISOString(),
      },
      "waitlist",
    ),
  );

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
