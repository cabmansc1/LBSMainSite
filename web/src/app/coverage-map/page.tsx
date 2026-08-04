import type { Metadata } from "next";
import Link from "next/link";
import { CoverageMap } from "@/components/coverage-map";
import { getUpcomingMailings } from "@/lib/mission-control";
import { cardCoverage } from "@/lib/card-coverage";
import { tentativelyMails } from "@/lib/mailings";
import { getCardDescriptions } from "@/lib/card-details";
import { ZONES, zoneBySlug } from "@/lib/zones";
import { getLiveMailingAreas } from "@/lib/zone-store";
import { mapPositionsFrom } from "@/lib/map-positions";
import { getLivePricing } from "@/lib/pricing-store";
import { CONTACT_PHONE_TEL, SITE_NAME, SITE_URL } from "@/lib/seo";

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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {mailings.map((m) => {
                const left = Math.max(0, m.spotsTotal - m.spotsTaken);
                const pct = Math.min(
                  100,
                  Math.round((m.spotsTaken / m.spotsTotal) * 100),
                );
                const chip =
                  m.status === "waitlist"
                    ? { text: "Waitlist", cls: "text-[#93A5B8] border-white/20" }
                    : m.status === "full" || left === 0
                      ? { text: "Full", cls: "text-[#93A5B8] border-white/20" }
                      // Ahead of the scarcity chip: "2 left" on a card we
                      // have not committed to printing is pressure we
                      // have not earned.
                      : m.status === "planned"
                        ? { text: "Planned", cls: "text-[#93A5B8] border-white/20" }
                      : left <= 3
                        ? { text: `${left} left`, cls: "text-cta border-cta/50" }
                        // Open is the default state and sat on almost every
                        // card in brand blue, so the one card that was
                        // nearly gone had to shout over eleven that were
                        // not. Scarcity is the only status worth a colour.
                        : { text: "Open", cls: "text-[#C6D3E0] border-white/25" };
                return (
                  <div
                    key={m.cardId ?? `${m.zoneSlug}-${m.mailMonth}`}
                    className="border border-white/12 bg-white/4 rounded-2xl p-5 grid gap-3.5 content-start"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[15.5px] font-semibold leading-snug">
                          {m.zoneName}
                          {/* The coverage area names the card, it does not
                              ask for anything, so it reads as a second
                              line of the heading rather than as a third
                              blue thing competing with the one that
                              does. */}
                          {cardCoverage(m).name && (
                            <span className="block text-[12.5px] font-medium text-[#C6D3E0]">
                              {cardCoverage(m).name}
                            </span>
                          )}
                        </h3>
                        <p className="text-[12.5px] text-[#93A5B8] mt-1">
                          {tentativelyMails(m.mailMonth)}
                          {m.households ? ` · ${m.households} homes` : ""}
                        </p>
                        {cardCoverage(m).zips.length > 0 && (
                          <p className="text-[12px] text-[#67768A] mt-0.5 num">
                            ZIP {cardCoverage(m).zips.join(", ")}
                          </p>
                        )}
                        {m.cardId && descriptions[m.cardId] && (
                          <p className="text-[12.5px] text-[#93A5B8] mt-2 leading-relaxed">
                            {descriptions[m.cardId]}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider border rounded-full px-2.5 py-1 whitespace-nowrap ${chip.cls}`}
                      >
                        {chip.text}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full bg-white/12 overflow-hidden"
                      role="meter"
                      aria-valuenow={m.spotsTaken}
                      aria-valuemin={0}
                      aria-valuemax={m.spotsTotal}
                      aria-label={`${m.spotsTaken} of ${m.spotsTotal} spots filled`}
                    >
                      <div
                        className={`h-full rounded-full ${pct >= 80 ? "bg-cta" : "bg-brand"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="text-[#93A5B8] num">
                        {m.spotsTaken}/{m.spotsTotal} spots filled
                      </span>
                      {/* Reserving is the one thing this card exists to
                          get someone to do, so it gets the orange the
                          rest of the site reserves for buying. Joining a
                          waitlist is not that: it is what is left when
                          the card is full, and dressing it as the same
                          action makes a closed card look open. It stays
                          a quiet link. */}
                      {zoneBySlug(m.zoneSlug) ? (
                        m.status === "waitlist" || m.status === "full" || left === 0 ? (
                          <Link
                            href={`/${m.zoneSlug}-direct-mail-marketing`}
                            className="font-semibold text-brand hover:underline whitespace-nowrap"
                          >
                            Join waitlist
                          </Link>
                        ) : (
                          <Link
                            href={`/${m.zoneSlug}-direct-mail-marketing`}
                            className="bg-cta text-navy-950 text-[12.5px] font-bold px-3 py-1 rounded-(--radius-btn) hover:bg-[#FFA033] whitespace-nowrap"
                          >
                            {m.status === "planned" ? "Reserve early" : "Reserve a spot"}
                          </Link>
                        )
                      ) : (
                        <a
                          href={`tel:${CONTACT_PHONE_TEL}`}
                          className="bg-cta text-navy-950 text-[12.5px] font-bold px-3 py-1 rounded-(--radius-btn) hover:bg-[#FFA033] whitespace-nowrap"
                        >
                          Call to book
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[12.5px] text-[#67768A]">
              Availability updates automatically as spots sell.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
