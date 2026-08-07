import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createArea, renameArea, setAreaActive } from "@/lib/directory-areas";

/**
 * The areas a listing can be filed under.
 *
 * Admin only: these are the public filters, and the slug a new one gets
 * is what every listing filed there will store.
 */
export async function POST(req: Request) {
  await requireAdmin();

  let body: { action?: unknown; id?: unknown; name?: unknown; active?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const id = Number(body.id);
  const needsId = action === "rename" || action === "active";
  if (needsId && (!Number.isInteger(id) || id <= 0)) {
    return NextResponse.json({ error: "Which area?" }, { status: 422 });
  }

  const result =
    action === "create"
      ? await createArea(String(body.name ?? ""))
      : action === "rename"
        ? await renameArea(id, String(body.name ?? ""))
        : action === "active"
          ? await setAreaActive(id, body.active !== false)
          : ({ ok: false, error: "Unknown action" } as const);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  // The filters and the sitemap both read this list.
  for (const path of ["/directory", "/sitemap.xml"]) revalidatePath(path);
  return NextResponse.json({ ok: true });
}
