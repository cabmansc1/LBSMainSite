import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { RememberView } from "@/components/remember-view";
import { countPublishedEvents, publishedEvents } from "@/lib/events";
import {
  EVENT_CATEGORIES,
  categoryLabel,
  formatPrice,
  type EventCategory,
} from "@/lib/events-types";
import { listActivePlaces } from "@/lib/places";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const PER_PAGE = 18;

/**
 * Which way the calendar is drawn.
 *
 * Cards are better for browsing and a list is better for planning:
 * scanning sixty events for a free Saturday is a different job from
 * wondering what is on, and one layout cannot be good at both. The
 * choice lives in the URL so a link keeps it and the server can render
 * it on the first paint, and in a cookie so it does not have to be made
 * again next week.
 */
type View = "cards" | "list";
const VIEW_COOKIE = "lbs_events_view";
const asView = (v: unknown): View | undefined =>
  v === "list" || v === "cards" ? v : undefined;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string; view?: string }>;
}): Promise<Metadata> {
  const { category, page } = await searchParams;
  const known = EVENT_CATEGORIES.find((c) => c.value === category);
  const n = Math.max(1, Number(page) || 1);

  const title = known
    ? `${known.label} Events in Charleston and the Lowcountry`
    : "Charleston Events Calendar: What's Happening in the Lowcountry";
  const description = known
    ? `Upcoming ${known.label.toLowerCase()} events across Greater Charleston, from ${SITE_NAME}.`
    : "Festivals, markets, live music, family days, grand openings and community events across Greater Charleston.";

  // The view is deliberately left out of the canonical. Cards and list
  // are the same events drawn two ways, so they are one page as far as
  // a crawler is concerned; carrying it here would offer a duplicate of
  // every category and every page number.
  const q = new URLSearchParams();
  if (known) q.set("category", known.value);
  if (n > 1) q.set("page", String(n));
  const qs = q.toString();

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/events${qs ? `?${qs}` : ""}` },
    openGraph: { title, description, siteName: SITE_NAME, type: "website" },
  };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string; view?: string }>;
}) {
  const { category, page, view } = await searchParams;
  const known = EVENT_CATEGORIES.find((c) => c.value === category);
  const current = Math.max(1, Number(page) || 1);

  // The URL wins, then what was chosen last time, then cards.
  const asked = asView(view);
  const remembered = asView((await cookies()).get(VIEW_COOKIE)?.value);
  const mode: View = asked ?? remembered ?? "cards";
  const offset = (current - 1) * PER_PAGE;
  const filter = { category: known?.value as EventCategory | undefined };

  const [events, total, places] = await Promise.all([
    publishedEvents({ ...filter, limit: PER_PAGE, offset }),
    countPublishedEvents(filter),
    listActivePlaces().catch(() => []),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const placeName = (s: string) => places.find((p) => p.slug === s)?.name ?? s;

  const href = (c?: string, p?: number, choose?: View) => {
    const q = new URLSearchParams();
    if (c) q.set("category", c);
    if (p && p > 1) q.set("page", String(p));
    /*
     * A deliberate choice is always written down.
     *
     * Leaving it off when it matched the default seemed tidy and broke
     * the toggle: pressing Cards from the list built a plain /events,
     * which then read the cookie — set to list a moment earlier — and
     * came back as a list. The switch could not escape its own memory.
     *
     * With no choice passed, the current view rides along so filters and
     * page numbers keep it, and the plain URL stays plain for everybody
     * arriving without an opinion.
     */
    if (choose) q.set("view", choose);
    else if (mode === "list") q.set("view", "list");
    const qs = q.toString();
    return `/events${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-12 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-widest text-brand">
              What&rsquo;s happening
            </p>
            <h1 className="mt-2.5 text-[32px] md:text-[46px] font-bold tracking-[-0.035em] leading-[1.05] text-balance">
              Plan your week.
            </h1>
            <p className="mt-4 text-[16.5px] leading-relaxed text-[#AEBDCC] max-w-[56ch]">
              Festivals, markets, live music, family days, grand openings and
              community events from across Greater Charleston.
            </p>
          </div>
          <Link
            href="/events/submit"
            className="text-[13.5px] font-semibold px-4 py-2.5 rounded-[10px] bg-cta text-navy-950"
          >
            Add your event
          </Link>
        </div>
      </header>

      <RememberView name={VIEW_COOKIE} value={mode} />

      <nav aria-label="Event kinds" className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1120px] px-6 py-3 flex gap-2 flex-wrap items-center">
          <Link
            href={href()}
            className={`text-[13px] font-semibold px-3 py-1.5 rounded-full border ${
              !known
                ? "bg-navy-950 text-white border-navy-950"
                : "bg-white border-line-strong"
            }`}
          >
            Everything
          </Link>
          {EVENT_CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={href(c.value)}
              className={`text-[13px] font-semibold px-3 py-1.5 rounded-full border ${
                known?.value === c.value
                  ? "bg-navy-950 text-white border-navy-950"
                  : "bg-white border-line-strong"
              }`}
            >
              {c.label}
            </Link>
          ))}

          {/* Real links, so the choice is in the URL and survives being
              shared, bookmarked or crawled. */}
          <span className="ml-auto flex items-center gap-1.5">
            {(["cards", "list"] as const).map((v) => (
              <Link
                key={v}
                href={href(known?.value, current, v)}
                aria-current={mode === v ? "true" : undefined}
                className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full border ${
                  mode === v
                    ? "bg-navy-950 text-white border-navy-950"
                    : "bg-white border-line-strong"
                }`}
              >
                {v === "cards" ? "Cards" : "List"}
              </Link>
            ))}
          </span>
        </div>
      </nav>

      <section className="mx-auto max-w-[1120px] px-6 py-12">
        {events.length === 0 ? (
          <div className="border border-line rounded-(--radius-card) bg-white p-8 text-center">
            <p className="text-[15px] font-semibold">
              Nothing on the calendar yet.
            </p>
            <p className="text-[13.5px] text-muted mt-1.5 max-w-[46ch] mx-auto">
              If you are running something worth knowing about, tell us and we
              will put it up.
            </p>
            <Link
              href="/events/submit"
              className="inline-block mt-4 text-[13.5px] font-semibold px-4 py-2.5 rounded-[10px] bg-navy-950 text-white"
            >
              Add your event
            </Link>
          </div>
        ) : mode === "cards" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {events.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.slug}`}
                className="border border-line rounded-(--radius-card) bg-white overflow-hidden hover:border-navy-950 grid content-start"
              >
                {e.heroMediaId ? (
                  <span className="relative block bg-surface aspect-[16/10]">
                    <Image
                      src={`/api/media/${e.heroMediaId}`}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 360px"
                      className="object-cover"
                    />
                  </span>
                ) : null}
                <span className="block p-5">
                  <span className="flex items-start gap-3.5">
                    {/* The date block, which is what a calendar is
                        actually scanned by. */}
                    <span className="shrink-0 w-[52px] rounded-[10px] bg-navy-950 text-white text-center py-1.5">
                      <b className="block text-[19px] leading-none num">
                        {e.dayOfMonth}
                      </b>
                      <span className="text-[10.5px] uppercase tracking-widest">
                        {e.monthLabel}
                      </span>
                    </span>
                    <span className="block">
                      <span className="text-[11px] uppercase tracking-widest font-semibold text-brand-deep">
                        {categoryLabel(e.category)}
                        {/* Marked rather than moved: the calendar stays
                            in date order, and this is the one worth
                            looking at on a crowded Saturday. */}
                        {e.featured && (
                          <span className="ml-1.5 text-navy-950 bg-cta px-1.5 py-0.5 rounded">
                            Pick
                          </span>
                        )}
                      </span>
                      <span className="block mt-1 text-[16px] font-semibold leading-snug">
                        {e.title}
                      </span>
                      <span className="block mt-1.5 text-[12.5px] text-muted">
                        {e.multiDay && e.endDayLabel
                          ? `Through ${e.endDayLabel}`
                          : e.timeLabel}
                        {e.venueName && ` · ${e.venueName}`}
                      </span>
                      {e.placeSlug && (
                        <span className="block text-[12.5px] text-muted">
                          {placeName(e.placeSlug)}
                        </span>
                      )}
                      {formatPrice(e.priceText) && (
                        <span className="block mt-1 text-[12.5px] font-semibold num">
                          {formatPrice(e.priceText)}
                        </span>
                      )}
                    </span>
                  </span>
                  {e.summary && (
                    <span className="block mt-3 text-[13.5px] text-muted leading-relaxed line-clamp-2">
                      {e.summary}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          /*
            The same events as rows, grouped by the day they fall on.

            A flat list of sixty would be no easier to scan than sixty
            cards. The day is the thing being scanned for, so it becomes
            the heading and each row underneath only has to answer what,
            when and where.
          */
          <div className="border border-line rounded-(--radius-card) bg-white overflow-hidden">
            {events.map((e, i) => {
              const newDay = i === 0 || events[i - 1].dayLabel !== e.dayLabel;
              return (
                <div key={e.id}>
                  {newDay && (
                    <p className="text-[12px] uppercase tracking-widest font-semibold text-muted bg-surface px-5 py-2 border-b border-line">
                      {e.dayLabel}
                    </p>
                  )}
                  <Link
                    href={`/events/${e.slug}`}
                    className="flex items-baseline gap-4 px-5 py-3.5 border-b border-line last:border-b-0 hover:bg-surface"
                  >
                    <span className="shrink-0 w-[62px] text-[12.5px] text-muted num">
                      {e.timeLabel}
                    </span>
                    <span className="block min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold leading-snug">
                        {e.title}
                      </span>
                      <span className="block mt-0.5 text-[12.5px] text-muted">
                        {e.featured && (
                          <span className="text-navy-950 bg-cta px-1.5 py-0.5 rounded text-[10.5px] uppercase tracking-wider font-semibold mr-1.5">
                            Pick
                          </span>
                        )}
                        {categoryLabel(e.category)}
                        {e.venueName && ` · ${e.venueName}`}
                        {e.placeSlug && ` · ${placeName(e.placeSlug)}`}
                        {e.multiDay && e.endDayLabel && ` · through ${e.endDayLabel}`}
                      </span>
                    </span>
                    {formatPrice(e.priceText) && (
                      <span className="shrink-0 text-[12.5px] font-semibold num">
                        {formatPrice(e.priceText)}
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/*
          The calendar as a list Google can read.

          An index page of links is invisible to an events crawler on its
          own; ItemList is what tells it these are dated things and in
          what order, and it costs nothing beyond what is already on the
          page. The per-event detail lives on each event's own page.
        */}
        {events.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: known
                  ? `${known.label} events in the Lowcountry`
                  : "Events in Greater Charleston",
                numberOfItems: events.length,
                itemListElement: events.map((e, i) => ({
                  "@type": "ListItem",
                  position: offset + i + 1,
                  url: `${SITE_URL}/events/${e.slug}`,
                  name: e.title,
                })),
              }),
            }}
          />
        )}

        {pages > 1 && (
          <nav
            aria-label="Pages"
            className="mt-8 flex items-center gap-2 flex-wrap"
          >
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={href(known?.value, p)}
                aria-current={p === current ? "page" : undefined}
                className={`text-[13px] font-semibold px-3 py-1.5 rounded-[9px] border num ${
                  p === current
                    ? "bg-navy-950 text-white border-navy-950"
                    : "bg-white border-line-strong"
                }`}
              >
                {p}
              </Link>
            ))}
          </nav>
        )}
      </section>
    </>
  );
}
