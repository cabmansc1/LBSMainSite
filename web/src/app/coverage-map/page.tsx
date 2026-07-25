import type { Metadata } from "next";
import { CoverageMap } from "@/components/coverage-map";
import { getUpcomingMailings } from "@/lib/mission-control";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Coverage Map: 11 Charleston-Area Zones",
  description:
    "See every neighborhood Lowcountry Business Spotlight mails: households, ZIP codes, next mailing dates, and live spot availability across 11 zones.",
  alternates: { canonical: `${SITE_URL}/coverage-map` },
  openGraph: {
    title: `Coverage Map | ${SITE_NAME}`,
    description: "11 Charleston-area zones with live spot availability.",
    siteName: SITE_NAME,
    type: "website",
  },
};

export default async function CoverageMapPage() {
  const mailings = await getUpcomingMailings();
  return (
    <div className="bg-navy-950 text-white">
      <div className="mx-auto max-w-[1120px] px-6 py-14 pb-18">
        <span className="text-xs font-semibold uppercase tracking-widest text-brand">
          Interactive coverage map
        </span>
        <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[20ch]">
          Pick your neighborhood.
        </h1>
        <p className="mt-3 text-[#93A5B8] max-w-[56ch]">
          Eleven zones across the Charleston Lowcountry. Select a zone to see
          households, ZIP codes, the next mailing date, and live spot
          availability.
        </p>
        <div className="mt-9">
          <CoverageMap mailings={mailings} />
        </div>
      </div>
    </div>
  );
}
