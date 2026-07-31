import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { deleteLeads } from "@/lib/admin-data";

/** Deleting leads. Admin only, matching the legacy admin/leads.php action. */
export async function DELETE(req: Request) {
  await requireAdmin();

  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Nothing selected" }, { status: 422 });
  }

  const deleted = await deleteLeads(ids);
  return NextResponse.json({ ok: true, deleted });
}
