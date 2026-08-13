import type { Metadata } from "next";
import { CoverageMapCards } from "@/components/coverage-map-cards";
import { CoverageMap } from "@/components/coverage-map";
import { getUpcomingMailings } from "@/lib/mission-control";
import { getCardDescriptions } from "@/lib/card-details";
import { ZONES } from "@/lib/zones";
import { getLiveMailingAreas } from "@/lib/zone-store";
import { mapPositionsFrom } from "@/lib/map-positions";
import { getLivePricing } from "@/lib/pricing-store";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * How many zones we mail, counted rather than typed.
 *
 * This page said "11 zones" in three places: the title, the meta
 * description and the intro. Adding Hanahan made all three wrong at
 * once, and nothing about adding a zone would have reminded anyone to
 * come back here. The map below already draws from ZONES, so now the
 * words do too.
 */
const ZONE_COUNT = ZONES.length;

/** Small counts read better as words in a sentence. */
const WORDS = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
  "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
  "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty",
];
const ZONE_COUNT_WORD = WORDS[ZONE_COUNT] ?? String(ZONE_COUNT);

// Reads Mission Control and the database for live spot counts and the per-card descriptions,
// so it cannot be prerendered: the build container can reach
// neither, and waiting on them is what failed the deploy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Coverage Map: ${ZONE_COUNT} Charleston-Area Zones`,
  description:
    `See every neighborhood Lowcountry Business Spotlight mails: households, ZIP codes, tentative mail dates, and live spot availability across ${ZONE_COUNT} zones.`,
  alternates: { canonical: `${SITE_URL}/coverage-map` },
  openGraph: {
    title: `Coverage Map | ${SITE_NAME}`,
    description: `${ZONE_COUNT} Charleston-area zones with live spot availability.`,
    siteName: SITE_NAME,
    type: "website",
  },
};

export default async function CoverageMapPage() {
  // No getLiveZones here any more. Marker positions stopped depending on
  // zone populations when they stopped being sized by them, and this
  // page is force-dynamic, so that was a database read on every render
  // feeding nothing. getLiveMailingAreas still reflects saved pairings.
  const [mailings, descriptions, areas, pricing] = await Promise.all([
    getUpcomingMailings(),
    getCardDescriptions(),
    getLiveMailingAreas(),
    getLivePricing(),
  ]);
  const positions = mapPositionsFrom(areas);
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
          {ZONE_COUNT_WORD} zones across the Charleston Lowcountry. Select a
          zone to see households, ZIP codes, the tentative mail date, and live
          spot availability.
        </p>
        <div className="mt-9">
          <CoverageMap
            mailings={mailings}
            areas={areas}
            positions={positions}
            fromCents={pricing["5k"].small.priceCents}
          />
        </div>

        {mailings.length > 0 && (
          <section className="mt-14">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5">
              <h2 className="text-[20px] font-bold tracking-tight">
                Upcoming cards
              </h2>
              <span className="text-[12.5px] text-[#93A5B8]">
                Live from our production pipeline
              </span>
            </div>
            <CoverageMapCards mailings={mailings} descriptions={descriptions} />
            <p className="mt-4 text-[12.5px] text-[#67768A]">
              Availability updates automatically as spots sell.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
