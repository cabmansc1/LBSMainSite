import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  SectionHeading,
  Card,
  TestimonialStrip,
  CtaBand,
} from "@/components/sections";
import { hasTestimonials } from "@/lib/testimonials";
import { buildMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";
import { formatPrice } from "@/lib/pricing";
import { getLivePricing } from "@/lib/pricing-store";
import { getSiteStats } from "@/lib/admin-data";
import { getUpcomingMailings } from "@/lib/mission-control";

export const metadata: Metadata = buildMetadata("home");

/**
 * Homepage FAQs, ported from index.php where they produced the FAQ rich
 * result. Two answers stated prices and reach figures that are no longer
 * true, so those are corrected to what the site actually sells today.
 * Publishing a stale price is worse than losing the snippet.
 */
const HOME_FAQS = [
  {
    q: "How much does direct mail advertising cost?",
    a: "Spotlight Postcards start at $249 per mailing for 5,000 households. Pricing depends on the zone, the reach, and the ad size, and design, print and postage are always included.",
  },
  {
    q: "How many households will see my ad?",
    a: "Each mailing reaches 5,000 or 10,000 households in one zone, across Charleston, Summerville, Mount Pleasant, Daniel Island, North Charleston, Moncks Corner, Goose Creek and the islands.",
  },
  {
    q: "Do I need to design my own ad?",
    a: "No. We provide free professional ad design. Send us your logo, your offer and your contact details, and we handle the rest. You approve a proof before anything prints.",
  },
  {
    q: "What makes your postcards different from other advertising?",
    a: "Each business gets exclusive category placement, so no competitor appears on the same card. Your ad arrives like a mini billboard delivered straight to the mailbox.",
  },
  {
    q: "How do I track my results?",
    a: "We can include a trackable QR code, a unique landing page, and a dedicated phone number, so scans, visits and calls are all measurable.",
  },
  {
    q: "Is the online directory listing free?",
    a: "Yes. Every business gets a free basic listing in our directory. Paid plans unlock photos, hours, offers and featured placement.",
  },
];

const homeJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/lb-spotlight.png`,
    telephone: "+1-843-212-2969",
    email: "hello@lbspotlight.com",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];



/**
 * Fallback only. The real numbers live in site_stats and are edited on
 * /admin/stats; these are what shows if that table is empty or the
 * database is unreachable, so the bar never renders blank.
 */
const STATS = [
  { value: "50,000+", label: "Postcards mailed" },
  { value: "75+", label: "Businesses served" },
  { value: "5,000+", label: "Households per mailing" },
  { value: "11", label: "Service areas" },
];

const BENEFITS = [
  {
    title: "Category exclusivity",
    body: "One plumber, one dentist, one pizza place per card. Your competitors cannot buy their way on.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.9 6.3 6.6.6-5 4.5 1.5 6.6L12 16.9 6 20l1.5-6.6-5-4.5 6.6-.6z" />
      </svg>
    ),
  },
  {
    title: "9×12: too big to ignore",
    body: "The largest piece in the mailbox that day. It gets flipped, read, and stuck to the fridge.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18M8 15h4" />
      </svg>
    ),
  },
  {
    title: "Tracking built in",
    body: "QR codes and unique URLs on every ad, so you see exactly what a mailing brings in.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
      </svg>
    ),
  },
  {
    title: "Design done for you",
    body: "Copywriting and layout are included. Send a logo and an offer, and we handle the rest.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.6 7.6" />
      </svg>
    ),
  },
];

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
    body: "Your card lands in 5,000+ mailboxes. Watch scans and calls roll in from your advertiser dashboard.",
  },
];

// Stats, prices and the next card all come from the database and from
// Mission Control. The page was fully static, so it was baked at build
// time and never saw an admin edit until something revalidated it.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // The admin stats screen writes site_stats. The homepage was showing a
  // hardcoded array instead, so editing a stat changed nothing a visitor
  // could see.
  const saved = (await getSiteStats().catch(() => []))
    .filter((s) => s.active && s.value.trim() && s.label.trim())
    .map((s) => ({ value: s.value, label: s.label }));
  const stats = saved.length > 0 ? saved : STATS;

  // The closing CTA used to assert "2 spots left" in hardcoded copy,
  // which was true only by accident. Take it from the card that is
  // actually filling soonest, and say something safe when none is.
  const upcoming = await getUpcomingMailings().catch(() => []);
  const nextCard =
    upcoming.find((m) => m.status === "open" && m.spotsTaken < m.spotsTotal) ??
    upcoming[0];
  const spotsLeft = nextCard
    ? Math.max(0, nextCard.spotsTotal - nextCard.spotsTaken)
    : 0;
  // The hero badge said "September Summerville card: 2 spots left" in
  // hardcoded copy. It was the first line on the page and it was going
  // to keep saying September forever. Same source as the closing CTA;
  // month only, because the year makes the pill wrap on a phone.
  const heroBadge =
    nextCard && spotsLeft > 0
      ? `${nextCard.mailMonth.split(" ")[0]} ${nextCard.zoneName} card: ${spotsLeft} ${
          spotsLeft === 1 ? "spot" : "spots"
        } left`
      : "Now booking upcoming neighborhood cards";
  const ctaTitle = nextCard
    ? spotsLeft > 0
      ? `The ${nextCard.zoneName} card mailing ${nextCard.mailMonth} has ${spotsLeft} ${
          spotsLeft === 1 ? "spot" : "spots"
        } left.`
      : `The ${nextCard.zoneName} card mailing ${nextCard.mailMonth} is full.`
    : "Claim your category on the next card.";
  const livePricing = await getLivePricing();
  const fromPrice = formatPrice(livePricing["5k"].small.priceCents);

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-21 pb-16 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/6 border border-white/14 text-[#C6D3E0]">
              <span className="w-1.5 h-1.5 rounded-full bg-cta" />
              {heroBadge}
            </span>
            <h1 className="mt-5 text-4xl md:text-[54px] font-bold tracking-[-0.035em] leading-[1.06] text-balance">
              Your business in{" "}
              <em className="not-italic text-brand">5,000 mailboxes.</em> Your
              competitors in none.
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-[#AEBDCC] max-w-[50ch]">
              Shared 9×12 postcards mailed to Charleston-area neighborhoods. One
              exclusive spot per industry, professional design included, from{" "}
              <b className="text-white font-semibold num">{fromPrice}</b> per
              mailing.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/pricing">Reserve a Spot</Button>
              <Button href="/coverage-map" variant="ghost">
                View Coverage Map
              </Button>
            </div>
            <ul className="mt-7 flex flex-wrap gap-5 text-[13.5px] text-[#67768A]">
              {["No competitors on your card", "Free ad design", "QR tracking included"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <svg className="text-brand" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="justify-self-center w-full max-w-[460px] rotate-[1.5deg]">
            <Image
              src="/cards/card-sample-1.webp"
              alt="A real 9x12 Lowcountry Business Spotlight postcard with local business ads"
              width={920}
              height={614}
              priority
              className="rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,.4)]"
            />
            <p className="text-center text-[11px] text-[#67768A] pt-3 -rotate-[1.5deg]">
              A real Spotlight Postcard, mailed to 5,000+ households
            </p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-[1120px] px-6 py-7 grid grid-cols-2 md:grid-cols-4 gap-5">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={i > 0 ? "md:border-l md:border-white/10 md:pl-5" : ""}
              >
                <b className="block text-2xl md:text-[28px] font-bold tracking-tight num">
                  {s.value}
                </b>
                <span className="text-[12.5px] text-[#67768A]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1120px] px-6 py-22">
        <SectionHeading
          eyebrow="Why it works"
          title="Billboard impact, shared cost"
          sub="You share the card, and the cost, with local businesses you do not compete with. Everyone gets seen. Nobody pays billboard prices."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {BENEFITS.map((b) => (
            <Card key={b.title} className="p-6.5 grid gap-3 content-start">
              <span className="w-9.5 h-9.5 rounded-[9px] bg-brand-tint text-brand-deep flex items-center justify-center">
                {b.icon}
              </span>
              <h3 className="text-[17px] font-semibold tracking-tight">{b.title}</h3>
              <p className="text-sm text-body leading-relaxed">{b.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-surface border-y border-line">
        <div className="mx-auto max-w-[1120px] px-6 py-22">
          <SectionHeading
            eyebrow="The product"
            title="Real cards, real mailboxes"
            sub="Every card is a 9×12 full-color postcard printed on heavy stock. These are actual cards we mailed."
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
              See past cards by neighborhood
            </Button>
          </div>
        </div>
      </section>

      {hasTestimonials("home") && (
        <section className="mx-auto max-w-[1120px] px-6 py-22">
          <SectionHeading
            eyebrow="Local businesses on LBS"
            title="Trusted around the Lowcountry"
          />
          <TestimonialStrip placement="home" />
        </section>
      )}

      <section className="bg-surface border-y border-line">
        <div className="mx-auto max-w-[1120px] px-6 py-22">
          <SectionHeading eyebrow="How it works" title="On a card in three steps" />
          <div className="grid md:grid-cols-3 gap-3.5">
            {STEPS.map((s, i) => (
              <Card key={s.title} className="p-6.5 grid gap-2.5 content-start">
                <span className="w-[30px] h-[30px] rounded-lg bg-brand-tint text-brand-deep text-[13px] font-bold flex items-center justify-center num">
                  {i + 1}
                </span>
                <h3 className="text-[17px] font-semibold tracking-tight">{s.title}</h3>
                <p className="text-sm text-body leading-relaxed">{s.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface border-y border-line">
        <div className="mx-auto max-w-[760px] px-6 py-18">
          <SectionHeading eyebrow="Questions" title="Direct mail, answered" />
          <div className="mt-8 bg-white border border-line rounded-(--radius-card) overflow-hidden">
            {HOME_FAQS.map((f) => (
              <details
                key={f.q}
                className="border-b border-line last:border-b-0 group"
              >
                <summary className="cursor-pointer list-none px-6 py-4.5 flex items-center justify-between gap-4 text-[15px] font-semibold">
                  {f.q}
                  <span className="text-muted text-lg leading-none group-open:hidden">
                    +
                  </span>
                  <span className="text-muted text-lg leading-none hidden group-open:inline">
                    &minus;
                  </span>
                </summary>
                <p className="px-6 pb-5 text-[14.5px] text-body leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <CtaBand
          title={ctaTitle}
          sub="Print deadline is coming. Exclusive categories go fast."
          ctaLabel="Claim Your Category"
          ctaHref="/pricing"
        />
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
    </>
  );
}
