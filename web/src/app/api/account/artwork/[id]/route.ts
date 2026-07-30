import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getArtworkBytes } from "@/lib/artwork";

/**
 * Downloads a print file back out.
 *
 * Unlike the logo route next door, this is never cached and never
 * public: a print-ready ad is the advertiser's own artwork, and the id
 * is a sequential integer that anybody could count through. Only the
 * account that sent it and an admin can read it.
 *
 * A stranger gets 404 rather than 403, so the response cannot be used
 * to learn which ids exist.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("Not found", { status: 404 });

  const { id } = await params;
  const art = await getArtworkBytes(Number(id));
  if (!art) return new NextResponse("Not found", { status: 404 });

  const mine = art.email.toLowerCase() === session.email.toLowerCase();
  if (!mine && session.role !== "admin") {
    return new NextResponse("Not found", { status: 404 });
  }

  // Quoted, with quotes and backslashes stripped: a filename is whatever
  // the customer's machine called it, and it lands in a header.
  const name = art.filename.replace(/["\\\r\n]/g, "") || "artwork";

  return new NextResponse(new Uint8Array(art.bytes), {
    headers: {
      "Content-Type": art.mime,
      "Content-Length": String(art.bytes.length),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
