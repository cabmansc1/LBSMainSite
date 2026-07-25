import { NextResponse } from "next/server";
import { zoneBySlug } from "@/lib/zones";

/**
 * Category waitlist: when a category is exclusive on the current
 * mailing, capture the business and notify them first when the next
 * card in that zone opens. Writes to waitlist_entries once the DB
 * connects; validates and accepts in preview mode.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const zone = zoneBySlug(String(body.zoneSlug ?? ""));
  const category = String(body.category ?? "").trim();
  const email = String(body.email ?? "").trim();

  if (!zone || !category || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Zone, category, and a valid email are required." },
      { status: 422 },
    );
  }

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
