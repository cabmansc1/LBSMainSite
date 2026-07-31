import type { Metadata } from "next";
import { RoiCalculator } from "@/components/roi-calculator";
import { CtaBand } from "@/components/sections";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { getLivePricing } from "@/lib/pricing-store";

export const metadata: Metadata = {
  title: "Direct Mail ROI Calculator",
  description:
    "Estimate what a Spotlight Postcard mailing returns for your business: investment, cost per household, new customers, and revenue.",
  alternates: { canonical: `${SITE_URL}/roi-calculator` },
  openGraph: {
    title: `ROI Calculator | ${SITE_NAME}`,
    description: "Estimate your direct mail return in 30 seconds.",
    siteName: SITE_NAME,
    type: "website",
  },
};

// Prices are admin-editable, so never serve a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function RoiCalculatorPage() {
  const pricing = await getLivePricing();
  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            ROI calculator
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[24ch] text-balance">
            What would 5,000 mailboxes return?
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[56ch]">
            Pick your reach, ad size, and a realistic response rate. See the
            math before you spend a dollar.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        <RoiCalculator pricing={pricing} />
        <div className="mt-14">
          <CtaBand
            title="Like the math? Lock in your category."
            sub="One business per industry per card. From $249 per mailing."
            ctaLabel="Reserve a Spot"
            ctaHref="/pricing"
          />
        </div>
      </div>
    </>
  );
}
