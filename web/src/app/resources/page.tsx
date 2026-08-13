import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { PRINTING_LIVE } from "@/lib/print-products";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Direct Mail Resources: Guides and an ROI Calculator",
  description:
    "Free tools and straight answers about direct mail advertising in the Charleston Lowcountry — what it costs, how it compares with EDDM and the coupon envelopes, and whether it pays for your business.",
  alternates: { canonical: `${SITE_URL}/resources` },
  openGraph: {
    title: `Resources | ${SITE_NAME}`,
    description:
      "An ROI calculator and honest guides to what direct mail costs in the Lowcountry.",
    url: `${SITE_URL}/resources`,
    siteName: SITE_NAME,
    type: "website",
  },
};

/**
 * The one index over everything that helps somebody decide, rather than
 * everything that sells to them.
 *
 * This replaced /guides rather than sitting above it. Two pages listing
 * the same four guides would have competed with each other for the same
 * searches and split the internal links between them — the exact
 * duplicate-index problem the April audit cleaned up elsewhere, and not
 * worth reintroducing for a section this size. /guides now redirects
 * here.
 *
 * The guide URLs stay at /guides/{slug}. They are the pages with the
 * content and the rankings to lose, and moving four fresh URLs to buy a
 * tidier parent path would be churn for its own sake. A breadcrumb
 * expresses the relationship better than the path does.
 *
 * Tools before guides on purpose: somebody who wants a number is closer
 * to buying than somebody who wants an explanation, and the calculator
 * is the only thing here they cannot get from a competitor's blog.
 */

type Tool = {
  href: string;
  name: string;
  blurb: string;
  /** What the person gets, not what the page contains. */
  outcome: string;
};

const TOOLS: Tool[] = [
  {
    href: "/roi-calculator",
    name: "Direct Mail ROI Calculator",
    blurb:
      "Put in what a customer is worth to you and how many homes you would reach. It works out what response rate a campaign needs to pay for itself.",
    outcome: "Answers whether the numbers work before you spend anything",
  },
];

export default function ResourcesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Direct mail resources",
        description:
          "Free tools and guides for Charleston-area businesses weighing up direct mail.",
        url: `${SITE_URL}/resources`,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
      },
      {
        /* The guides only. The calculator is a tool rather than an
           article, and listing it here would describe the page wrongly
           to anything reading the markup. */
        "@type": "ItemList",
        name: "Direct mail guides",
        itemListElement: GUIDES.map((g, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: g.title,
          url: `${SITE_URL}/guides/${g.slug}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Resources",
            item: `${SITE_URL}/resources`,
          },
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
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Resources
          </span>
          <h1 className="mt-3 text-[28px] md:text-[42px] font-bold tracking-[-0.032em] max-w-[22ch] text-balance">
            Direct mail, explained without the pitch
          </h1>
          <p className="mt-4 text-[#93A5B8] max-w-[58ch] text-[16.5px] leading-relaxed">
            What it costs, how the options compare, and when it is the wrong
            thing to spend money on. Written so you could act on them without
            hiring anybody — including us.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-14 grid gap-14">

        <section className="grid gap-3.5">
          <div className="max-w-[62ch]">
            <h2 className="text-[22px] font-bold tracking-[-0.022em]">Tools</h2>
            <p className="text-[14.5px] text-muted mt-1.5 leading-relaxed">
              Free, no sign-up, and nothing is sent to us when you use them.
            </p>
          </div>
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="border border-line rounded-(--radius-card) bg-white p-7 hover:border-navy-950 transition-colors grid gap-2"
            >
              <div className="flex items-baseline gap-3 flex-wrap">
                <b className="text-[19px] font-bold tracking-[-0.02em] leading-snug">
                  {t.name}
                </b>
                <span className="text-[10.5px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full bg-brand-tint text-brand-deep">
                  Calculator
                </span>
              </div>
              <p className="text-[14.5px] text-body leading-relaxed max-w-[70ch]">
                {t.blurb}
              </p>
              <span className="text-[12.5px] text-muted">{t.outcome}</span>
            </Link>
          ))}
        </section>

        <section className="grid gap-3.5">
          <div className="max-w-[62ch]">
            <h2 className="text-[22px] font-bold tracking-[-0.022em]">Guides</h2>
            <p className="text-[14.5px] text-muted mt-1.5 leading-relaxed">
              Long enough to actually answer the question. Each one says where
              another option beats ours, because that is the part you would
              check anyway.
            </p>
          </div>
          {GUIDES.map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="border border-line rounded-(--radius-card) bg-white p-7 hover:border-navy-950 transition-colors grid gap-2"
            >
              <b className="text-[19px] font-bold tracking-[-0.02em] leading-snug">
                {g.title}
              </b>
              <p className="text-[14.5px] text-body leading-relaxed max-w-[70ch]">
                {g.description}
              </p>
              <span className="text-[12.5px] text-muted num">
                {g.minutes} min read
              </span>
            </Link>
          ))}
        </section>

        <p className="text-[14px] text-muted max-w-[68ch]">
          Looking for how the product itself works?{" "}
          <Link
            href="/direct-mail-marketing"
            className="text-brand-deep font-semibold"
          >
            Start here
          </Link>
          {PRINTING_LIVE ? (
            <>
              , or see{" "}
              <Link href="/printing" className="text-brand-deep font-semibold">
                what we print
              </Link>
              .
            </>
          ) : (
            "."
          )}
        </p>
      </div>
    </>
  );
}
