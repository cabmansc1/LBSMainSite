import type { Metadata } from "next";
import Link from "next/link";
import { PRINTING_LIVE } from "@/lib/print-products";
import { Card, CtaBand, SectionHeading } from "@/components/sections";
import { GUIDES } from "@/lib/guides";
import { CORE_SIZES, FLAGSHIP_REACH, formatPrice, isOffered } from "@/lib/pricing";
import { getLivePricing } from "@/lib/pricing-store";
import { SUB_AREAS } from "@/lib/sub-areas";
import { ZONES } from "@/lib/zones";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

// Prices come from the database, so this cannot be static.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Direct Mail Marketing in Charleston and the Lowcountry",
  description:
    "How shared 9x12 postcard advertising works across Charleston, Summerville, Mount Pleasant and the rest of the Lowcountry — what it reaches, what it costs per household, and which areas mail when.",
  alternates: { canonical: `${SITE_URL}/direct-mail-marketing` },
  openGraph: {
    title: `Direct Mail Marketing in the Lowcountry | ${SITE_NAME}`,
    description:
      "Shared 9x12 postcards to 5,000 homes a mailing, with one business per category.",
    url: `${SITE_URL}/direct-mail-marketing`,
    siteName: SITE_NAME,
    type: "website",
  },
};

/**
 * The pillar page.
 *
 * Every zone landing page, guide and pricing page is a spoke off this
 * one, and each links back. That is the whole point of it: internal
 * linking is the only authority signal a young site fully controls, and
 * eleven zone pages that link to nothing but the homepage waste it.
 *
 * The zone links point at the PHP pages deliberately. Those are the
 * pages with a thousand words and years of crawl history behind them —
 * sending readers to a thinner Next equivalent would trade a ranking
 * asset for tidiness.
 */

/**
 * Zones with a landing page of their own, and the URL it lives at.
 *
 * Written out rather than derived from the slug, because Hanahan is a
 * zone we mail and has no page — deriving would produce a link to a
 * 404. Worth fixing: it is the only gap in twelve.
 */
const ZONE_PAGES: Record<string, string> = {
  summerville: "/summerville-direct-mail-marketing.php",
  "mount-pleasant": "/mount-pleasant-direct-mail-marketing.php",
  "daniel-island": "/daniel-island-direct-mail-marketing.php",
  "north-charleston": "/north-charleston-direct-mail-marketing.php",
  "moncks-corner": "/moncks-corner-direct-mail-marketing.php",
  charleston: "/charleston-direct-mail-marketing.php",
  "goose-creek": "/goose-creek-direct-mail-marketing.php",
  "sullivans-island": "/sullivans-island-direct-mail-marketing.php",
  "isle-of-palms": "/isle-of-palms-direct-mail-marketing.php",
  "james-island": "/james-island-direct-mail-marketing.php",
  "johns-island": "/johns-island-direct-mail-marketing.php",
};

const FAQS = [
  {
    q: "What is shared direct mail?",
    a: "One oversized postcard carries several non-competing local businesses, and the cost of printing and postage is split between them. You get the reach of a full mailing for a fraction of what mailing on your own would cost, in exchange for sharing the card with businesses that are not competitors.",
  },
  {
    q: "How much does direct mail cost in Charleston?",
    a: "A spot on a shared 9x12 postcard starts at $249 for a mailing to 5,000 homes, which works out at about five cents a household with design, printing and postage included. Mailing a comparable card on your own generally runs three to five times that per home once postage and print minimums are counted.",
  },
  {
    q: "What does category exclusivity mean?",
    a: "Only one business per category appears on any given card. If you are the roofer on the October Summerville mailing, no other roofer is on it. It is the main reason a shared card is not the same product as a coupon envelope stuffed with competing offers.",
  },
  {
    q: "Which areas do you mail?",
    a: "Twelve zones across Dorchester, Berkeley and Charleston counties, including Summerville, Mount Pleasant, Daniel Island, West Ashley, North Charleston, Goose Creek, Hanahan, Moncks Corner, James Island, Johns Island, and Sullivan's Island with Isle of Palms. Each mailing goes to 5,000 or 10,000 homes within one of them.",
  },
  {
    q: "How long does it take to see results?",
    a: "Calls typically start within a few days of a card landing and continue for two to three weeks. Postcards get kept, so a slower trickle carries on well after that — which is also why running three mailings in a row outperforms one mailing at triple the reach.",
  },
];

