import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getCardAdFile } from "@/lib/uploads-migration";

/**
 * Serves a customer's print artwork out of the database.
 *
 * Admin only. These are files a business sent us for a press, they are
 * not published anywhere on the site, and the legacy host that used to
 * hold them is being switched off, so this is the only way to get one
 * back.
 *
 * Sent as an attachment rather than inline. A press-ready PDF opened in a
 * browser tab is a preview of a file somebody actually needs on disk, and
 * some of these are formats a browser will simply refuse.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();

  const { id } = await params;
  const fileId = Number(id);
  if (!Number.isInteger(fileId) || fileId <= 0) {
    return NextResponse.json({ error: "Which file?" }, { status: 422 });
  }

  const file = await getCardAdFile(fileId);
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // A filename reaches a response header here, so anything that could
  // end the header or the quoted string is stripped rather than escaped.
  const safe = file.filename.replace(/[^\w.() -]+/g, "_").slice(0, 120);

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.bytes.length),
      "Content-Disposition": `attachment; filename="${safe}"`,
      // Customer artwork behind an admin session: never cached by a
      // proxy, and not left in a shared browser cache either.
      "Cache-Control": "private, no-store",
    },
  });
}
