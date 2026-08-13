import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CtaBand } from "@/components/sections";
import { PROSE_CLASS } from "@/lib/prose";
import { otherGuides, type Guide } from "@/lib/guides";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export type GuideFaq = { q: string; a: string };

/**
 * The shared frame every guide renders inside.
 *
 * Chrome, cross-links and structured data in one place, so a guide file
 * is nothing but its argument. Four pages hand-rolling the same Article
 * and FAQPage blocks is four chances to get one subtly wrong, and
 * structured data fails silently — the page looks fine and the rich
 * result never appears.
 *
 * The FAQs are passed as data rather than written as markup because
 * they have to exist twice: once for a reader and once for Google. Two
 * hand-maintained copies drift, and the copy that drifts is always the
 * one nobody can see.
 */
export function GuidePage({
  guide,
  faqs = [],
  children,
}: {
  guide: Guide;
  faqs?: GuideFaq[];
  children: ReactNode;
}) {
  const url = `${SITE_URL}/guides/${guide.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        url,
        mainEntityOfPage: url,
        dateModified: guide.updated,
        datePublished: guide.updated,
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      },
      ...(faqs.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]
        : []),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Direct Mail Marketing",
            item: `${SITE_URL}/direct-mail-marketing`,
          },
          { "@type": "ListItem", position: 3, name: guide.title, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[820px] px-6 pt-12 pb-12">
          <nav className="text-[12.5px] text-[#67768A]" aria-label="Breadcrumb">
            <Link href="/direct-mail-marketing" className="hover:text-white">
              Direct mail
            </Link>
            <span className="mx-1.5">/</span>
            <Link href="/guides" className="hover:text-white">
              Guides
            </Link>
          </nav>
          <h1 className="mt-4 text-[28px] md:text-[40px] font-bold tracking-[-0.032em] leading-[1.06] text-balance">
            {guide.title}
          </h1>
          <p className="mt-4 text-[#93A5B8] max-w-[58ch] text-[16px] leading-relaxed">
            {guide.description}
          </p>
          <p className="mt-4 text-[12.5px] text-[#67768A] num">
            {guide.minutes} min read · updated {guide.updated}
          </p>
        </div>
      </header>

      <article className="mx-auto max-w-[820px] px-6 py-12">
        <div className={PROSE_CLASS}>{children}</div>

        {faqs.length > 0 && (
          <section className="mt-12 grid gap-3">
            <h2 className="text-[22px] font-bold tracking-tight">
              Common questions
            </h2>
            {faqs.map((f) => (
              <Card key={f.q} className="p-6 grid gap-2">
                <b className="text-[15.5px] font-semibold tracking-tight">
                  {f.q}
                </b>
                <p className="text-[14.5px] text-body leading-relaxed">{f.a}</p>
              </Card>
            ))}
          </section>
        )}

        <section className="mt-12 grid gap-3">
          <h2 className="text-[22px] font-bold tracking-tight">Keep reading</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {otherGuides(guide.slug).map((g) => (
              <Link
                key={g.slug}
                href={`/guides/${g.slug}`}
                className="border border-line rounded-(--radius-card) bg-white p-5 hover:border-navy-950 transition-colors grid gap-1.5 content-start"
              >
                <b className="text-[15px] font-semibold leading-snug tracking-tight">
                  {g.title}
                </b>
                <span className="text-[13px] text-muted leading-relaxed">
                  {g.blurb}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <CtaBand
            title="See what a spot costs in your zone"
            sub="Live availability, with the categories already taken on each card."
            ctaLabel="View pricing"
            ctaHref="/pricing"
          />
        </div>
      </article>
    </>
  );
}
