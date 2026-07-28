import { NextResponse } from "next/server";
import { zoneBySlug } from "@/lib/zones";
import { pushToMissionControl } from "@/lib/mission-control";

/**
 * Category waitlist: when a category is exclusive on the current
 * mailing, capture the business and notify them first when the next
 * card in that zone opens. Writes to waitlist_entries once the DB
 * connects; validates and accepts in preview mode.
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

  void pushToMissionControl({
    type: "waitlist_joined",
    businessName:
      typeof body.businessName === "string" ? body.businessName : undefined,
    email,
    category,
    zoneSlug: zone.slug,
  });

  if (!process.env.DB_HOST) {
    return NextResponse.json({ ok: true, preview: true });
  }

  const { db } = await import("@/lib/db");
  const { waitlistEntries, mailingZones } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const zoneRow = await db
    .select()
    .from(mailingZones)
    .where(eq(mailingZones.slug, zone.slug))
    .limit(1);
  if (!zoneRow[0]) {
    return NextResponse.json({ error: "Unknown zone" }, { status: 404 });
  }

  await db
    .insert(waitlistEntries)
    .values({
      zoneId: zoneRow[0].id,
      categoryId: 0,
      email,
      businessName:
        typeof body.businessName === "string" ? body.businessName : null,
    })
    .onDuplicateKeyUpdate({ set: { email } });

  return NextResponse.json({ ok: true });
}
