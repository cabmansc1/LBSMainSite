import type { Metadata } from "next";
import Link from "next/link";
import { Card, CtaBand } from "@/components/sections";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "List Your Business: Free Directory Listing",
  description:
    "Get your Lowcountry business listed free, or go Premium for $10 a month with photos, offers, hours, and featured placement.",
  alternates: { canonical: `${SITE_URL}/directory-signup` },
  openGraph: {
    title: `List Your Business | ${SITE_NAME}`,
    description: "Free and Premium directory listings for local businesses.",
    siteName: SITE_NAME,
    type: "website",
  },
};

const PLANS = [
  {
    name: "Basic",
    price: "Free",
    note: "forever",
    features: [
      "Business name, category, and contact info",
      "Appears in search and category pages",
      "Link to your website",
    ],
    cta: { label: "Start free", href: "/register" },
    popular: false,
  },
  {
    name: "Premium",
    price: "$10",
    note: "per month, or $60 per year",
    features: [
      "Everything in Basic",
      "Photo gallery and business hours",
      "Special offers shown on your listing",
      "Featured placement above Basic listings",
      "Listing analytics in your dashboard",
      "Postcard advertising discounts",
    ],
    cta: { label: "Go Premium", href: "/register" },
    popular: true,
  },
];

export default function DirectorySignupPage() {
  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            List your business
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[24ch] text-balance">
            Get found by Lowcountry neighbors.
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[56ch]">
            A Basic listing is free, forever. Premium adds photos, offers, and
            featured placement for less than a lunch.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[880px] px-6 py-12">
        <div className="grid md:grid-cols-2 gap-4">
          {PLANS.map((p) => (
            <Card
              key={p.name}
              className={`p-7 grid gap-4.5 content-start relative ${
                p.popular ? "border-navy-950 border-[1.5px]" : ""
              }`}
            >
              {p.popular && (
                <span className="absolute -top-[11px] left-6 bg-navy-950 text-white text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full">
                  Best value
                </span>
              )}
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {p.name}
                </div>
                <div className="text-[38px] font-bold tracking-[-0.03em] leading-none mt-2 num">
                  {p.price}
                </div>
                <div className="text-[12.5px] text-muted mt-1">{p.note}</div>
              </div>
              <ul className="grid gap-2 text-[13.5px] text-body">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 items-start">
                    <svg className="text-ok mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.cta.href}
                className={`inline-flex items-center justify-center font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) transition-colors ${
                  p.popular
                    ? "bg-cta text-navy-950 hover:bg-cta-hover hover:text-white"
                    : "bg-white text-ink border border-line-strong hover:border-faint"
                }`}
              >
                {p.cta.label}
              </Link>
            </Card>
          ))}
        </div>
        <p className="text-[12.5px] text-muted mt-4">
          Account creation and Premium billing connect in the account phase.
          Until then, new listings go through our team:{" "}
          <a href="mailto:hello@lbspotlight.com" className="text-brand-deep font-semibold hover:underline">
            hello@lbspotlight.com
          </a>
        </p>

        <div className="mt-14">
          <CtaBand
            title="Already advertise on our postcards?"
            sub="Postcard advertisers get featured directory placement included."
            ctaLabel="See Postcard Pricing"
            ctaHref="/pricing"
          />
        </div>
      </div>
    </>
  );
}
