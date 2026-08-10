import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedEvent, publishedEvents } from "@/lib/events";
import { categoryLabel } from "@/lib/events-types";
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
  const description =
    e.summary.trim() ||
    `${categoryLabel(e.category)} in the Lowcountry${
      e.venueName ? ` at ${e.venueName}` : ""
    }.`;

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
      images: e.heroMediaId
        ? [`${SITE_URL}/api/media/${e.heroMediaId}`]
        : undefined,
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

  /*
   * Event structured data, done properly.
   *
   * Google surfaces event rich results prominently and almost nobody in
   * this market marks them up at all, so it is worth more here than the
   * effort suggests. startDate must carry the offset, which the stored
   * ISO string already does.
   */
  const jsonLd = {
    "@context": "https://schema.org",
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
    url: `${SITE_URL}/events/${e.slug}`,
    location:
      e.venueName || e.address
        ? {
            "@type": "Place",
            name: e.venueName || placeName(e.placeSlug),
            address: e.address || undefined,
          }
        : undefined,
    organizer: e.businessName
      ? { "@type": "Organization", name: e.businessName }
      : { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[760px] px-6 pt-12 pb-12">
          <nav className="text-[12.5px] text-[#67768A]" aria-label="Breadcrumb">
            <Link href="/events" className="hover:text-white">
              Events
            </Link>
            <span className="mx-1.5">/</span>
            <span>{categoryLabel(e.category)}</span>
          </nav>

          <p className="mt-4 text-[12px] font-semibold uppercase tracking-widest text-brand">
            {categoryLabel(e.category)}
          </p>
          <h1 className="mt-2.5 text-[28px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.12] text-balance">
            {e.title}
          </h1>
          {e.summary && (
            <p className="mt-4 text-[17px] leading-relaxed text-[#AEBDCC] max-w-[58ch]">
              {e.summary}
            </p>
          )}
        </div>
      </header>

      <article className="mx-auto max-w-[760px] px-6 py-10">
        <div className="border border-line rounded-(--radius-card) bg-surface p-5 grid gap-2.5 mb-8">
          <p className="text-[15px] font-semibold">
            {e.dayLabel}
            {e.timeLabel && (
              <span className="font-normal text-body"> · {e.timeLabel}</span>
            )}
          </p>
          {(e.venueName || e.address) && (
            <p className="text-[14px] text-body">
              {e.venueName}
              {e.venueName && e.address && ", "}
              {e.address}
            </p>
          )}
          {e.placeSlug && (
            <p className="text-[13px] text-muted">{placeName(e.placeSlug)}</p>
          )}
          {e.priceText && (
            <p className="text-[14px] text-body num">{e.priceText}</p>
          )}
          <div className="flex gap-2.5 flex-wrap mt-1">
            {e.ticketUrl && (
              <a
                href={e.ticketUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-cta text-navy-950"
              >
                Get tickets
              </a>
            )}
            {e.url && (
              <a
                href={e.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-line-strong bg-white"
              >
                More details
              </a>
            )}
          </div>
        </div>

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

        {e.bodyHtml && (
          <div
            className={PROSE_CLASS}
            dangerouslySetInnerHTML={{ __html: e.bodyHtml }}
          />
        )}

        {e.businessSlug && (
          <div className="mt-10 border border-line rounded-(--radius-card) bg-surface p-5">
            <p className="text-[12px] uppercase tracking-widest font-semibold text-muted">
              Hosted by
            </p>
            <p className="mt-1.5 text-[17px] font-semibold">{e.businessName}</p>
            <Link
              href={`/business/${e.businessSlug}`}
              className="mt-2 inline-block text-[14px] font-semibold text-brand-deep"
            >
              See their listing &rarr;
            </Link>
          </div>
        )}
      </article>

      {related.length > 0 && (
        <section className="bg-surface border-t border-line">
          <div className="mx-auto max-w-[1120px] px-6 py-14">
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
