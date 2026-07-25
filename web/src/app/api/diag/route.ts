import { NextResponse } from "next/server";

/**
 * TEMPORARY diagnostics: reports which coordinate columns exist on
 * directory_businesses and how many rows are filled. Aggregate counts
 * only, no row data. Remove after the map-pin investigation.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("k") !== "coords-check") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    const [cols] = (await db.execute(
      sql.raw("SHOW COLUMNS FROM directory_businesses"),
    )) as unknown as [{ Field: string }[]];
    const coordCols = cols
      .map((c) => c.Field)
      .filter((f) => /lat|lng|long/i.test(f));
    const counts: Record<string, number> = {};
    for (const n of coordCols) {
      const [r] = (await db.execute(
        sql.raw(
          `SELECT COUNT(\`${n}\`) AS filled, COUNT(*) AS total FROM directory_businesses`,
        ),
      )) as unknown as [{ filled: number; total: number }[]];
      counts[n] = Number(r[0].filled);
      counts.total = Number(r[0].total);
    }
    return NextResponse.json({ coordCols, counts });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
