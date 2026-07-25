import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, SectionHeading, CtaBand } from "@/components/sections";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { POSTCARD_PRICING, formatPrice } from "@/lib/pricing";

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

export default function AdvertisePage() {
  const fromPrice = formatPrice(POSTCARD_PRICING["5k"].small.priceCents);

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
              A 9×12 full-color postcard shared by up to eleven exclusive local
              businesses, mailed to 5,000+ households. From{" "}
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
    </>
  );
}
