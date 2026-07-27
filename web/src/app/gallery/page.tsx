import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaBand } from "@/components/sections";
import { getPastCards } from "@/lib/past-cards";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Past Card Gallery: Real Mailed Postcards",
  description:
    "Browse real Spotlight Postcards mailed across the Charleston Lowcountry. See the print quality, the neighborhoods each card reached, and the businesses that advertised on them.",
  alternates: { canonical: `${SITE_URL}/gallery` },
  openGraph: {
    title: `Card Gallery | ${SITE_NAME}`,
    description: "Real mailed Spotlight Postcards.",
    siteName: SITE_NAME,
    type: "website",
  },
};

// Cards are uploaded from the admin, so never a build-time snapshot.
export const dynamic = "force-dynamic";

/** Stand-ins, shown only until the archive has real cards in it. */
const SAMPLES = [
  { src: "/cards/card-sample-1.webp", caption: "9x12 Spotlight Postcard, front", w: 920, h: 614 },
  { src: "/cards/card-sample-2.webp", caption: "9x12 Spotlight Postcard, back", w: 920, h: 614 },
  { src: "/cards/card-nmp-front.webp", caption: "North Mount Pleasant edition, front", w: 800, h: 534 },
  { src: "/cards/card-nmp-back.webp", caption: "North Mount Pleasant edition, back", w: 800, h: 534 },
  { src: "/cards/card-sample-a.webp", caption: "Sample layout, exclusive spots", w: 800, h: 534 },
  { src: "/cards/card-detail.webp", caption: "Ad detail, medium spot", w: 800, h: 534 },
];

export default async function GalleryPage() {
  const cards = await getPastCards({ publishedOnly: true });

  const jsonLd = cards.length
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Spotlight Postcard gallery",
        url: `${SITE_URL}/gallery`,
        hasPart: cards.map((c) => ({
          "@type": "CreativeWork",
          name: `${c.cardName ?? c.zoneName} Spotlight Postcard, ${c.mailMonth}`,
          url: `${SITE_URL}/cards/${c.slug}`,
        })),
      }
    : null;

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Card gallery
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[22ch] text-balance">
            Real cards we mailed.
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[56ch]">
            Print quality sells the product better than any pitch. These are
            actual Spotlight Postcards from recent mailings, with the
            neighborhoods each one reached and the businesses that rode it.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        {cards.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c) => {
              const img = c.images.find((i) => i.side === "front") ?? c.images[0];
              return (
                <Link
                  key={c.slug}
                  href={`/cards/${c.slug}`}
                  className="block border border-line rounded-(--radius-card) overflow-hidden bg-white hover:border-faint transition-colors"
                >
                  {img && (
                    <Image
                      src={`/api/card-image/${img.id}`}
                      alt={img.alt}
                      width={img.width || 800}
                      height={img.height || 534}
                      className="w-full h-auto"
                    />
                  )}
                  <span className="block px-5 py-4">
                    <b className="block text-[15px] font-semibold tracking-tight">
                      {c.cardName ?? c.zoneName}
                    </b>
                    <span className="text-[13px] text-muted">
                      Mailed {c.mailMonth}
                    </span>
                    {c.description && (
                      <span className="block text-[12.5px] text-muted mt-1.5 line-clamp-2">
                        {c.description}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {SAMPLES.map((c) => (
              <figure key={c.src} className="grid gap-2">
                <Image
                  src={c.src}
                  alt={c.caption}
                  width={c.w}
                  height={c.h}
                  className="rounded-(--radius-card) border border-line w-full h-auto"
                />
                <figcaption className="text-[12.5px] text-muted">
                  {c.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="mt-14">
          <CtaBand
            title="Picture your ad on the next card."
            sub="Free design, exclusive category, from $249 per mailing."
            ctaLabel="Reserve a Spot"
            ctaHref="/pricing"
          />
        </div>
      </div>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  );
}
