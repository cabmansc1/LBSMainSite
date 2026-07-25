import type { Metadata } from "next";
import Image from "next/image";
import { CtaBand } from "@/components/sections";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Past Card Gallery: Real Mailed Postcards",
  description:
    "Browse real Spotlight Postcards mailed across the Charleston Lowcountry. See the print quality, ad sizes, and layouts before you book.",
  alternates: { canonical: `${SITE_URL}/gallery` },
  openGraph: {
    title: `Card Gallery | ${SITE_NAME}`,
    description: "Real mailed Spotlight Postcards.",
    siteName: SITE_NAME,
    type: "website",
  },
};

const CARDS = [
  { src: "/cards/card-sample-1.webp", caption: "9×12 Spotlight Postcard, front", w: 920, h: 614 },
  { src: "/cards/card-sample-2.webp", caption: "9×12 Spotlight Postcard, back", w: 920, h: 614 },
  { src: "/cards/card-nmp-front.webp", caption: "North Mount Pleasant edition, front", w: 800, h: 534 },
  { src: "/cards/card-nmp-back.webp", caption: "North Mount Pleasant edition, back", w: 800, h: 534 },
  { src: "/cards/card-sample-a.webp", caption: "Sample layout, 11 exclusive spots", w: 800, h: 534 },
  { src: "/cards/card-detail.webp", caption: "Ad detail, medium spot", w: 800, h: 534 },
];

export default function GalleryPage() {
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
            actual Spotlight Postcards from recent mailings.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        <div className="grid sm:grid-cols-2 gap-4">
          {CARDS.map((c) => (
            <figure key={c.src} className="grid gap-2">
              <Image
                src={c.src}
                alt={c.caption}
                width={c.w}
                height={c.h}
                className="rounded-(--radius-card) border border-line w-full h-auto"
              />
              <figcaption className="text-[12.5px] text-muted">{c.caption}</figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-14">
          <CtaBand
            title="Picture your ad on the next card."
            sub="Free design, exclusive category, from $249 per mailing."
            ctaLabel="Reserve a Spot"
            ctaHref="/pricing"
          />
        </div>
      </div>
    </>
  );
}
