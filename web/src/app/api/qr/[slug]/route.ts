import { NextResponse } from "next/server";
import { brandQrSvg, plainQrSvg } from "@/lib/qr";
import { getBusiness } from "@/lib/directory";
import { SITE_URL } from "@/lib/seo";

/**
 * Serves the print-ready QR code for an advertiser's tracked landing
 * page (/q/[slug]). SVG scales to any print size. ?style=plain returns
 * the high-contrast badge-free variant for very small placements.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) {
    return NextResponse.json({ error: "Unknown business" }, { status: 404 });
  }

  const target = `${SITE_URL}/q/${slug}`;
  const style = new URL(req.url).searchParams.get("style");
  const svg = style === "plain" ? await plainQrSvg(target) : await brandQrSvg(target);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
      "Content-Disposition": `inline; filename="qr-${slug}.svg"`,
    },
  });
}
