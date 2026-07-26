import type { Metadata } from "next";
import Link from "next/link";
import { Card, SectionHeading, CtaBand } from "@/components/sections";
import { Button } from "@/components/ui/button";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Successor to the legacy /compare page (indexed, in the live sitemap).
 * Keeps the same purpose: explain the Spotlight Postcard product and how
 * it compares to a Neighborhood Card so a business can pick one.
 */
export const metadata: Metadata = {
  title: "Compare Direct Mail Options in the Charleston Area",
  description:
    "Compare Spotlight Postcards and Neighborhood Cards side by side: reach, ad sizes, exclusivity, design, and pricing, so you can pick the right direct mail option for your Lowcountry business.",
  alternates: { canonical: `${SITE_URL}/compare` },
  openGraph: {
    title: `Compare Direct Mail Options | ${SITE_NAME}`,
    description:
      "Two ways to reach local homes. See which shared mailer fits your business.",
    siteName: SITE_NAME,
    type: "website",
  },
};

const ROWS: { label: string; postcard: string; neighborhood: string }[] = [
  {
    label: "Format",
    postcard: "9x12 oversized postcard",
    neighborhood: "Shared community card",
  },
  {
    label: "Reach",
    postcard: "5,000 to 10,000 homes per mailing",
    neighborhood: "Targeted single neighborhood",
  },
  {
    label: "Exclusivity",
    postcard: "One business per category, per card",
    neighborhood: "One business per category, per card",
  },
  {
    label: "Ad sizes",
    postcard: "Small 3x2, medium 4x3, large 4x6",
    neighborhood: "Fixed spot size",
  },
  {
    label: "Design",
    postcard: "Free professional ad design",
    neighborhood: "Free professional ad design",
  },
  {
    label: "Tracking",
    postcard: "Branded QR codes and tracking URLs",
    neighborhood: "Branded QR codes and tracking URLs",
  },
  {
    label: "Starting price",
    postcard: "$249 per mailing",
    neighborhood: "See current card pricing",
  },
  {
    label: "Best for",
    postcard:
      "Maximum reach, premium branding, and businesses that want the whole zone",
    neighborhood:
      "Tight local targeting and a lower entry point into direct mail",
  },
];

export default function ComparePage() {
  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Compare options
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[22ch] text-balance">
            Two ways to reach local homes.
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[58ch]">
            Both put your business in the mailbox alongside other trusted local
            companies, so you split the cost of a mailer none of you could
            justify alone. The difference is scale.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-7 grid gap-3 content-start border-l-[3px] border-l-brand">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-deep">
              Premium reach
            </span>
            <h2 className="text-[19px] font-bold tracking-tight">
              Spotlight Postcards
            </h2>
            <p className="text-sm text-body leading-relaxed">
              A 9x12 oversized postcard mailed to every home in a neighborhood
              zone. Hard to miss in a stack of mail, and only one business per
              category rides each card.
            </p>
            <p className="text-[15px] font-semibold num">
              From $249 <span className="text-muted font-normal text-[13px]">per mailing</span>
            </p>
            <div className="pt-1">
              <Button href="/pricing">See Postcard Pricing</Button>
            </div>
          </Card>

          <Card className="p-7 grid gap-3 content-start border-l-[3px] border-l-cta">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              Neighborhood focus
            </span>
            <h2 className="text-[19px] font-bold tracking-tight">
              Neighborhood Cards
            </h2>
            <p className="text-sm text-body leading-relaxed">
              A shared card built around a single community. Smaller footprint,
              lower entry cost, same category exclusivity and the same free ad
              design.
            </p>
            <p className="text-[15px] font-semibold">
              Current cards and pricing
            </p>
            <div className="pt-1">
              <Button href="/neighborhood-cards" variant="quiet">
                Browse Neighborhood Cards
              </Button>
            </div>
          </Card>
        </div>

        <section className="mt-12">
          <SectionHeading eyebrow="Side by side" title="What you get with each" />
          <div className="border border-line rounded-(--radius-card) bg-white overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px] min-w-[620px]">
              <thead>
                <tr>
                  {["", "Spotlight Postcards", "Neighborhood Cards"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.label} className="hover:bg-surface">
                    <td className="px-4 py-3.5 border-b border-line font-semibold whitespace-nowrap">
                      {r.label}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line">
                      {r.postcard}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line text-muted">
                      {r.neighborhood}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <SectionHeading eyebrow="Still deciding" title="Have questions?" />
          <Card className="p-7 grid gap-2">
            <p className="text-sm text-body leading-relaxed max-w-[62ch]">
              We are happy to help you figure out the right campaign for your
              business and budget. Most owners start with the zone closest to
              their customers and add a second once the calls come in.
            </p>
            <p className="text-sm">
              <a
                href="tel:+18432122969"
                className="font-semibold text-brand-deep hover:underline"
              >
                Call 843-212-2969
              </a>
              <span className="text-muted"> or </span>
              <Link href="/contact" className="font-semibold text-brand-deep hover:underline">
                send us a note
              </Link>
              .
            </p>
          </Card>
        </section>

        <div className="mt-14">
          <CtaBand
            title="Know which one you want?"
            sub="Check live availability and claim your category before the next deadline."
            ctaLabel="See Coverage and Availability"
            ctaHref="/coverage-map"
          />
        </div>
      </div>
    </>
  );
}
