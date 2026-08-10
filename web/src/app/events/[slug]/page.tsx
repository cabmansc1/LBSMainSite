import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedEvent, publishedEvents } from "@/lib/events";
import { categoryLabel, formatPrice, priceNumber } from "@/lib/events-types";
import { listActivePlaces } from "@/lib/places";
import { PROSE_CLASS } from "@/lib/prose";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const e = await getPublishedEvent(slug);
  if (!e) return { title: "Event" };

  const title = `${e.title}${e.dayLabel ? `, ${e.dayLabel}` : ""}`;
  // Where and when, in the sentence Google shows under the link. A
  // description that repeats the headline wastes the one line a search
  // result gives you to answer "is this near me and is it on".
  const description =
    e.summary.trim() ||
    [
      categoryLabel(e.category),
      e.venueName ? `at ${e.venueName}` : "",
      e.dayLabel ? `on ${e.dayLabel}` : "",
      "in the Lowcountry.",
    ]
      .filter(Boolean)
      .join(" ");
  const image = e.heroMediaId
    ? `${SITE_URL}/api/media/${e.heroMediaId}`
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/events/${e.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/events/${e.slug}`,
      siteName: SITE_NAME,
      type: "website",
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const e = await getPublishedEvent(slug);
  if (!e) notFound();

  const [places, more] = await Promise.all([
    listActivePlaces().catch(() => []),
    publishedEvents({ limit: 4 }),
  ]);
  const placeName = (s: string) => places.find((p) => p.slug === s)?.name ?? s;
  const related = more.filter((x) => x.id !== e.id).slice(0, 3);

  const price = formatPrice(e.priceText);
  const amount = priceNumber(e.priceText);
  const where = [e.venueName, e.address].filter(Boolean).join(", ");
  const directions = where
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        where,
      )}`
    : "";
  const canonical = `${SITE_URL}/events/${e.slug}`;

  /*
   * Event structured data, done properly.
   *
   * Google surfaces event rich results prominently and almost nobody in
   * this market marks them up at all, so it is worth more here than the
   * effort suggests. startDate must carry the offset, which the stored
   * ISO string already does.
   *
   * `offers` is what turns a plain result into one showing a price, and
   * it is left off entirely rather than guessed when the price field is
   * prose. A free event says so with a zero, which is different from
   * saying nothing.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Event",
        name: e.title,
        description: e.summary || undefined,
        startDate: e.startsAt || undefined,
        endDate: e.endsAt || undefined,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        image: e.heroMediaId
          ? `${SITE_URL}/api/media/${e.heroMediaId}`
          : undefined,
        url: canonical,
        location:
          e.venueName || e.address
            ? {
                "@type": "Place",
                name: e.venueName || placeName(e.placeSlug),
                address: e.address
                  ? {
                      "@type": "PostalAddress",
                      streetAddress: e.address,
                      addressLocality: placeName(e.placeSlug) || undefined,
                      addressRegion: "SC",
                      addressCountry: "US",
                    }
                  : undefined,
              }
            : undefined,
        offers:
          amount === undefined
            ? undefined
            : {
                "@type": "Offer",
                price: amount,
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                url: e.ticketUrl || canonical,
                validFrom: e.startsAt || undefined,
              },
        performer: e.businessName
          ? { "@type": "Organization", name: e.businessName }
          : undefined,
        organizer: e.businessName
          ? {
              "@type": "Organization",
              name: e.businessName,
              url: e.businessSlug
                ? `${SITE_URL}/business/${e.businessSlug}`
                : undefined,
            }
          : { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Events",
            item: `${SITE_URL}/events`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: categoryLabel(e.category),
            item: `${SITE_URL}/events?category=${e.category}`,
          },
          { "@type": "ListItem", position: 3, name: e.title, item: canonical },
        ],
      },
    ],
  };

  const rowLabel = "text-[11px] uppercase tracking-widest font-semibold text-muted";

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1080px] px-6 pt-10 pb-11">
          <nav className="text-[12.5px] text-[#67768A]" aria-label="Breadcrumb">
            <Link href="/events" className="hover:text-white">
              Events
            </Link>
            <span className="mx-1.5">/</span>
            <Link
              href={`/events?category=${e.category}`}
              className="hover:text-white"
            >
              {categoryLabel(e.category)}
            </Link>
          </nav>

          <div className="mt-5 flex items-start gap-5">
            {/* The date, at the size a poster would print it. Somebody
                scanning an event page is answering "when" before they
                have finished reading the title. */}
            <span className="shrink-0 w-[74px] rounded-[12px] bg-white/10 border border-white/15 text-center py-2.5">
              <b className="block text-[30px] leading-none num">
                {e.dayOfMonth}
              </b>
              <span className="text-[11px] uppercase tracking-widest text-[#AEBDCC]">
                {e.monthLabel}
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-widest text-brand">
                {categoryLabel(e.category)}
              </p>
              <h1 className="mt-1.5 text-[27px] md:text-[40px] font-bold tracking-[-0.03em] leading-[1.1] text-balance">
                {e.title}
              </h1>
            </div>
          </div>

          {e.summary && (
            <p className="mt-5 text-[16.5px] leading-relaxed text-[#AEBDCC] max-w-[62ch]">
              {e.summary}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1080px] px-6 py-10 grid lg:grid-cols-[1fr_320px] gap-10 items-start">
        <article className="min-w-0">
          {e.heroMediaId && (
            <Image
              src={`/api/media/${e.heroMediaId}`}
              alt=""
              width={1400}
              height={788}
              loading="eager"
              className="w-full h-auto rounded-(--radius-card) border border-line mb-8"
            />
          )}

          {e.bodyHtml ? (
            <div
              className={PROSE_CLASS}
              dangerouslySetInnerHTML={{ __html: e.bodyHtml }}
            />
          ) : (
            !e.heroMediaId && (
              <p className="text-[15px] text-muted leading-relaxed max-w-[62ch]">
                {e.summary ||
                  `${categoryLabel(e.category)} in ${
                    placeName(e.placeSlug) || "the Lowcountry"
                  }.`}{" "}
                {e.url
                  ? "There is more detail on the organizer's own page."
                  : ""}
              </p>
            )
          )}

          {e.businessSlug && (
            <div className="mt-10 border border-line rounded-(--radius-card) bg-surface p-5">
              <p className={rowLabel}>Hosted by</p>
              <p className="mt-1.5 text-[17px] font-semibold">
                {e.businessName}
              </p>
              <Link
                href={`/business/${e.businessSlug}`}
                className="mt-2 inline-block text-[14px] font-semibold text-brand-deep"
              >
                See their listing &rarr;
              </Link>
            </div>
          )}
        </article>

        {/* Everything needed to actually go, in one block that stays put
            while the page is read. */}
        <aside className="lg:sticky lg:top-6 border border-line rounded-(--radius-card) bg-white overflow-hidden">
          <dl className="grid gap-0">
            <div className="px-5 py-4 border-b border-line">
              <dt className={rowLabel}>When</dt>
              <dd className="mt-1 text-[14.5px] font-semibold leading-snug">
                {e.dayLabel}
                {e.multiDay && e.endDayLabel ? (
                  <span className="block font-normal text-body">
                    through {e.endDayLabel}
                  </span>
                ) : null}
                {e.timeLabel && (
                  <span className="block font-normal text-body num">
                    {e.timeLabel}
                    {!e.multiDay && e.endTimeLabel
                      ? ` – ${e.endTimeLabel}`
                      : ""}
                  </span>
                )}
              </dd>
            </div>

            {(where || e.placeSlug) && (
              <div className="px-5 py-4 border-b border-line">
                <dt className={rowLabel}>Where</dt>
                <dd className="mt-1 text-[14.5px] leading-snug">
                  {e.venueName && (
                    <span className="block font-semibold">{e.venueName}</span>
                  )}
                  {e.address && (
                    <span className="block text-body">{e.address}</span>
                  )}
                  {e.placeSlug && (
                    <span className="block text-muted text-[13px]">
                      {placeName(e.placeSlug)}
                    </span>
                  )}
                  {directions && (
                    <a
                      href={directions}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-block text-[13px] font-semibold text-brand-deep"
                    >
                      Directions &rarr;
                    </a>
                  )}
                </dd>
              </div>
            )}

            {price && (
              <div className="px-5 py-4 border-b border-line">
                <dt className={rowLabel}>Cost</dt>
                <dd className="mt-1 text-[14.5px] font-semibold num">
                  {price}
                </dd>
              </div>
            )}
          </dl>

          <div className="p-5 grid gap-2.5">
            {e.ticketUrl && (
              <a
                href={e.ticketUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-[14px] font-semibold text-center px-4 py-2.5 rounded-[10px] bg-cta text-navy-950"
              >
                Get tickets
              </a>
            )}
            <a
              href={`/api/events/${e.slug}/ics`}
              className="text-[14px] font-semibold text-center px-4 py-2.5 rounded-[10px] bg-navy-950 text-white"
            >
              Add to calendar
            </a>
            {e.url && (
              <a
                href={e.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-[13.5px] font-semibold text-center px-4 py-2.5 rounded-[10px] border border-line-strong"
              >
                Organizer&rsquo;s page
              </a>
            )}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                canonical,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold text-center text-muted hover:text-ink py-1"
            >
              Share this
            </a>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="bg-surface border-t border-line">
          <div className="mx-auto max-w-[1080px] px-6 py-14">
            <h2 className="text-[20px] font-bold tracking-tight mb-4">
              Also coming up
            </h2>
            <div className="grid sm:grid-cols-3 gap-3.5">
              {related.map((x) => (
                <Link
                  key={x.id}
                  href={`/events/${x.slug}`}
                  className="border border-line rounded-(--radius-card) bg-white p-5 hover:border-navy-950"
                >
                  <p className="text-[12.5px] text-muted num">{x.dayLabel}</p>
                  <p className="mt-1.5 text-[15.5px] font-semibold leading-snug">
                    {x.title}
                  </p>
                  {x.venueName && (
                    <p className="mt-1.5 text-[12.5px] text-muted">
                      {x.venueName}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
