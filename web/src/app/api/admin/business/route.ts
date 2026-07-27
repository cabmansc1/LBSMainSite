import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import {
  businessAction,
  createBusiness,
  updateBusiness,
  type BusinessPatch,
} from "@/lib/admin-data";

const ACTIONS = [
  "approve",
  "deny",
  "toggle_hidden",
  "toggle_active",
  "toggle_featured",
  "delete",
] as const;
type Action = (typeof ACTIONS)[number];

/** Add a listing by hand, for a business that did not come in through
 *  the signup form or a bulk import. */
export async function POST(req: Request) {
  await requireAdmin();

  let body: BusinessPatch & { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "A business name is required" },
      { status: 422 },
    );
  }

  try {
    const created = await createBusiness({ ...body, name });
    for (const path of ["/directory", `/business/${created.slug}`]) {
      revalidatePath(path);
    }
    return NextResponse.json({ ok: true, ...created });
  } catch (e) {
    console.error("[admin] business create failed:", e);
    return NextResponse.json({ error: "Could not create the listing" }, { status: 500 });
  }
}

/** Admin edits to a directory listing. Same tables as the legacy admin. */
export async function PATCH(req: Request) {
  await requireAdmin();

  let body: { id?: number; ids?: number[]; action?: string } & BusinessPatch;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = Number(body.id);
  const bulk = Array.isArray((body as { ids?: number[] }).ids);
  if (!id && !bulk) {
    return NextResponse.json({ error: "A listing id is required" }, { status: 422 });
  }

  // Row and bulk actions come through the same endpoint: they are edits
  // to the same listings, and keeping them together keeps the
  // authorization in one place.
  if (typeof (body as { action?: string }).action === "string") {
    const action = (body as { action: string }).action as Action;
    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Unknown action" }, { status: 422 });
    }
    const ids = Array.isArray((body as { ids?: number[] }).ids)
      ? (body as { ids: number[] }).ids.map(Number).filter(Boolean)
      : [id];
    try {
      for (const target of ids) await businessAction(target, action);
      revalidatePath("/directory");
      return NextResponse.json({ ok: true, count: ids.length });
    } catch (e) {
      console.error("[admin] business action failed:", e);
      return NextResponse.json({ error: "Action failed" }, { status: 500 });
    }
  }

  const { id: _ignored, ...patch } = body;
  try {
    const result = await updateBusiness(id, patch);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[admin] business update failed:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
