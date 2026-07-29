import { NextResponse } from "next/server";
import { getBlogImageBytes } from "@/lib/blog-images";

/**
 * Serves a blog featured image from the database.
 *
 * Rows are immutable: choosing a different image writes a new one with a
 * new id, so this can be cached forever without a stale image ever being
 * served. That is what keeps a database-backed hero from costing a query
 * every time somebody opens a post.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const image = await getBlogImageBytes(Number(id));
  if (!image) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(image.bytes.length),
    },
  });
}
