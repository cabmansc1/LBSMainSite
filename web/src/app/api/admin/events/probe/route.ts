import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { importFromUrl, probeUrl } from "@/lib/event-import";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/events-types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CATEGORIES = new Set<string>(EVENT_CATEGORIES.map((c) => c.value));

/**
 * Trying an address, then optionally keeping what it found.
 *
 * Two steps rather than one on purpose. Reading somebody else's
 * calendar into the queue is cheap to do and tedious to undo, so the
 * first press only looks.
 */
export async function POST(req: Request) {
  await requireAdmin();

  let body: {
    url?: unknown;
    resolvedUrl?: unknown;
    kind?: unknown;
    placeSlug?: unknown;
    category?: unknown;
    action?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "import") {
    const resolvedUrl = String(body.resolvedUrl ?? "");
    const kind = body.kind === "tribe" ? "tribe" : "ical";
    const placeSlug = String(body.placeSlug ?? "").slice(0, 80);
    const category = String(body.category ?? "community");
    if (!resolvedUrl) {
      return NextResponse.json({ error: "Nothing to bring in." }, { status: 422 });
    }
    if (!placeSlug) {
      return NextResponse.json(
        { error: "Say which part of town these belong to." },
        { status: 422 },
      );
    }
    const report = await importFromUrl(
      resolvedUrl,
      kind,
      placeSlug,
      (CATEGORIES.has(category) ? category : "community") as EventCategory,
    );
    return NextResponse.json({ ok: true, report });
  }

  const result = await probeUrl(String(body.url ?? ""));
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  return NextResponse.json({ ok: true, ...result });
}
