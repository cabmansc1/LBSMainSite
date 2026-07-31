import type { Metadata } from "next";
import { AdFinder } from "@/components/ad-finder";
import { CtaBand } from "@/components/sections";
import { getLivePricing } from "@/lib/pricing-store";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Find Your Perfect Ad",
  description:
    "Answer four questions about your business, goal, reach, and budget, and see which Spotlight Postcard ad size fits you and what it costs.",
  alternates: { canonical: `${SITE_URL}/find-your-ad` },
  openGraph: {
    title: `Find Your Perfect Ad | ${SITE_NAME}`,
    description: "Four questions to the right ad size and price.",
    siteName: SITE_NAME,
    type: "website",
  },
};

// Prices are admin-editable, so never serve a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function FindYourAdPage() {
  const pricing = await getLivePricing();
  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Ad finder
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[24ch] text-balance">
            Find your perfect direct mail ad
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[56ch]">
            Four questions. We will tell you which ad size fits your goal and
            your budget, and what it costs to run.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        <AdFinder pricing={pricing} />
        <div className="mt-14">
          <CtaBand
            title="Know what you want? Lock in your category."
            sub="One business per industry per card."
            ctaLabel="See pricing"
            ctaHref="/pricing"
          />
        </div>
      </div>
    </>
  );
}
