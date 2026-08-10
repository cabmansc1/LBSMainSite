import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { EVENT_SOURCES, importAll } from "@/lib/event-import";

export const dynamic = "force-dynamic";
/** Three feeds, read one after another, over somebody else's network. */
export const maxDuration = 120;

export async function GET() {
  await requireAdmin();
  return NextResponse.json({
    sources: EVENT_SOURCES.map(({ key, label, hint, placeSlug }) => ({
      key,
      label,
      hint,
      placeSlug,
    })),
  });
}

/**
 * Pulls the feeds in.
 *
 * Admin-only and deliberately a button rather than a schedule for now:
 * the first few runs want somebody watching what arrives, because the
 * thing that goes wrong with an importer is never the fetching, it is
 * discovering that a town files its Board of Zoning Appeals under
 * community events.
 */
export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}) as { sources?: unknown });
  const keys = Array.isArray((body as { sources?: unknown }).sources)
    ? ((body as { sources: unknown[] }).sources.filter(
        (s) => typeof s === "string",
      ) as string[])
    : undefined;

  const reports = await importAll(keys);
  const added = reports.reduce((n, r) => n + r.added, 0);
  const updated = reports.reduce((n, r) => n + r.updated, 0);

  return NextResponse.json({ ok: true, added, updated, reports });
}
