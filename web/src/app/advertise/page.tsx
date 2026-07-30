import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, SectionHeading, CtaBand } from "@/components/sections";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { formatPrice } from "@/lib/pricing";
import { getLivePricing } from "@/lib/pricing-store";

export const metadata: Metadata = {
  title: "Spotlight Postcards: Shared Direct Mail Advertising",
  description:
    "9x12 oversized postcards mailed to 5,000+ Charleston-area households. Category exclusivity, free ad design, and QR tracking from $249 per mailing.",
  alternates: { canonical: `${SITE_URL}/advertise` },
  openGraph: {
    title: `Spotlight Postcards | ${SITE_NAME}`,
    description: "Shared 9x12 direct mail with category exclusivity.",
    siteName: SITE_NAME,
    type: "website",
  },
};

const VALUE = [
  {
    title: "Local reach",
    body: "Full USPS carrier routes in your chosen zone. Every mailbox, every household, verified delivery.",
  },
  {
    title: "Affordable",
    body: "Share the card with non-competing businesses and pay a fraction of a solo mail campaign.",
  },
  {
    title: "Proven results",
    body: "QR codes and tracked URLs show scans and calls per mailing, so the results are never a guess.",
  },
];

/**
 * Ported from advertise.php, where they produced the FAQ rich result.
 * The areas answer is updated: the site now mails more zones than the
 * four the old copy listed.
 */
const ADVERTISE_FAQS = [
  {
    q: "What areas do you currently serve?",
    a: "We mail to households in Summerville, Mount Pleasant, Daniel Island, Charleston, North Charleston, Moncks Corner, Goose Creek, James Island, Johns Island, Isle of Palms and Sullivan's Island. New areas are added regularly.",
  },
  {
    q: "How often are postcards mailed?",
    a: "We run mailings every 4 to 6 weeks per area. The mailing calendar lists the dates that are open right now.",
  },
  {
    q: "Can I choose my ad size?",
    a: "Yes. Sizes run from a small business-card spot up to a full page, which is every ad spot on one side of the card. Larger ads get more visibility and better placement.",
  },
  {
    q: "What is the deadline to get on the next mailing?",
    a: "Artwork deadlines are two weeks before the tentative mail date. Contact us early to secure your spot, because exclusive categories fill up fast.",
  },
  {
    q: "Do you offer discounts for multiple mailings?",
    a: "Yes. We offer package pricing for businesses that commit to multiple mailings, and for bundling neighboring zones. Contact us for details.",
  },
];

const advertiseFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: ADVERTISE_FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

// Prices are admin-editable, so this cannot be baked at build time.
export const dynamic = "force-dynamic";

export default async function AdvertisePage() {
  const livePricing = await getLivePricing();
  const fromPrice = formatPrice(livePricing["5k"].small.priceCents);

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-16 pb-16 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-brand">
              Spotlight Postcards
            </span>
            <h1 className="mt-3 text-3xl md:text-[46px] font-bold tracking-[-0.03em] text-balance">
              The mailbox is still the best billboard in town.
            </h1>
            <p className="mt-4 text-[#93A5B8] max-w-[52ch]">
              A 9×12 postcard on 14pt stock with a high-gloss UV coating, full
              color on both sides, shared by up to eleven exclusive local
              businesses and mailed to 5,000+ households. From{" "}
              <b className="text-white num">{fromPrice}</b> per mailing.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/pricing">See Pricing</Button>
              <Button href="/gallery" variant="ghost">
                See Real Cards
              </Button>
            </div>
          </div>
          <Image
            src="/cards/card-sample-2.webp"
            alt="Back of a real 9x12 Spotlight Postcard showing exclusive local business ads"
            width={920}
            height={614}
            priority
            className="rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,.4)] rotate-[1.5deg] justify-self-center max-w-[460px] w-full h-auto"
          />
        </div>
      </header>

      <section className="mx-auto max-w-[1120px] px-6 py-20">
        <SectionHeading
          eyebrow="Why postcards"
          title="Big, tangible, and impossible to scroll past"
        />
        <div className="grid md:grid-cols-3 gap-3.5">
          {VALUE.map((v) => (
            <Card key={v.title} className="p-6.5 grid gap-2.5 content-start">
              <h3 className="text-[17px] font-semibold tracking-tight">{v.title}</h3>
              <p className="text-sm text-body leading-relaxed">{v.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 pb-16">
        <CtaBand
          title="Reserve your spot on the next card."
          sub="Pick a neighborhood and lock your category before a competitor does."
          ctaLabel="Reserve a Spot"
          ctaHref="/pricing"
        />
      </section>
      <section className="bg-surface border-t border-line">
        <div className="mx-auto max-w-[760px] px-6 py-18">
          <SectionHeading eyebrow="Questions" title="Advertising, answered" />
          <div className="mt-8 bg-white border border-line rounded-(--radius-card) overflow-hidden">
            {ADVERTISE_FAQS.map((f) => (
              <details key={f.q} className="border-b border-line last:border-b-0 group">
                <summary className="cursor-pointer list-none px-6 py-4.5 flex items-center justify-between gap-4 text-[15px] font-semibold">
                  {f.q}
                  <span className="text-muted text-lg leading-none group-open:hidden">+</span>
                  <span className="text-muted text-lg leading-none hidden group-open:inline">
                    &minus;
                  </span>
                </summary>
                <p className="px-6 pb-5 text-[14.5px] text-body leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(advertiseFaqJsonLd) }}
      />
    </>
  );
}
