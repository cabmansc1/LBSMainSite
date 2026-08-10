import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedStories } from "@/lib/stories";
import { kindEyebrow } from "@/lib/stories-types";
import { publishedEvents } from "@/lib/events";
import { formatPrice } from "@/lib/events-types";
import { getBusinesses } from "@/lib/directory";
import {
  listActivePlaces,
  mailingZoneFor,
  placeAndDescendants,
  placeBySlug,
} from "@/lib/places";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Everything about one part of the Lowcountry.
 *
 * The page the place tags have been quietly accumulating for. A story
 * filed against West Ashley, an event at a Summerville park and a
 * roofer listed in Mount Pleasant were each reachable from their own
 * page and nowhere else; this is where they meet.
 *
 * Any active place, not only markets. A market gathers everything under
 * it, a zone or a neighbourhood shows just itself, and both are real
 * URLs — which is the whole point, because "things to do in Summerville"
 * is a search somebody actually makes and "things to do in Greater
 * Charleston" is not.
 */
export const dynamic = "force-dynamic";

async function load(slug: string) {
  const place = await placeBySlug(slug);
  if (!place || !place.active) return null;

  const [places, family] = await Promise.all([
    listActivePlaces().catch(() => []),
    placeAndDescendants(slug),
  ]);

  const [stories, events, businesses] = await Promise.all([
    publishedStories({ placeSlugs: family, limit: 6 }).catch(() => []),
    publishedEvents({ placeSlugs: family, limit: 6, featuredFirst: true }).catch(
      () => [],
    ),
    // The directory is keyed by its own location slugs, so only a place
    // carrying that bridge can show listings. Everywhere else simply
    // has no business section rather than a broken one.
    place.directorySlug
      ? getBusinesses({ location: place.directorySlug })
          .then((r) => r.slice(0, 8))
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  return {
    place,
    children: places.filter((p) => p.parentSlug === slug),
    parent: place.parentSlug
      ? places.find((p) => p.slug === place.parentSlug)
      : undefined,
    zoneSlug: mailingZoneFor(slug, places),
    stories,
    events,
    businesses,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const place = await placeBySlug(slug);
  if (!place) return { title: "Not found" };

  const title = `${place.name}: Local News, Events and Businesses`;
  const description =
    place.blurb.trim() ||
    `What is happening in ${place.name} — local stories, upcoming events and the businesses worth knowing about.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/local/${place.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/local/${place.slug}`,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}

export default async function PlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { place, children, parent, zoneSlug, stories, events, businesses } =
    data;

  const sectionTitle = "text-[20px] font-bold tracking-tight";
  const empty = "text-[14px] text-muted";

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-12 pb-11">
          <nav className="text-[12.5px] text-[#67768A]" aria-label="Breadcrumb">
            <Link href="/local" className="hover:text-white">
              The Lowcountry
            </Link>
            {parent && (
              <>
                <span className="mx-1.5">/</span>
                <Link
                  href={`/local/${parent.slug}`}
                  className="hover:text-white"
                >
                  {parent.name}
                </Link>
              </>
            )}
          </nav>

          <h1 className="mt-4 text-[32px] md:text-[46px] font-bold tracking-[-0.035em] leading-[1.05] text-balance">
            {place.name}
          </h1>
          {place.blurb && (
            <p className="mt-4 text-[16.5px] leading-relaxed text-[#AEBDCC] max-w-[62ch]">
              {place.blurb}
            </p>
          )}

          {children.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {children.map((c) => (
                <Link
                  key={c.slug}
                  href={`/local/${c.slug}`}
                  className="text-[12.5px] px-3 py-1.5 rounded-full bg-white/8 border border-white/12 text-[#C6D3E0] hover:bg-white/14 hover:text-white"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12 grid gap-12">
        {/* What is on. First because it is the thing with a deadline. */}
        <section>
          <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
            <h2 className={sectionTitle}>What&rsquo;s on in {place.name}</h2>
            <Link
              href="/events"
              className="text-[13px] font-semibold text-brand-deep"
            >
              The whole calendar &rarr;
            </Link>
          </div>
          {events.length === 0 ? (
            <p className={empty}>
              Nothing on the calendar here yet.{" "}
              <Link href="/events/submit" className="text-brand-deep font-semibold">
                Putting something on?
              </Link>
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {events.map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.slug}`}
                  className="border border-line rounded-(--radius-card) bg-white p-5 hover:border-navy-950 flex items-start gap-3.5"
                >
                  <span className="shrink-0 w-[48px] rounded-[9px] bg-navy-950 text-white text-center py-1.5">
                    <b className="block text-[17px] leading-none num">
                      {e.dayOfMonth}
                    </b>
                    <span className="text-[10px] uppercase tracking-widest">
                      {e.monthLabel}
                    </span>
                  </span>
                  <span className="block min-w-0">
                    <span className="block text-[15px] font-semibold leading-snug">
                      {e.title}
                    </span>
                    <span className="block mt-1 text-[12.5px] text-muted">
                      {e.timeLabel}
                      {e.venueName && ` · ${e.venueName}`}
                    </span>
                    {formatPrice(e.priceText) && (
                      <span className="block mt-0.5 text-[12.5px] font-semibold num">
                        {formatPrice(e.priceText)}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
            <h2 className={sectionTitle}>Stories from {place.name}</h2>
            <Link
              href={`/stories?place=${place.slug}`}
              className="text-[13px] font-semibold text-brand-deep"
            >
              All of them &rarr;
            </Link>
          </div>
          {stories.length === 0 ? (
            <p className={empty}>Nothing written about here yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {stories.map((s) => (
                <Link
                  key={s.id}
                  href={`/stories/${s.slug}`}
                  className="border border-line rounded-(--radius-card) bg-white overflow-hidden hover:border-navy-950 grid content-start"
                >
                  {s.heroMediaId ? (
                    <span className="relative block bg-surface aspect-[16/10]">
                      <Image
                        src={`/api/media/${s.heroMediaId}`}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 360px"
                        className="object-cover"
                      />
                    </span>
                  ) : null}
                  <span className="block p-5">
                    <span className="text-[11px] uppercase tracking-widest font-semibold text-brand-deep">
                      {kindEyebrow(s.kind)}
                    </span>
                    <span className="block mt-2 text-[16px] font-semibold leading-snug">
                      {s.title}
                    </span>
                    <span className="block mt-2 text-[12px] text-muted num">
                      {s.publishedLabel}
                      {s.sponsored && " · Sponsored"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {businesses.length > 0 && (
          <section>
            <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
              <h2 className={sectionTitle}>Businesses in {place.name}</h2>
              <Link
                href={`/directory/location/${place.directorySlug}`}
                className="text-[13px] font-semibold text-brand-deep"
              >
                The full directory &rarr;
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {businesses.map((b) => (
                <Link
                  key={b.id}
                  href={`/business/${b.slug}`}
                  className="border border-line rounded-(--radius-card) bg-white p-4 hover:border-navy-950"
                >
                  <b className="block text-[14.5px] leading-snug">{b.name}</b>
                  {b.category && (
                    <span className="block mt-1 text-[12.5px] text-muted">
                      {b.category}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/*
          The commercial line, kept to the bottom and to one card.

          Somebody reading about their own town is not here to buy
          advertising, but the one relevant thing to tell them is which
          card reaches these doors — and that is worth more on a page
          about their town than anywhere else on the site.
        */}
        {zoneSlug && (
          <section className="border border-line rounded-(--radius-card) bg-surface p-6 flex items-center justify-between gap-5 flex-wrap">
            <div className="max-w-[52ch]">
              <b className="text-[16px]">
                Own a business around {place.name}?
              </b>
              <p className="text-[14px] text-muted mt-1">
                Our shared postcard reaches every mailbox here, and one
                business per category gets on it.
              </p>
            </div>
            <Link
              href={`/postcards/${zoneSlug}`}
              className="text-[13.5px] font-semibold px-4 py-2.5 rounded-[10px] bg-cta text-navy-950"
            >
              See what it costs
            </Link>
          </section>
        )}
      </div>
    </>
  );
}
