import { NextResponse } from "next/server";
import { getCardImageBytes } from "@/lib/past-cards";

/**
 * Serves a card image out of the database.
 *
 * Bytes are immutable once uploaded: replacing an image creates a new
 * row with a new id, so this can be cached hard and forever. That is
 * what keeps a database-backed image from costing a query per view.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const image = await getCardImageBytes(Number(id));
  if (!image) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(image.bytes.length),
    },
  });
}
