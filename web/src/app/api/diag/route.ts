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
    // Exercise the same probe getBusinesses uses.
    let probe: Record<string, unknown> = {};
    try {
      const [rws] = (await db.execute(
        sql.raw(
          "SELECT id, COALESCE(lat, latitude) AS la, COALESCE(lng, longitude) AS ln FROM directory_businesses",
        ),
      )) as unknown as [{ id: number; la: unknown; ln: unknown }[]];
      probe = {
        shape: Array.isArray(rws) ? "array" : typeof rws,
        rows: Array.isArray(rws) ? rws.length : undefined,
        withCoords: Array.isArray(rws)
          ? rws.filter((r) => r.la != null && r.ln != null).length
          : undefined,
        sampleKeys: Array.isArray(rws) && rws[0] ? Object.keys(rws[0]) : undefined,
      };
    } catch (e) {
      probe = { probeError: String(e) };
    }

    const { getBusinesses } = await import("@/lib/directory");
    const biz = await getBusinesses();
    const withLat = biz.filter((b) => b.lat != null).length;

    return NextResponse.json({ coordCols, counts, probe, businesses: biz.length, withLat });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