export default async function DirectMailMarketingPage() {
  const pricing = await getLivePricing();
  const rates = pricing[FLAGSHIP_REACH];
  const sizes = CORE_SIZES.filter((s) => isOffered(rates[s]));
  const cheapest = sizes.length ? rates[sizes[0]].priceCents : 24900;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Shared Direct Mail Postcard Advertising",
        serviceType: "Direct mail advertising",
        provider: { "@type": "LocalBusiness", name: SITE_NAME, url: SITE_URL },
        areaServed: ZONES.map((z) => ({
          "@type": "City",
          name: z.name,
          address: {
            "@type": "PostalAddress",
            addressRegion: "SC",
            addressCountry: "US",
            postalCode: z.zipCodes.join(", "),
          },
        })),
        url: `${SITE_URL}/direct-mail-marketing`,
        offers: {
          "@type": "Offer",
          price: (cheapest / 100).toFixed(2),
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/pricing`,
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
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
            Direct mail
          </span>
          <h1 className="mt-3 text-[28px] md:text-[44px] font-bold tracking-[-0.032em] max-w-[20ch] text-balance">
            Direct mail marketing in the Charleston Lowcountry
          </h1>
          <p className="mt-4 text-[#93A5B8] max-w-[60ch] text-[16.5px] leading-relaxed">
            An oversized postcard, shared between a handful of local
            businesses that do not compete with each other, mailed to every
            home in a zone. Here is how it works, what it costs per
            household, and where it goes.
          </p>
        </div>
      </header>

      {/* [&>*]:min-w-0 because grid children default to min-width:auto and
          so refuse to shrink below their content. The cost table carries
          min-w-[420px] for its own scroll container; without this, that
          one item sets the width of the single column and drags every
          other section off the side of a phone with it. */}
      <div className="mx-auto max-w-[1120px] px-6 py-14 grid gap-12 [&>*]:min-w-0">

        <section className="grid gap-4 max-w-[68ch]">
          <h2 className="text-[24px] font-bold tracking-[-0.025em]">
            Why the mailbox still works here
          </h2>
          {/* Lead paragraph, set larger. Three equal paragraphs gave the
              eye nowhere to land. */}
          <p className="text-[17.5px] leading-relaxed text-ink">
            Almost every other channel a local business can buy has got
            noisier. A Facebook ad competes with everything else in the feed,
            a search ad competes with whoever is willing to bid more, and both
            disappear the moment the budget stops. A postcard sits on the
            counter until somebody decides what to do about it.
          </p>
          <p className="text-[16px] leading-relaxed text-body">
            That matters more in the Lowcountry than it does in a dense city.
            These are neighbourhoods where people own their homes, know their
            neighbours, and hire local trades on a recommendation. A card that
            arrives from a business two streets away is not junk mail — it is
            the answer to a question they were going to ask somebody anyway.
          </p>
          <p className="text-[16px] leading-relaxed text-body">
            The catch has always been cost. Designing, printing and mailing
            5,000 postcards on your own is a serious line item, and most small
            businesses never get past the quote. Sharing the card is what makes
            the maths work.
          </p>
        </section>

        <section className="bg-band rounded-(--radius-card) p-6 md:p-9">
          <SectionHeading
            eyebrow="The product"
            title="One card, several businesses, no competitors"
            sub="A 9x12 card is big enough that each business gets a real ad rather than a coupon, and the cost of the mailing splits between everybody on it."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              {
                t: "9x12 inches",
                d: "Oversized, so it does not get shuffled in with the letters. Both sides carry ads.",
              },
              {
                t: "5,000 or 10,000 homes",
                d: "Every deliverable address in the zone, not a rented list of names.",
              },
              {
                t: "One per category",
                d: "You are the only business of your kind on the card. No competitor beside your ad.",
              },
              {
                t: "Design included",
                d: "We write and lay out the ad. Artwork is due seven days before the card mails.",
              },
            ].map((f) => (
              <Card key={f.t} className="p-6 grid gap-1.5 content-start">
                <b className="text-[15.5px] font-semibold tracking-tight">
                  {f.t}
                </b>
                <p className="text-[13.5px] text-muted leading-relaxed">{f.d}</p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading
            eyebrow="Cost"
            title="What a mailing costs"
            sub="Prices are per mailing to 5,000 homes and include design, printing and postage. Nothing else gets added afterwards."
          />
          <Card className="p-7">
            <div className="overflow-x-auto">
              <table className="w-full text-[15px] border-collapse min-w-[420px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-widest text-muted">
                    <th className="font-semibold py-2 pr-4">Spot</th>
                    <th className="font-semibold py-2 pr-4">Size</th>
                    <th className="font-semibold py-2 pr-4">Per mailing</th>
                    <th className="font-semibold py-2">Per home</th>
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((size) => (
                    <tr key={size} className="border-t border-line">
                      <td className="py-2.5 pr-4 font-semibold capitalize">
                        {size}
                      </td>
                      <td className="py-2.5 pr-4 text-muted">
                        {rates[size].size}
                      </td>
                      <td className="py-2.5 pr-4 num font-semibold">
                        {formatPrice(rates[size].priceCents)}
                      </td>
                      <td className="py-2.5 num text-muted">
                        {(rates[size].priceCents / 5000 / 100).toFixed(2)}¢
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[13.5px] text-muted mt-4">
              Larger formats and the 10,000-home run are on the{" "}
              <Link href="/pricing" className="text-brand-deep font-semibold">
                pricing page
              </Link>
              . For how that compares with mailing on your own, see{" "}
              <Link
                href="/guides/eddm-cost-charleston"
                className="text-brand-deep font-semibold"
              >
                what EDDM actually costs
              </Link>
              .
            </p>
          </Card>
        </section>

        <section className="bg-band rounded-(--radius-card) p-6 md:p-9">
          <SectionHeading
            eyebrow="Coverage"
            title="Where the cards go"
            sub="Twelve zones across Dorchester, Berkeley and Charleston counties. Each has its own page with the zip codes it covers and the homes it reaches."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ZONES.map((z) => {
              const href = ZONE_PAGES[z.slug];
              const inner = (
                <>
                  <b className="text-[15.5px] font-semibold tracking-tight block">
                    {z.name}
                  </b>
                  <span className="block text-[12.5px] text-muted mt-1 num">
                    {z.zipCodes.join(" · ")}
                  </span>
                </>
              );
              return href ? (
                <a
                  key={z.slug}
                  href={href}
                  className="border border-line rounded-(--radius-card) bg-white p-5 hover:border-navy-950 transition-colors"
                >
                  {inner}
                </a>
              ) : (
                <div
                  key={z.slug}
                  className="border border-line rounded-(--radius-card) bg-surface p-5"
                >
                  {inner}
                </div>
              );
            })}
          </div>
          <div className="mt-6 grid gap-2.5">
            <h3 className="text-[13px] font-semibold uppercase tracking-widest text-muted">
              Neighbourhoods within a zone
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {SUB_AREAS.map((a) => (
                <Link
                  key={a.slug}
                  href={`/direct-mail-marketing/${a.slug}`}
                  className="border border-line rounded-(--radius-card) bg-white p-5 hover:border-navy-950 transition-colors"
                >
                  <b className="text-[15.5px] font-semibold tracking-tight block">
                    {a.name}
                  </b>
                  <span className="block text-[12.5px] text-muted mt-1">
                    On the {a.cardName} card · {a.zipCodes.join(" · ")}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <p className="text-[13.5px] text-muted mt-6">
            Not sure which zone covers you? The{" "}
            <Link href="/coverage-map" className="text-brand-deep font-semibold">
              coverage map
            </Link>{" "}
            shows all twelve, and the{" "}
            <Link
              href="/mailing-calendar"
              className="text-brand-deep font-semibold"
            >
              mailing calendar
            </Link>{" "}
            shows when each one goes out next.
          </p>
        </section>

        <section>
          <SectionHeading
            eyebrow="Guides"
            title="Working out whether it is right for you"
            sub="The questions worth answering before spending anything, written out properly rather than turned into a sales page."
          />
          <div className="grid sm:grid-cols-2 gap-3.5">
            {GUIDES.map((g) => (
              <Link
                key={g.slug}
                href={`/guides/${g.slug}`}
                className="border border-line rounded-(--radius-card) bg-white p-6 hover:border-navy-950 transition-colors grid gap-2 content-start"
              >
                <b className="text-[16.5px] font-semibold tracking-tight leading-snug">
                  {g.title}
                </b>
                <span className="text-[13.5px] text-muted leading-relaxed">
                  {g.blurb}
                </span>
                <span className="text-[12px] text-muted num">
                  {g.minutes} min read
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-band rounded-(--radius-card) p-6 md:p-9">
          <SectionHeading eyebrow="Questions" title="Common questions" />
          {/* Two columns from md. Stacked, these five boxes ran nearly a
              thousand pixels — a fifth of the page in one rhythm. */}
          <div className="grid md:grid-cols-2 gap-3 items-start">
            {FAQS.map((f) => (
              <Card key={f.q} className="p-6 grid gap-2">
                <b className="text-[16px] font-semibold tracking-tight">
                  {f.q}
                </b>
                <p className="text-[14.5px] text-body leading-relaxed max-w-[70ch]">
                  {f.a}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Print is a different job from mailing, but it is the same
            customer asking — so it belongs here rather than hidden,
            whenever the page is ready to be seen. */}
        {PRINTING_LIVE && (
        <section>
          <Card className="p-7 grid gap-2.5">
            <h2 className="text-[20px] font-bold tracking-[-0.02em]">
              Need it printed rather than mailed?
            </h2>
            <p className="text-[15.5px] leading-relaxed text-body max-w-[68ch]">
              Business cards, flyers, postcards and magnets for Charleston-area
              businesses, with the design handled rather than left to you. If we
              have made anything for you before, there is nothing to send and no
              design charge.
            </p>
            <Link
              href="/printing"
              className="text-[14px] font-semibold text-brand-deep justify-self-start"
            >
              Printing and quotes &rarr;
            </Link>
          </Card>
        </section>
        )}

        <CtaBand
          title="See which zones still have room"
          sub="Live availability by card, with the categories already taken."
          ctaLabel="View pricing"
          ctaHref="/pricing"
        />
      </div>
    </>
  );
}
