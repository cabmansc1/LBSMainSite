import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  CATEGORIES,
  type Category,
  migrateBatch,
  retryFailed,
} from "@/lib/uploads-migration";

/**
 * Runs one batch of the legacy uploads migration.
 *
 * One batch per request, with the browser looping, rather than one
 * request that runs to completion. Each file is a fetch from another
 * host plus a resize plus a blob insert, so a few hundred of them is
 * minutes of work: far past any request timeout, and with nothing to
 * show for it if the connection drops halfway.
 */
export const maxDuration = 300;

export async function POST(req: Request) {
  await requireAdmin();

  let body: { action?: string; category?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "retry") {
    const cleared = await retryFailed();
    return NextResponse.json({ ok: true, cleared });
  }

  const category = String(body.category ?? "") as Category;
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 422 });
  }

  // Capped rather than trusted. A batch of 500 would be a request that
  // runs for ten minutes and dies, undoing nothing but proving nothing.
  const limit = Math.min(25, Math.max(1, Number(body.limit) || 10));

  try {
    const result = await migrateBatch(category, limit);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("[uploads-migration] batch failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "The batch failed." },
      { status: 500 },
    );
  }
}
