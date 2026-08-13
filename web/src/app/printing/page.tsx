import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { Card, SectionHeading } from "@/components/sections";
import { PRINT_PRODUCTS } from "@/lib/print-products";
import { formatPrice } from "@/lib/pricing";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Business Card and Flyer Printing in Charleston",
  description:
    "Printing for Lowcountry businesses — business cards, flyers, postcards, magnets and brochures. Design included when we already have your artwork, and quotes back the same day.",
  alternates: { canonical: `${SITE_URL}/printing` },
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

const FAQS = [
  {
    q: "Do I have to supply artwork?",
    a: "No. If we have designed anything for you before — a postcard ad, a flyer, anything — we already hold your logo, colours and photography, and adapting it to another product costs you nothing. If we have never worked together, send whatever you have and we will tell you honestly whether it can be used or needs rebuilding, and what that would cost, before starting.",
  },
  {
    q: "Do you print for businesses that don't advertise with you?",
    a: "Yes. Most of this work comes from businesses already on our postcards, but there is no requirement. If you just need cards printed, that is a perfectly good reason to get in touch.",
  },
  {
    q: "How fast is it?",
    a: "Turnaround starts when you approve the proof, not when you ask for a quote, and the exact number of days is confirmed on your quote because it depends on the product and the print schedule. If you have a hard deadline — an event, an opening, a mailing date — say so up front and we will work backwards from it.",
  },
  {
    q: "How many revisions do I get?",
    a: "One round is included, meaning all your changes sent together rather than one at a time. Further rounds are chargeable, and we will always tell you before a request crosses that line rather than afterwards.",
  },
  {
    q: "What happens if something is printed wrong?",
    a: "If the printer makes an error, or we do, it is reprinted at no cost to you. If a mistake makes it through onto a proof you approved, a reprint is chargeable at cost — we make nothing on it. That is why the proof stage matters and why it is worth taking an extra day over it.",
  },
  {
    q: "Is there a minimum order?",
    a: "There is a minimum order value, mostly so a very small reorder does not end up costing more in handling than it is worth. If you are an existing advertiser and the job falls under it, we will usually add it to your next mailing invoice instead, which is less hassle for everybody.",
  },
  {
    q: "Do you do banners and signs?",
    a: "Not in house. We work with a local sign shop for anything outdoor or large format — you deal with us, we handle the brief and the artwork, and they produce it. It means you get one point of contact without us pretending to be a sign company.",
  },
];

const QUOTE_PREFILL =
  "I would like a quote for:\n\nProduct: \nQuantity: \nNeeded by: \n\nAnything else worth knowing:";

export default function PrintingPage() {
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
          itemListElement: PRINT_PRODUCTS.map((p) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Service", name: p.name },
            ...(p.fromCents
              ? {
                  price: (p.fromCents / 100).toFixed(2),
                  priceCurrency: "USD",
                }
              : {}),
          })),
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
            Printing
          </span>
          <h1 className="mt-3 text-[28px] md:text-[44px] font-bold tracking-[-0.032em] max-w-[21ch] text-balance">
            Business card and flyer printing in the Lowcountry
          </h1>
          <p className="mt-4 text-[#93A5B8] max-w-[60ch] text-[16.5px] leading-relaxed">
            Cards, flyers, postcards and magnets for Charleston-area
            businesses — with the design handled, not left to you. Send us what
            you need and we will come back with a price.
          </p>
          <a
            href="#quote"
            className="mt-6 inline-flex bg-cta text-navy-950 font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors"
          >
            Get a quote
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-14 grid gap-16">

        <section className="grid gap-4 max-w-[68ch]">
          <h2 className="text-[24px] font-bold tracking-[-0.025em]">
            The part most printers make you do yourself
          </h2>
          <p className="text-[16px] leading-relaxed text-body">
            Order business cards from a national printer and the first thing you
            are asked for is a print-ready file — 300 DPI, CMYK, correct bleed.
            For most small businesses that request is where the whole project
            stops. The cards never get ordered, because the artwork was never
            the easy part.
          </p>
          <p className="text-[16px] leading-relaxed text-body">
            If we have designed anything for you before, we already have your
            logo, your colours, your photographs and your offer sitting in a
            file. Putting them on a business card is our job, not yours, and it
            does not cost extra. If we have never worked together, send whatever
            you have and we will tell you straight away whether it can be used.
          </p>
          <p className="text-[16px] leading-relaxed text-body">
            The printing itself is competitively priced. The design being
            handled is the part you cannot get anywhere else.
          </p>
        </section>

        <section>
          <SectionHeading
            eyebrow="What we print"
            title="The list"
            sub="Quantities shown are the ones worth quoting. Ask for something not on here and we will tell you honestly whether we are the right people for it."
          />
          <div className="grid sm:grid-cols-2 gap-3.5">
            {PRINT_PRODUCTS.map((p) => (
              <Card key={p.slug} className="p-6 grid gap-2.5 content-start">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <b className="text-[17px] font-semibold tracking-tight">
                    {p.name}
                  </b>
                  {p.fromCents ? (
                    <span className="text-[13px] font-semibold text-brand-deep num">
                      from {formatPrice(p.fromCents)}
                    </span>
                  ) : null}
                </div>
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
            Banners, yard signs and vehicle wraps go through a local sign shop
            we work with. You still deal with us — we take the brief and the
            artwork, they produce it.
          </p>
        </section>

        <section>
          <SectionHeading
            eyebrow="How it works"
            title="Four steps, and one of them is yours"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
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
            ].map((s, i) => (
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
              Get a quote
            </h2>
            <p className="text-[15px] text-muted mt-2 leading-relaxed">
              Tell us the product and roughly how many. You do not need to know
              the stock or the finish — that is what the quote is for. No
              payment now, and nothing gets printed until you have seen a proof
              and said yes to it.
            </p>
          </div>
          <ContactForm defaultMessage={QUOTE_PREFILL} />
        </section>

        <section>
          <SectionHeading eyebrow="Questions" title="Before you ask" />
          <div className="grid gap-3">
            {FAQS.map((f) => (
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
