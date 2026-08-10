import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { countPublishedStories, publishedStories } from "@/lib/stories";
import {
  STORY_KINDS,
  kindEyebrow,
  readMinutes,
  type StoryKind,
} from "@/lib/stories-types";
import { listActivePlaces } from "@/lib/places";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const PER_PAGE = 12;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; place?: string; page?: string }>;
}): Promise<Metadata> {
  const { kind, place, page } = await searchParams;
  const known = STORY_KINDS.find((k) => k.value === kind);
  const n = Math.max(1, Number(page) || 1);
  const placeName = place
    ? (await listActivePlaces().catch(() => [])).find((p) => p.slug === place)
        ?.name
    : undefined;

  const title = placeName
    ? `Local Stories from ${placeName}`
    : known
      ? `${known.label}: Local Stories from Around Charleston`
      : "Local Stories: Charleston Businesses, Openings and Guides";
  const description = placeName
    ? `Business spotlights, openings and guides from ${placeName} and the surrounding Lowcountry.`
    : known
      ? `${known.hint}. Local stories from across the Lowcountry.`
      : "Business spotlights, new openings, coming soon and local guides from across Greater Charleston.";

  // Self-referencing, and carrying the page number, so page two is not
  // treated as a duplicate of page one.
  const q = new URLSearchParams();
  if (known) q.set("kind", known.value);
  if (placeName && place) q.set("place", place);
  if (n > 1) q.set("page", String(n));
  const qs = q.toString();

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/stories${qs ? `?${qs}` : ""}` },
    openGraph: { title, description, siteName: SITE_NAME, type: "website" },
  };
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; place?: string; page?: string }>;
}) {
  const { kind, place, page } = await searchParams;
  const known = STORY_KINDS.find((k) => k.value === kind);
  const current = Math.max(1, Number(page) || 1);
  const offset = (current - 1) * PER_PAGE;

  const places = await listActivePlaces().catch(() => []);
  // Only a place that exists becomes a filter. An unknown slug shows
  // everything rather than an empty page, which is the friendlier
  // answer to a mistyped or retired URL.
  const knownPlace = place ? places.find((p) => p.slug === place) : undefined;
  const filter = {
    kind: known?.value as StoryKind | undefined,
    placeSlug: knownPlace?.slug,
  };

  const [stories, total] = await Promise.all([
    publishedStories({ ...filter, limit: PER_PAGE, offset }),
    countPublishedStories(filter),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const href = (k?: string, p?: number) => {
    const q = new URLSearchParams();
    if (k) q.set("kind", k);
    if (knownPlace) q.set("place", knownPlace.slug);
    if (p && p > 1) q.set("page", String(p));
    const qs = q.toString();
    return `/stories${qs ? `?${qs}` : ""}`;
  };

  const [lead, ...rest] = stories;

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-12">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-brand">
            Around the Lowcountry
          </p>
          <h1 className="mt-2.5 text-[32px] md:text-[46px] font-bold tracking-[-0.035em] leading-[1.05] text-balance">
            Local stories worth knowing.
          </h1>
          <p className="mt-4 text-[16.5px] leading-relaxed text-[#AEBDCC] max-w-[58ch]">
            Business spotlights, new openings, what is coming soon and guides to
            getting the most out of Greater Charleston.
          </p>

          {knownPlace && (
            <p className="mt-5 inline-flex items-center gap-2.5 text-[13.5px] bg-white/10 border border-white/15 rounded-full pl-3.5 pr-2 py-1.5">
              <span>
                Showing <b>{knownPlace.name}</b>
              </span>
              <Link
                href={`/stories${known ? `?kind=${known.value}` : ""}`}
                className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25"
                aria-label="Clear the place filter"
              >
                Clear
              </Link>
            </p>
          )}
        </div>
      </header>

      {/* Real anchors, so every filter and page is a crawlable URL rather
          than a state a script has to be run to reach. */}
      <nav
        aria-label="Story kinds"
        className="border-b border-line bg-surface"
      >
        <div className="mx-auto max-w-[1120px] px-6 py-3 flex gap-2 flex-wrap">
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
          {STORY_KINDS.map((k) => (
            <Link
              key={k.value}
              href={href(k.value)}
              className={`text-[13px] font-semibold px-3 py-1.5 rounded-full border ${
                known?.value === k.value
                  ? "bg-navy-950 text-white border-navy-950"
                  : "bg-white border-line-strong"
              }`}
            >
              {k.label}
            </Link>
          ))}
        </div>
      </nav>

      <section className="mx-auto max-w-[1120px] px-6 py-12">
        {stories.length === 0 ? (
          <div className="border border-line rounded-(--radius-card) bg-white p-8 text-center">
            <p className="text-[15px] font-semibold">
              {knownPlace || known
                ? "Nothing here yet under that filter."
                : "Nothing here yet."}
            </p>
            <p className="text-[13.5px] text-muted mt-1.5 max-w-[46ch] mx-auto">
              {knownPlace || known
                ? "Try everything instead — there may be something from nearby."
                : "The first stories are being written."}
            </p>
            {(knownPlace || known) && (
              <Link
                href="/stories"
                className="inline-block mt-4 text-[13.5px] font-semibold px-4 py-2.5 rounded-[10px] bg-navy-950 text-white"
              >
                See everything
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3.5">
            {lead && (
              <Link
                href={`/stories/${lead.slug}`}
                className="grid md:grid-cols-2 gap-0 border border-line rounded-(--radius-card) bg-white overflow-hidden hover:border-navy-950"
              >
                {/* Nothing rather than an empty grey panel. A card with
                    no picture reads better full width than beside a
                    hole where one should be. */}
                {lead.heroMediaId ? (
                  <span className="relative block bg-surface min-h-[220px] md:min-h-[300px]">
                    <Image
                      src={`/api/media/${lead.heroMediaId}`}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 560px"
                      className="object-cover"
                      loading="eager"
                    />
                  </span>
                ) : null}
                <span className="block p-6 md:p-8 self-center">
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-brand-deep">
                    {kindEyebrow(lead.kind)}
                  </span>
                  <span className="block mt-2.5 text-[22px] md:text-[26px] font-bold tracking-tight leading-snug text-balance">
                    {lead.title}
                  </span>
                  {lead.dek && (
                    <span className="block mt-3 text-[14.5px] text-body leading-relaxed">
                      {lead.dek}
                    </span>
                  )}
                  <span className="block mt-4 text-[12.5px] text-muted num">
                    {lead.publishedLabel}
                    {" · "}
                    {readMinutes(lead.bodyHtml)} min read
                    {lead.sponsored && " · Sponsored"}
                  </span>
                </span>
              </Link>
            )}

            {rest.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {rest.map((s) => (
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
                      {s.dek && (
                        <span className="block mt-2 text-[13.5px] text-muted leading-relaxed line-clamp-3">
                          {s.dek}
                        </span>
                      )}
                      <span className="block mt-3 text-[12px] text-muted num">
                        {s.publishedLabel}
                        {" · "}
                        {readMinutes(s.bodyHtml)} min read
                        {s.sponsored && " · Sponsored"}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tells a crawler these are ordered articles, not a page of
            links that happens to have headings. */}
        {stories.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: knownPlace
                  ? `Local stories from ${knownPlace.name}`
                  : known
                    ? `${known.label} from around Charleston`
                    : "Local stories from around Charleston",
                numberOfItems: stories.length,
                itemListElement: stories.map((s, i) => ({
                  "@type": "ListItem",
                  position: offset + i + 1,
                  url: `${SITE_URL}/stories/${s.slug}`,
                  name: s.title,
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
