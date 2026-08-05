import { NextResponse } from "next/server";
import { getAdBytes } from "@/lib/ads";

/**
 * Serves an ad creative from the database.
 *
 * Cached for a day rather than forever, unlike listing logos: replacing
 * a logo writes a new row with a new id, but replacing an ad's artwork
 * keeps the id so the campaign keeps its numbers. A day is short enough
 * that swapped artwork appears without anyone clearing a cache, and long
 * enough that the same leaderboard is not fetched on every page view.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const image = await getAdBytes(Number(id));
  if (!image) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=86400",
      "Content-Length": String(image.bytes.length),
    },
  });
}
