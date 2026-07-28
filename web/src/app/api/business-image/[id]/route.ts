import { NextResponse } from "next/server";
import { getBusinessImageBytes } from "@/lib/business-images";

/**
 * Serves a listing logo from the database.
 *
 * Rows are immutable: replacing a logo writes a new one with a new id,
 * so this can be cached forever without a stale image ever being
 * served. That is what keeps database-backed images from costing a
 * query per page view.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const image = await getBusinessImageBytes(Number(id));
  if (!image) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(image.bytes.length),
    },
  });
}
