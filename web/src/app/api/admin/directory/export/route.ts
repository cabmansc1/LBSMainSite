import { requireAdmin } from "@/lib/admin";
import { exportRows, toCsv } from "@/lib/directory-export";

export const dynamic = "force-dynamic";

/**
 * The directory as a CSV, in the shape the receiving panel's template
 * wants. Admin only: it carries every listing's email and phone.
 *
 * ?all=1 includes listings the public directory hides — unverified,
 * inactive or hidden. Default is what is actually published.
 */
export async function GET(req: Request) {
  await requireAdmin();

  const includeHidden = new URL(req.url).searchParams.get("all") === "1";
  const rows = await exportRows({ includeHidden });

  // Dated, because this is a snapshot and the next one will not match.
  // Sortable order so a folder of them reads chronologically.
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `lbs-directory-${stamp}${includeHidden ? "-all" : ""}.csv`;

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      // A snapshot of live data; a cached copy is a wrong copy.
      "Cache-Control": "no-store",
    },
  });
}
