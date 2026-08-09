import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedStory, publishedStories } from "@/lib/stories";
import { kindEyebrow, kindLabel, readMinutes } from "@/lib/stories-types";
import { listActivePlaces } from "@/lib/places";
import { PROSE_CLASS } from "@/lib/prose";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Reads live rather than at build time.
 *
 * Stories are published and edited from the admin, and a build-time
 * snapshot would mean a spotlight went live only on the next deploy. It
 * also keeps the Docker build, which has no database, from having to
 * enumerate them.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await getPublishedStory(slug);
  if (!story) return { title: "Story" };

  const title = story.metaTitle.trim() || story.title;
  const description =
    story.metaDescription.trim() ||
    story.dek.trim() ||
    `${kindLabel(story.kind)} from ${SITE_NAME}.`;
  const url = `${SITE_URL}/stories/${story.slug}`;
  const image = story.heroMediaId
    ? `${SITE_URL}/api/media/${story.heroMediaId}`
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: story.publishedAt || undefined,
      images: image ? [image] : undefined,
    },
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = await getPublishedStory(slug);
  if (!story) notFound();

  const [places, more] = await Promise.all([
    listActivePlaces().catch(() => []),
    publishedStories({ kind: story.kind, limit: 4 }),
  ]);

  const placeName = (s: string) =>
    places.find((p) => p.slug === s)?.name ?? s;

  const subject = story.businesses.find((b) => b.role === "subject");
  const related = more.filter((s) => s.id !== story.id).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.title,
    description: story.dek || undefined,
    datePublished: story.publishedAt || undefined,
    image: story.heroMediaId
      ? `${SITE_URL}/api/media/${story.heroMediaId}`
      : undefined,
    mainEntityOfPage: `${SITE_URL}/stories/${story.slug}`,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: `${SITE_URL}/brand/lb-spotlight.png`,
    },
    /*
     * Declared on the story itself rather than only shown as a chip.
     * Google asks paid placement to be machine readable, and a label a
     * reader can see while a crawler cannot is only half a disclosure.
     */
    ...(story.sponsored ? { isAccessibleForFree: true, sponsor: SITE_NAME } : {}),
  };

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[760px] px-6 pt-12 pb-12">
          <nav className="text-[12.5px] text-[#67768A]" aria-label="Breadcrumb">
            <Link href="/stories" className="hover:text-white">
              Local stories
            </Link>
            <span className="mx-1.5">/</span>
            <span>{kindLabel(story.kind)}</span>
          </nav>

          <p className="mt-4 text-[12px] font-semibold uppercase tracking-widest text-brand">
            {kindEyebrow(story.kind)}
          </p>

          <h1 className="mt-2.5 text-[28px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.12] text-balance">
            {story.title}
          </h1>

          {story.dek && (
            <p className="mt-4 text-[17px] leading-relaxed text-[#AEBDCC] max-w-[58ch]">
              {story.dek}
            </p>
          )}

          <div className="mt-5 flex items-center gap-3 flex-wrap text-[13px] text-[#93A5B8]">
            {story.publishedLabel && <span>{story.publishedLabel}</span>}
            <span className="num">
              {readMinutes(story.bodyHtml)} min read
            </span>
            {story.sponsored && (
              <span className="text-[10.5px] uppercase tracking-widest font-bold px-2 py-1 rounded bg-cta text-navy-950">
                Sponsored
              </span>
            )}
          </div>

          {story.places.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {story.places.map((p) => (
                <span
                  key={p}
                  className="text-[12px] px-2.5 py-1 rounded-full bg-white/8 border border-white/12 text-[#C6D3E0]"
                >
                  {placeName(p)}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <article className="mx-auto max-w-[760px] px-6 py-10">
        {story.heroMediaId && (
          <Image
            src={`/api/media/${story.heroMediaId}`}
            alt=""
            width={1400}
            height={788}
            loading="eager"
            className="w-full h-auto rounded-(--radius-card) border border-line mb-8"
          />
        )}

        <div
          className={PROSE_CLASS}
          dangerouslySetInnerHTML={{ __html: story.bodyHtml }}
        />

        {subject?.slug && (
          <div className="mt-10 border border-line rounded-(--radius-card) bg-surface p-5">
            <p className="text-[12px] uppercase tracking-widest font-semibold text-muted">
              The business in this story
            </p>
            <p className="mt-1.5 text-[17px] font-semibold">{subject.name}</p>
            <Link
              href={`/business/${subject.slug}`}
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
              More {kindLabel(story.kind).toLowerCase()}
            </h2>
            <div className="grid sm:grid-cols-3 gap-3.5">
              {related.map((s) => (
                <Link
                  key={s.id}
                  href={`/stories/${s.slug}`}
                  className="border border-line rounded-(--radius-card) bg-white p-5 hover:border-navy-950"
                >
                  <p className="text-[11px] uppercase tracking-widest font-semibold text-brand-deep">
                    {kindEyebrow(s.kind)}
                  </p>
                  <p className="mt-2 text-[15.5px] font-semibold leading-snug">
                    {s.title}
                  </p>
                  {s.publishedLabel && (
                    <p className="mt-2 text-[12.5px] text-muted num">
                      {s.publishedLabel}
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
