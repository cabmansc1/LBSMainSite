import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, SectionHeading, CtaBand } from "@/components/sections";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { formatPrice } from "@/lib/pricing";
import { ARTWORK_LEAD_DAYS } from "@/lib/mailings";
import { getLivePricing } from "@/lib/pricing-store";
import { getSiteStats } from "@/lib/admin-data";
import { getLiveZones } from "@/lib/zone-store";
import { getUpcomingMailings } from "@/lib/mission-control";
import { hasTestimonials } from "@/lib/testimonials";
import { TestimonialStrip } from "@/components/testimonial-strip";
import Link from "next/link";
import { pageCopy } from "@/lib/blocks";
import { Copy } from "@/components/copy";

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
    body: "Every card goes out with QR codes and tracked URLs, so scans and visits are counted and the results are never a guess.",
  },
];

/**
 * Ported from advertise.php, where they produced the FAQ rich result.
 * The areas answer is updated: the site now mails more zones than the
 * four the old copy listed.
 */
/**
 * The three steps, which used to live only on the homepage.
 *
 * They belong here. The homepage is going consumer, and somebody
 * weighing up a card should not have to find their way back to a page
 * about local events to learn how buying one works.
 */
const STEPS = [
  {
    title: "Pick your zone and spot",
    body: "Choose a neighborhood and an ad size. Live availability shows what is open. Reserve and pay online in minutes.",
  },
  {
    title: "We design your ad",
    body: "Our team writes and lays out your ad free, with your offer and a trackable QR code. You approve before print.",
  },
  {
    title: "We mail. You answer the phone.",
    body: "Your card lands in 5,000+ mailboxes. Scans show up in your advertiser dashboard as they come in.",
  },
];

/**
 * Shown if the stats table cannot be read, so the bar is never blank.
 * Mirrors what /admin/stats holds; the live figures win.
 */
