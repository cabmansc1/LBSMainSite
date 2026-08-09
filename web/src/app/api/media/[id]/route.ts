import { NextResponse } from "next/server";
import { getMediaBytes } from "@/lib/media";

/**
 * Serves a picture from the media library.
 *
 * Rows are immutable: replacing an image writes a new one with a new id
 * rather than editing bytes in place, so this can be cached forever and
 * a cached URL can never come back with a different picture than it did
 * the first time. Editing the alt text does not change the bytes, so it
 * does not need to bust this either.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const image = await getMediaBytes(Number(id));
  if (!image) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(image.bytes.length),
    },
  });
}
