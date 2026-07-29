import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/sections";
import { getPastCard, getPastCards } from "@/lib/past-cards";
import { editionNeighbours } from "@/lib/card-editions";
import { getMcCardById } from "@/lib/mission-control";
import { getBusinesses } from "@/lib/directory";
import { findBusiness } from "@/lib/name-match";
import { zoneBySlug } from "@/lib/zones";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * One mailed card, with its photos, the ground it covered, and the
 * businesses that rode it.
 *
 * The photo is not what makes this page worth having. The zone, the mail
 * month, the ZIPs and the advertiser names are: they make it a real page
 * about a real mailing, and they put an internal link between the zone
 * landing pages and the directory listings, which is the connection the
 * site was missing.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const card = await getPastCard(slug);
  if (!card || !card.published) return {};
  const name = card.cardName ?? card.zoneName;
  const title = `${name} Spotlight Postcard, ${card.mailMonth}`;
  const description =
    card.description ??
    `See the ${name} Spotlight Postcard mailed in ${card.mailMonth}: the real 9x12 card, the neighborhoods it reached, and the local businesses that advertised on it.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/cards/${card.slug}` },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      siteName: SITE_NAME,
      type: "article",
    },
  };
}

export default async function PastCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await getPastCard(slug);
  if (!card || !card.published || card.images.length === 0) notFound();

  const zone = zoneBySlug(card.zoneSlug);
  // Mission Control still holds the routes and the advertiser list for a
  // card it printed, so none of that has to be typed in again.
  const mc = card.mcCardId ? await getMcCardById(card.mcCardId) : undefined;
  const zips = [...new Set((mc?.routes ?? []).map((r) => r.zip))].sort();
  const routeCount = (mc?.routes ?? []).length;
  // The quantity mailed, from Mission Control. Not the sum of the route
  // table: routes are edited up to the print deadline and the table is
  // not always trued up afterwards, so its total is an estimate wearing
  // the clothes of an exact figure.
  const reached = mc?.households;

  // Link an advertiser to their directory listing where we have one.
  const listings = await getBusinesses().catch(() => []);
  // Mission Control stores "Other" when nobody has classified an
  // advertiser yet. Printing that on a public page tells a reader
  // nothing, so it counts as unknown and the directory listing's real
  // category wins.
  const realCategory = (c?: string) =>
    c && c.trim().toLowerCase() !== "other" ? c.trim() : undefined;

  const advertisers = (mc?.advertisers ?? []).map((a) => {
    // Mission Control and the directory are typed by different hands, so
    // an exact compare misses real matches: "Colucci's" against
    // "Colucci's Jewelers" and so on.
    const listing = findBusiness(a.businessName, listings);
    return {
      ...a,
      listing,
      // A mailed card printed these details for thousands of homes, and
      // the directory already publishes them, so the phone and the site
      // belong here. Email does not: that is the owner's inbox, not
      // something the card ever showed.
      phone: listing?.phone,
      website: listing?.website,
      category: realCategory(a.category) ?? realCategory(listing?.category),
    };
  });

  const zoneCards = await getPastCards({
    publishedOnly: true,
    zoneSlug: card.zoneSlug,
  });
  // The other issues of this same coverage area. Someone looking at one
  // card most often wants the one before it, and until now the only way
  // there was back out to the zone and reading dates.
  const { edition, newer, older } = editionNeighbours(zoneCards, card);
  const inZone = zoneCards.filter((c) => c.slug !== card.slug);
  const others = (
    inZone.length > 0
      ? inZone
      : (await getPastCards({ publishedOnly: true })).filter(
          (c) => c.slug !== card.slug,
        )
  ).slice(0, 3);

  const hero = card.images.find((i) => i.side === "front") ?? card.images[0];
  const rest = card.images.filter((i) => i.id !== hero.id);
  const name = card.cardName ?? card.zoneName;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${name} Spotlight Postcard, ${card.mailMonth}`,
    url: `${SITE_URL}/cards/${card.slug}`,
    datePublished: card.mailDate,
    description:
      card.description ??
      `The ${name} Spotlight Postcard mailed in ${card.mailMonth}.`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    image: card.images.map((i) => ({
      "@type": "ImageObject",
      url: `${SITE_URL}/api/card-image/${i.id}`,
      width: i.width,
      height: i.height,
      caption: i.caption ?? i.alt,
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Card gallery", item: `${SITE_URL}/gallery` },
      {
        "@type": "ListItem",
        position: 3,
        name: card.zoneName,
        item: `${SITE_URL}/gallery/${card.zoneSlug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: `${name}, ${card.mailMonth}`,
        item: `${SITE_URL}/cards/${card.slug}`,
      },
    ],
  };

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-11 pb-12">
          <nav className="text-[12.5px] text-[#67768A] flex gap-2" aria-label="Breadcrumb">
            <Link href="/gallery" className="hover:text-white">
              Card gallery
            </Link>
            <span>/</span>
            <Link href={`/gallery/${card.zoneSlug}`} className="hover:text-white">
              {card.zoneName}
            </Link>
            <span>/</span>
            <b className="text-white font-semibold">{card.mailMonth}</b>
          </nav>
          <h1 className="mt-4 text-[26px] md:text-[38px] font-bold tracking-[-0.03em] max-w-[24ch] text-balance">
            {name} Spotlight Postcard, {card.mailMonth}
          </h1>
          {card.description && (
            <p className="mt-3 text-[#93A5B8] max-w-[62ch]">{card.description}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { value: card.mailMonth, label: "Mailed" },
              ...(zips.length ? [{ value: zips.join(", "), label: "ZIP codes" }] : []),
              ...(reached ? [{ value: reached, label: "Households reached" }] : []),
              ...(advertisers.length
                ? [{ value: String(advertisers.length), label: "Businesses on the card" }]
                : []),
            ].map((chip) => (
              <div
                key={chip.label}
                className="bg-white/4 border border-white/12 rounded-[10px] px-4.5 py-3"
              >
                <b className="block text-base font-bold num">{chip.value}</b>
                <span className="text-[11px] text-[#67768A] uppercase tracking-wider font-semibold">
                  {chip.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12 grid gap-10">
        <figure className="grid gap-2.5">
          <Image
            src={`/api/card-image/${hero.id}`}
            alt={hero.alt}
            width={hero.width || 1800}
            height={hero.height || 1200}
            className="rounded-(--radius-card) border border-line w-full h-auto"
            priority
          />
          {hero.caption && (
            <figcaption className="text-[13px] text-muted">{hero.caption}</figcaption>
          )}
        </figure>

        {rest.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {rest.map((img) => (
              <figure key={img.id} className="grid gap-2">
                <Image
                  src={`/api/card-image/${img.id}`}
                  alt={img.alt}
                  width={img.width || 1800}
                  height={img.height || 1200}
                  className="rounded-(--radius-card) border border-line w-full h-auto"
                />
                {img.caption && (
                  <figcaption className="text-[12.5px] text-muted">
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        {advertisers.length > 0 && (
          <section className="grid gap-4">
            <div>
              <h2 className="text-[21px] font-bold tracking-[-0.02em]">
                Businesses on this card
              </h2>
              <p className="text-[14.5px] text-muted mt-1">
                One business per category rode this mailing. Every one of them
                had the category to themselves.
              </p>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {advertisers.map((a) => (
                <li
                  key={a.businessName}
                  className="border border-line rounded-(--radius-card) px-5 py-4 bg-white grid gap-2 content-start"
                >
                  <div>
                    <b className="block text-[15px] font-semibold tracking-tight">
                      {a.listing ? (
                        <Link
                          href={`/business/${a.listing.slug}`}
                          className="hover:text-brand-deep"
                        >
                          {a.businessName}
                        </Link>
                      ) : (
                        a.businessName
                      )}
                    </b>
                    {a.category && (
                      <span className="text-[12.5px] text-muted">{a.category}</span>
                    )}
                  </div>
                  {(a.phone || a.website) && (
                    <div className="grid gap-1 text-[13px]">
                      {a.phone && (
                        <a
                          href={`tel:${a.phone.replace(/[^0-9+]/g, "")}`}
                          className="font-medium text-body hover:text-brand-deep num"
                        >
                          {a.phone}
                        </a>
                      )}
                      {a.website && (
                        <a
                          href={a.website}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="font-medium text-brand-deep hover:underline truncate"
                        >
                          {a.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                        </a>
                      )}
                    </div>
                  )}
                  {a.listing && (
                    <Link
                      href={`/business/${a.listing.slug}`}
                      className="text-[12.5px] font-semibold text-brand-deep hover:underline"
                    >
                      View directory listing
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid lg:grid-cols-2 gap-4">
          <Card className="p-6.5 grid gap-2.5 content-start">
            <h2 className="text-[17px] font-semibold tracking-tight">
              Where this card went
            </h2>
            <p className="text-sm text-body leading-relaxed">
              {zips.length > 0
                ? `${routeCount} full USPS carrier routes across ZIP ${zips.join(", ")} in ${card.zoneName}.`
                : `Full USPS carrier routes across ${card.zoneName}.`}
            </p>
            {zone && (
              <Link
                href={`/${zone.slug}-direct-mail-marketing`}
                className="text-sm font-semibold text-brand-deep hover:underline"
              >
                About direct mail in {zone.name}
              </Link>
            )}
          </Card>
          <Card className="p-6.5 grid gap-3 content-start">
            <h2 className="text-[17px] font-semibold tracking-tight">
              Want the next one?
            </h2>
            <p className="text-sm text-body leading-relaxed">
              Categories are exclusive per card, and they go first come. See
              which {card.zoneName} cards are filling now.
            </p>
            <Button href="/pricing">Reserve a spot</Button>
          </Card>
        </section>

        {/* Walking the series. An edition that has mailed repeatedly is
            the strongest thing this page can say, and stepping through it
            is how somebody sees that rather than being told. */}
        {edition && edition.issues.length > 1 && (
          <section className="border border-line rounded-(--radius-card) bg-white px-5 py-4">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 className="text-[15px] font-semibold tracking-tight">
                {edition.name}
              </h2>
              <span className="text-[12.5px] text-muted num">
                Mailed {edition.issues.length} times
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 mt-3 text-[13px]">
              {older ? (
                <Link
                  href={`/cards/${older.slug}`}
                  className="text-brand-deep font-semibold hover:underline"
                >
                  Previous: {older.mailMonth}
                </Link>
              ) : (
                <span className="text-faint">First issue</span>
              )}
              <Link
                href={`/gallery/${card.zoneSlug}`}
                className="text-muted hover:text-ink"
              >
                All {card.zoneName} cards
              </Link>
              {newer ? (
                <Link
                  href={`/cards/${newer.slug}`}
                  className="text-brand-deep font-semibold hover:underline"
                >
                  Next: {newer.mailMonth}
                </Link>
              ) : (
                <span className="text-faint">Latest issue</span>
              )}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section className="grid gap-3.5">
            <h2 className="text-[17px] font-semibold tracking-tight">
              More cards we mailed
            </h2>
            <ul className="grid sm:grid-cols-3 gap-3.5">
              {others.map((c) => {
                const img = c.images.find((i) => i.side === "front") ?? c.images[0];
                return (
                  <li key={c.slug}>
                    <Link
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
                      <span className="block px-4 py-3">
                        <b className="block text-[14px] font-semibold">
                          {c.cardName ?? c.zoneName}
                        </b>
                        <span className="text-[12.5px] text-muted">
                          {c.mailMonth}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}
