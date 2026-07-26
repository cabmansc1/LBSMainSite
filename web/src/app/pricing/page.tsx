import type { Metadata } from "next";
import { PricingCards } from "@/components/pricing-cards";
import { getLivePricing } from "@/lib/pricing-store";
import { getUpcomingMailings } from "@/lib/mission-control";
import { SectionHeading, TestimonialStrip, CtaBand } from "@/components/sections";
import { hasTestimonials } from "@/lib/testimonials";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata("pricing");

const INCLUDED = [
  "Exclusive placement in your category",
  "Free ad design: copy and layout",
  "QR and URL tracking available",
  "Spotlight post on our socials",
];

const FAQS = [
  {
    q: "What is the cheapest way to get started?",
    a: "A free Basic directory listing costs nothing. For direct mail, Spotlight Postcards start at $249 for 5,000 homes. That works out to about a nickel per household.",
  },
  {
    q: "Are there long-term contracts?",
    a: "No. Book one mailing at a time, or ask about multi-card commitments and multi-zone bundles for a discount.",
  },
  {
    q: "What does category exclusivity mean?",
    a: "Only one business per industry appears on each card. When you book, your category is locked and competitors cannot join that mailing.",
  },
  {
    q: "What do I need to provide?",
    a: "A logo and an offer. Our team handles the copywriting, design, print, and postage. You approve your ad before anything prints.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

// Prices are admin-editable, so never serve a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; reach?: string }>;
}) {
  const sp = await searchParams;
  const [pricing, mailings] = await Promise.all([
    getLivePricing(),
    getUpcomingMailings(),
  ]);
  // Only cards you can actually buy onto right now. One entry per card,
  // because a zone can be filling several at once and each carries its
  // own inventory and category locks.
  const openCards = mailings
    .filter((m) => m.status !== "waitlist" && m.status !== "full")
    .map((m) => ({
      cardId: m.cardId,
      zoneSlug: m.zoneSlug,
      zoneName: m.zoneName,
      mailMonth: m.mailMonth,
    }));
  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-16 pb-24">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Pricing
          </span>
          <h1 className="mt-3 text-3xl md:text-[46px] font-bold tracking-[-0.03em] max-w-[22ch] text-balance">
            Every ad reaches thousands of homes.
          </h1>
          <p className="mt-3.5 text-[#93A5B8] max-w-[56ch]">
            Pick a size, pick a reach. Design, print, postage, and category
            exclusivity are always included. No hidden fees.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6">
        <PricingCards
          pricing={pricing}
          cards={openCards}
          initialCard={sp.card ?? ""}
          initialReach={sp.reach === "10k" ? "10k" : "5k"}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {INCLUDED.map((item) => (
            <div
              key={item}
              className="bg-surface border border-line rounded-[10px] px-4 py-3.5 text-[13.5px] font-medium text-body"
            >
              {item}
            </div>
          ))}
        </div>

        {hasTestimonials("pricing") && (
          <section className="py-22">
            <SectionHeading
              eyebrow="What advertisers say"
              title="Priced for results"
            />
            <TestimonialStrip placement="pricing" />
          </section>
        )}

        <section className="pb-22">
          <SectionHeading eyebrow="Questions" title="Pricing FAQs" />
          <div className="max-w-[720px] border border-line rounded-(--radius-card) bg-white overflow-hidden">
            {FAQS.map((f, i) => (
              <details key={f.q} className="border-b border-line last:border-b-0 px-5.5 py-4.5 group" open={i === 0}>
                <summary className="font-semibold text-[15px] cursor-pointer list-none flex justify-between items-center gap-3">
                  {f.q}
                  <span className="text-muted text-lg font-normal group-open:hidden">+</span>
                  <span className="text-muted text-lg font-normal hidden group-open:inline">−</span>
                </summary>
                <p className="mt-2.5 text-sm text-body max-w-[60ch]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="pb-16">
          <CtaBand
            title="Not sure which size fits?"
            sub="Tell us your goal and budget. We will recommend a spot in two minutes."
            ctaLabel="Get a Recommendation"
            ctaHref="/contact"
          />
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
