import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getBusiness } from "@/lib/directory";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * QR landing page: the URL behind the QR code printed on an advertiser's
 * postcard ad. Every render in production records a scan (qr_scans), so
 * "tracking included" is a number the advertiser can watch, not a
 * promise. Until the DB connects, directory data stands in.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBusiness(slug);
  if (!b) return {};
  return {
    title: `${b.name}: Special Offer`,
    description: b.offer?.title ?? b.description.slice(0, 155),
    alternates: { canonical: `${SITE_URL}/q/${slug}` },
    robots: { index: false, follow: false },
  };
}

async function recordScan(slug: string) {
  if (!process.env.DB_HOST) return;
  try {
    const { db } = await import("@/lib/db");
    const { qrPages, qrScans } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const page = await db
      .select()
      .from(qrPages)
      .where(eq(qrPages.slug, slug))
      .limit(1);
    if (page[0]) {
      await db.insert(qrScans).values({ qrPageId: page[0].id });
    }
  } catch {
    // A failed scan write must never break the visitor's page.
  }
}

export default async function QrLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = await getBusiness(slug);

  // This path is printed on cards that are already in mailboxes, so a
  // renamed listing has to keep resolving here or the code on the paper
  // stops working and there is no way to reissue it. The scan is
  // recorded against the slug that was actually scanned, which is the
  // one printed on the card, so a rename does not break the count.
  if (!b) {
    const { resolveSlugRedirect } = await import("@/lib/slug-redirects");
    const moved = await resolveSlugRedirect(slug);
    if (moved) {
      await recordScan(slug);
      permanentRedirect(`/q/${moved}`);
    }
    notFound();
  }

  await recordScan(slug);

  return (
    <div className="bg-navy-950 min-h-full">
      <div className="mx-auto max-w-[420px] px-6 py-14 grid gap-4">
        <div className="bg-white rounded-2xl p-8 grid gap-5 text-center justify-items-center">
          <span className="w-14 h-14 rounded-xl bg-brand text-navy-950 font-bold text-xl flex items-center justify-center">
            {b.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")}
          </span>
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em]">{b.name}</h1>
            <p className="text-[13px] text-muted mt-1">
              {b.category} · {b.locationArea}, SC
            </p>
          </div>

          {b.offer && (
            <div className="w-full bg-cta-tint border border-[#f3ddbb] rounded-xl px-5 py-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#a05e00]">
                Postcard offer
              </span>
              <p className="text-[16px] font-bold mt-1">{b.offer.title}</p>
              <p className="text-[11.5px] text-muted mt-1.5">
                Mention the postcard when you call.
              </p>
            </div>
          )}

          <div className="grid gap-2.5 w-full">
            {b.phone && (
              <a
                href={`tel:${b.phone.replace(/\D/g, "")}`}
                className="bg-cta text-navy-950 font-bold text-[15px] px-6 py-3.5 rounded-[10px] hover:bg-cta-hover hover:text-white transition-colors"
              >
                Call {b.phone}
              </a>
            )}
            {b.website && (
              <a
                href={b.website}
                target="_blank"
                rel="noopener"
                className="bg-white text-ink border border-line-strong font-semibold text-[14px] px-6 py-3 rounded-[10px] hover:border-faint transition-colors"
              >
                Visit website
              </a>
            )}
            <a
              href={`/business/${b.slug}`}
              className="text-[13px] font-semibold text-brand-deep hover:underline"
            >
              See full listing
            </a>
          </div>
        </div>
        <p className="text-center text-[11px] text-[#67768A]">
          Found on a Lowcountry Business Spotlight postcard
        </p>
      </div>
    </div>
  );
}
