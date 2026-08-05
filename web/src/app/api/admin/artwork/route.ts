import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { deleteArtwork } from "@/lib/artwork";

/**
 * Removing an uploaded file.
 *
 * Unscoped on purpose: this is the admin, and the whole reason it exists
 * is the files nobody else can get rid of, including test uploads made
 * from an account that is not the customer's.
 */
export async function DELETE(req: Request) {
  await requireAdmin();

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Which file?" }, { status: 422 });
  }

  const removed = await deleteArtwork(id);
  return removed
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "That file is not there." }, { status: 404 });
}
