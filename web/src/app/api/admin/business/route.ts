import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { updateBusiness, type BusinessPatch } from "@/lib/admin-data";

/** Admin edits to a directory listing. Same tables as the legacy admin. */
export async function PATCH(req: Request) {
  await requireAdmin();

  let body: { id?: number } & BusinessPatch;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "A listing id is required" }, { status: 422 });
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
