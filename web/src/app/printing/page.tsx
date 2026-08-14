import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { Card, SectionHeading } from "@/components/sections";
import { pageCopy } from "@/lib/blocks";
import { PRINT_PRODUCTS, PRINTING_LIVE } from "@/lib/print-products";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Dynamic because the copy is editable, matching /advertise. An edit in
 * the admin shows on the next request rather than the next deploy,
 * which is the only reason to make copy editable at all.
 *
 * Metadata stays compiled. The title and description are what a search
 * result shows, they are tuned to the two terms this page exists to
 * win, and a well-meant edit there is the easiest way to quietly lose a
 * ranking. Everything visible on the page is editable; what is visible
 * only to Google is not.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Card and Flyer Printing in Charleston",
  description:
    "Printing for Lowcountry businesses — business cards, flyers, postcards, magnets and brochures. Design included when we already have your artwork, and quotes back the same day.",
  alternates: { canonical: `${SITE_URL}/printing` },
  /* Hidden while PRINTING_LIVE is false. Unlinking on its own is the
     worse half: Google keeps serving a page it has already crawled, so
     the version being rewritten would stay in results while nobody on
     the site could reach it. follow stays true so the links out of the
     page still count. */
  ...(PRINTING_LIVE ? {} : { robots: { index: false, follow: true } }),
  openGraph: {
    title: `Printing for Lowcountry Businesses | ${SITE_NAME}`,
    description:
      "Business cards, flyers, postcards and magnets — with the design handled.",
    url: `${SITE_URL}/printing`,
    siteName: SITE_NAME,
    type: "website",
  },
};

/**
 * The print quote page.
 *
 * A form, not a cart. These orders arrive from people who already know
 * us, and the useful thing is a fast quote rather than a checkout — an
 * order needs a quantity, a stock, a proof round and a delivery address
 * before it means anything, and none of that fits the orders table.
 *
 * Written to be findable for local print searches, which are winnable
 * in a way the national postcard-mailing terms never were. The angle
 * doing the work is design: a national printer's first move is to ask
 * for print-ready files, and that request is where most small
 * businesses give up.
 */

/**
 * The steps are the one repeated block still in code, matching the
 * advertise page. They describe how the process works rather than what
 * it costs, so they do not move when the printer's terms do.
 */
const STEPS = [
  {
    t: "You tell us what you need",
    d: "Product, rough quantity, and any deadline. If you are not sure on quantity, say so — the tiers matter and we will show you them.",
  },
  {
    t: "We quote it",
    d: "A price and a turnaround. If design work is needed beyond what we already hold, it is a separate line rather than a surprise.",
  },
  {
    t: "You approve a proof",
    d: "A PDF before anything is printed. Check the phone number, the address and the spelling — print is final in a way a web page is not.",
  },
  {
    t: "It gets made and delivered",
    d: "Production starts on approval. If a box turns up late or damaged, that is ours to sort out, not yours.",
  },
];

/** How many faq.N.q / faq.N.a pairs the registry defines. */
const FAQ_COUNT = 7;

const QUOTE_PREFILL =
  "I would like a quote for:\n\nProduct: \nQuantity: \nNeeded by: \n\nAnything else worth knowing:";

