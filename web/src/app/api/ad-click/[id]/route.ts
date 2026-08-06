import { NextResponse } from "next/server";
import { after } from "next/server";
import { clickTargetFor, recordClick } from "@/lib/ads";

/**
 * Counts a click and forwards to the advertiser.
 *
 * The destination is read from the row, never from the request, so this
 * cannot be handed a URL and turned into an open redirect pointing at
 * somewhere unpleasant from our domain.
 *
 * Counting happens in after(), so a slow write never sits between
 * somebody clicking an ad and arriving at the advertiser. This is a
 * Route Handler, where that is allowed to touch request data; it does
 * not need to.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const adId = Number(id);
  const target = await clickTargetFor(adId);
  if (!target) return new NextResponse("Not found", { status: 404 });

  after(() => recordClick(adId));

  // 302, not 301. A permanent redirect would be cached by the browser
  // and every click after the first would skip this handler entirely,
  // so the count would stop at one per person forever.
  return NextResponse.redirect(target, 302);
}