const STATS_FALLBACK = [
  { value: "155,000+", label: "Postcards Mailed" },
  { value: "100+", label: "Local Businesses Served" },
  { value: "2,500 - 10,000", label: "Households Per Mailing" },
  { value: "30+", label: "Campaigns Completed" },
];

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
    a: `Artwork deadlines are ${ARTWORK_LEAD_DAYS} days before the tentative mail date. Contact us early to secure your spot, because exclusive categories fill up fast.`,
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
  const copy = await pageCopy("advertise");

  const [savedStats, zones, upcoming, showTestimonials] = await Promise.all([
    getSiteStats().catch(() => []),
    getLiveZones().catch(() => []),
    getUpcomingMailings().catch(() => []),
    hasTestimonials("home").catch(() => false),
  ]);
  const stats = (() => {
    const live = savedStats
      .filter((x) => x.active && x.value.trim() && x.label.trim())
      .map((x) => ({ value: x.value, label: x.label }));
    return live.length > 0 ? live : STATS_FALLBACK;
  })();

  // The soonest card per zone, so the coverage list can say when a
  // neighborhood next goes out rather than only that it exists.
  const nextByZone = new Map<string, string>();
  for (const m of upcoming) {
    if (!nextByZone.has(m.zoneSlug)) nextByZone.set(m.zoneSlug, m.mailMonth);
  }

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-16 pb-16 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-brand">
              {copy.t("hero.eyebrow")}
            </span>
            <h1 className="mt-3 text-3xl md:text-[46px] font-bold tracking-[-0.03em] text-balance">
              <Copy text={copy.t("hero.headline")} markClass="text-brand" />
            </h1>
            <p className="mt-4 text-[#93A5B8] max-w-[52ch]">
              <Copy
                text={copy.t("hero.sub").replace("{price}", fromPrice)}
                markClass="text-white num font-semibold"
              />
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/pricing">{copy.t("hero.cta.primary")}</Button>
              <Button href="/gallery" variant="ghost">
                {copy.t("hero.cta.secondary")}
              </Button>
            </div>
          </div>
          <Image
            src="/cards/card-sample-2.webp"
            alt="Back of a real 9x12 Spotlight Postcard showing exclusive local business ads"
            width={920}
            height={614}
            loading="eager"
            className="rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,.4)] rotate-[1.5deg] justify-self-center max-w-[460px] w-full h-auto"
          />
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-[1120px] px-6 py-7 grid grid-cols-2 md:grid-cols-4 gap-5">
            {stats.map((x, i) => (
              <div
                key={x.label}
                className={i > 0 ? "md:border-l md:border-white/10 md:pl-5" : ""}
              >
                <b className="block text-2xl md:text-[28px] font-bold tracking-tight num">
                  {x.value}
                </b>
                <span className="text-[12.5px] text-[#67768A]">{x.label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1120px] px-6 py-20">
        <SectionHeading
          eyebrow={copy.t("value.eyebrow")}
          title={copy.t("value.title")}
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

      <section className="bg-surface border-y border-line">
        <div className="mx-auto max-w-[1120px] px-6 py-20">
          <SectionHeading
            eyebrow={copy.t("steps.eyebrow")}
            title={copy.t("steps.title")}
          />
          <div className="grid md:grid-cols-3 gap-3.5">
            {STEPS.map((step, i) => (
              <Card key={step.title} className="p-6.5 grid gap-2.5 content-start">
                <span className="w-[30px] h-[30px] rounded-lg bg-brand-tint text-brand-deep text-[13px] font-bold flex items-center justify-center num">
                  {i + 1}
                </span>
                <h3 className="text-[17px] font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-body leading-relaxed">{step.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 py-20">
        <SectionHeading
          eyebrow={copy.t("cards.eyebrow")}
          title={copy.t("cards.title")}
          sub={copy.t("cards.sub")}
        />
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Image
            src="/cards/card-nmp-front.webp"
            alt="Front of a mailed Spotlight Postcard"
            width={800}
            height={534}
            className="rounded-(--radius-card) border border-line"
          />
          <Image
            src="/cards/card-nmp-back.webp"
            alt="Back of a mailed Spotlight Postcard with local business ads"
            width={800}
            height={534}
            className="rounded-(--radius-card) border border-line"
          />
        </div>
        <div className="mt-5">
          <Button href="/gallery" variant="quiet" small>
            {copy.t("cards.cta")}
          </Button>
        </div>
      </section>

      {/*
        The coverage list, and the reason this page matters.

        Every zone page is linked from here by name. When the homepage
        stops selling postcards those eleven pages lose their strongest
        internal link, and they carry most of the search traffic; this is
        where that link goes instead.
      */}
      <section className="bg-surface border-y border-line">
        <div className="mx-auto max-w-[1120px] px-6 py-20">
          <SectionHeading
            eyebrow={copy.t("coverage.eyebrow")}
            title={copy.t("coverage.title")}
            sub={copy.t("coverage.sub")}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {zones.map((z) => (
              <Link
                key={z.slug}
                href={`/${z.slug}-direct-mail-marketing`}
                className="border border-line rounded-(--radius-card) bg-white px-4 py-3.5 hover:border-navy-950"
              >
                <span className="block text-[15px] font-semibold tracking-tight">
                  {z.name}
                </span>
                <span className="block text-[12.5px] text-muted num mt-0.5">
                  {z.zipCodes.slice(0, 4).join(", ")}
                  {z.zipCodes.length > 4 && "…"}
                </span>
                {nextByZone.get(z.slug) && (
                  <span className="block text-[12.5px] text-brand-deep font-semibold mt-1">
                    Next card mails {nextByZone.get(z.slug)}
                  </span>
                )}
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button href="/coverage-map" variant="quiet" small>
              See the coverage map
            </Button>
            <Button href="/mailing-calendar" variant="quiet" small>
              See every upcoming date
            </Button>
          </div>
        </div>
      </section>

      {showTestimonials && (
        <section className="mx-auto max-w-[1120px] px-6 py-20">
          <SectionHeading
            eyebrow={copy.t("testimonials.eyebrow")}
            title={copy.t("testimonials.title")}
          />
          <TestimonialStrip placement="home" />
        </section>
      )}

      <section className="mx-auto max-w-[1120px] px-6 pb-16">
        <CtaBand
          title={copy.t("cta.title")}
          sub={copy.t("cta.sub")}
          ctaLabel={copy.t("cta.label")}
          ctaHref="/pricing"
        />
      </section>
      <section className="bg-surface border-t border-line">
        <div className="mx-auto max-w-[760px] px-6 py-18">
          <SectionHeading
            eyebrow={copy.t("faq.eyebrow")}
            title={copy.t("faq.title")}
          />
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