export default async function PrintingPage() {
  const copy = await pageCopy("printing");

  /**
   * Read once, then used for both the visible list and the FAQPage
   * JSON-LD below.
   *
   * That sharing is the point. A rich result whose questions do not
   * match the page is a structured data violation, and the way it
   * usually happens is exactly this: someone edits the visible copy and
   * the schema keeps asserting the old wording. Resolving both from one
   * array means an edit cannot make them disagree.
   */
  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: copy.t(`faq.${i + 1}.q`),
    a: copy.t(`faq.${i + 1}.a`),
  })).filter((f) => f.q && f.a);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Commercial printing for local businesses",
        serviceType: "Printing service",
        provider: { "@type": "LocalBusiness", name: SITE_NAME, url: SITE_URL },
        areaServed: {
          "@type": "Place",
          name: "Charleston Lowcountry, South Carolina",
          address: {
            "@type": "PostalAddress",
            addressRegion: "SC",
            addressCountry: "US",
          },
        },
        url: `${SITE_URL}/printing`,
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Print products",
          /* No price on the offers. Print is quoted, and an Offer
             asserting a price we do not publish would be the one part
             of this page a rich result could contradict. */
          itemListElement: PRINT_PRODUCTS.map((p) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Service", name: p.name },
          })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
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
            name: "Printing",
            item: `${SITE_URL}/printing`,
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
            {copy.t("hero.eyebrow")}
          </span>
          <h1 className="mt-3 text-[28px] md:text-[44px] font-bold tracking-[-0.032em] max-w-[21ch] text-balance">
            {copy.t("hero.headline")}
          </h1>
          <p className="mt-4 text-[#93A5B8] max-w-[60ch] text-[16.5px] leading-relaxed">
            {copy.t("hero.sub")}
          </p>
          <a
            href="#quote"
            className="mt-6 inline-flex bg-cta text-navy-950 font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors"
          >
            {copy.t("hero.cta")}
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-14 grid gap-16">

        <section className="grid gap-4 max-w-[68ch]">
          <h2 className="text-[24px] font-bold tracking-[-0.025em]">
            {copy.t("pitch.title")}
          </h2>
          {copy.list("pitch.body").map((para, i) => (
            <p key={i} className="text-[16px] leading-relaxed text-body">
              {para}
            </p>
          ))}
        </section>

        <section>
          <SectionHeading
            eyebrow={copy.t("products.eyebrow")}
            title={copy.t("products.title")}
            sub={copy.t("products.sub")}
          />
          <div className="grid sm:grid-cols-2 gap-3.5">
            {PRINT_PRODUCTS.map((p) => (
              <Card key={p.slug} className="p-6 grid gap-2.5 content-start">
                <b className="text-[17px] font-semibold tracking-tight">
                  {p.name}
                </b>
                <span className="text-[12.5px] text-muted num">{p.spec}</span>
                <p className="text-[14px] text-body leading-relaxed">
                  {p.blurb}
                </p>
                {p.note && (
                  <p className="text-[13px] text-muted leading-relaxed">
                    {p.note}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-[11.5px] text-muted num">
                    {p.quantities.map((q) => q.toLocaleString()).join(" · ")}
                  </span>
                  <span
                    className={
                      p.artwork === "onFile"
                        ? "text-[10.5px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full bg-brand-tint text-brand-deep"
                        : "text-[10.5px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full bg-cta-tint text-cta-hover"
                    }
                  >
                    {p.artwork === "onFile"
                      ? "Design included"
                      : "Design quoted"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-[13.5px] text-muted mt-4 max-w-[68ch]">
            {copy.t("products.footnote")}
          </p>
        </section>

        <section>
          <SectionHeading
            eyebrow={copy.t("steps.eyebrow")}
            title={copy.t("steps.title")}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {STEPS.map((s, i) => (
              <Card key={s.t} className="p-6 grid gap-2 content-start">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-deep num">
                  Step {i + 1}
                </span>
                <b className="text-[15.5px] font-semibold tracking-tight leading-snug">
                  {s.t}
                </b>
                <p className="text-[13.5px] text-muted leading-relaxed">
                  {s.d}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section id="quote" className="scroll-mt-8 grid gap-4">
          <div className="max-w-[58ch]">
            <h2 className="text-[24px] font-bold tracking-[-0.025em]">
              {copy.t("quote.title")}
            </h2>
            <p className="text-[15px] text-muted mt-2 leading-relaxed">
              {copy.t("quote.sub")}
            </p>
          </div>
          <ContactForm defaultMessage={QUOTE_PREFILL} />
        </section>

        <section>
          <SectionHeading
            eyebrow={copy.t("faq.eyebrow")}
            title={copy.t("faq.title")}
          />
          <div className="grid gap-3">
            {faqs.map((f) => (
              <Card key={f.q} className="p-6 grid gap-2">
                <b className="text-[16px] font-semibold tracking-tight">
                  {f.q}
                </b>
                <p className="text-[14.5px] text-body leading-relaxed max-w-[72ch]">
                  {f.a}
                </p>
              </Card>
            ))}
          </div>
          <p className="text-[13.5px] text-muted mt-5 max-w-[68ch]">
            Advertising rather than printing?{" "}
            <Link
              href="/direct-mail-marketing"
              className="text-brand-deep font-semibold"
            >
              Shared postcard mailings
            </Link>{" "}
            reach 5,000 homes at a time, and{" "}
            <Link href="/pricing" className="text-brand-deep font-semibold">
              pricing is here
            </Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}
