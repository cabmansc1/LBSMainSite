import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaBand } from "@/components/sections";
import { getPastCards } from "@/lib/past-cards";
import { galleryStats, groupIntoEditions } from "@/lib/card-editions";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Past Card Gallery: Real Mailed Postcards",
  description:
    "Browse real Spotlight Postcards mailed across the Charleston Lowcountry by neighborhood. See the print quality, the routes each card reached, and the local businesses that advertised on them.",
  alternates: { canonical: `${SITE_URL}/gallery` },
  openGraph: {
    title: `Card Gallery | ${SITE_NAME}`,
    description: "Real mailed Spotlight Postcards, by neighborhood.",
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

/**
 * The archive, by neighborhood.
 *
 * Cards mean nothing as an undifferentiated pile: someone looking at this
 * is asking "do you mail my part of town, and how often". So the index
 * is one tile per zone with a count, and the cards themselves live a
 * click deeper.
 */
export default async function GalleryPage() {
  const cards = await getPastCards({ publishedOnly: true });

  const stats = galleryStats(cards, new Date().getFullYear());

  const zones = [...new Map(cards.map((c) => [c.zoneSlug, c])).keys()]
    .map((slug) => {
      const inZone = cards.filter((c) => c.zoneSlug === slug);
      const latest = inZone[0];
      const cover =
        latest.images.find((i) => i.side === "front") ?? latest.images[0];
      return {
        slug,
        name: latest.zoneName,
        count: inZone.length,
        // How many recurring coverage areas this zone runs, which is a
        // different and more useful number than the card count once a
        // zone has mailed a dozen times.
        editions: groupIntoEditions(inZone).length,
        latestMonth: latest.mailMonth,
        cover,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

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
            Every card we have printed, by neighborhood. Open one to see the
            card itself, the routes it reached, and the local businesses that
            advertised on it.
          </p>
          {/* Counted, never typed. A figure somebody has to remember to
              update is a figure that goes stale and then gets quoted at
              a customer. This year is the one worth leading with: it is
              proof the operation is running, not a lifetime total that
              flatters an old year. */}
          {cards.length > 0 && (
            <dl className="mt-6 flex flex-wrap gap-x-9 gap-y-3">
              {[
                stats.thisYear > 0 && {
                  n: stats.thisYear,
                  label: `mailed in ${new Date().getFullYear()}`,
                },
                { n: stats.total, label: "cards in the archive" },
                { n: stats.zones, label: stats.zones === 1 ? "neighborhood" : "neighborhoods" },
                { n: stats.editions, label: stats.editions === 1 ? "edition" : "editions" },
              ]
                .filter((s): s is { n: number; label: string } => !!s)
                .map((s) => (
                  <div key={s.label}>
                    <dt className="sr-only">{s.label}</dt>
                    <dd>
                      <b className="block text-[24px] font-bold tracking-[-0.03em] num leading-none">
                        {s.n}
                      </b>
                      <span className="block text-[12.5px] text-[#67768A] mt-1">
                        {s.label}
                      </span>
                    </dd>
                  </div>
                ))}
            </dl>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        {zones.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((z) => (
              <Link
                key={z.slug}
                href={`/gallery/${z.slug}`}
                className="block border border-line rounded-(--radius-card) overflow-hidden bg-white hover:border-faint transition-colors"
              >
                {z.cover && (
                  <Image
                    src={`/api/card-image/${z.cover.id}`}
                    alt={z.cover.alt}
                    width={z.cover.width || 800}
                    height={z.cover.height || 534}
                    className="w-full h-auto"
                  />
                )}
                <span className="flex items-start justify-between gap-3 px-5 py-4">
                  <span>
                    <b className="block text-[16px] font-bold tracking-tight">
                      {z.name}
                    </b>
                    <span className="text-[12.5px] text-muted">
                      Latest mailed {z.latestMonth}
                    </span>
                    {z.editions > 1 && (
                      <span className="block text-[12px] text-faint num">
                        {z.editions} editions
                      </span>
                    )}
                  </span>
                  <span className="text-[11.5px] font-bold uppercase tracking-wider text-brand-deep bg-brand-tint border border-[#cbe7fa] rounded-full px-2.5 py-1 whitespace-nowrap num">
                    {z.count} {z.count === 1 ? "card" : "cards"}
                  </span>
                </span>
              </Link>
            ))}
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
