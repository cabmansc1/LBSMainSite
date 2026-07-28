import type { Metadata } from "next";
import Link from "next/link";
import { CoverageMap } from "@/components/coverage-map";
import { getUpcomingMailings } from "@/lib/mission-control";
import { cardCoverage } from "@/lib/card-coverage";
import { getCardDescriptions } from "@/lib/card-details";
import { zoneBySlug } from "@/lib/zones";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

// Reads Mission Control and the database for live spot counts and the per-card descriptions,
// so it cannot be prerendered: the build container can reach
// neither, and waiting on them is what failed the deploy.
export const dynamic = "force-dynamic";

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
  const [mailings, descriptions] = await Promise.all([
    getUpcomingMailings(),
    getCardDescriptions(),
  ]);
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
                      : left <= 3
                        ? { text: `${left} left`, cls: "text-cta border-cta/50" }
                        : { text: "Open", cls: "text-brand border-brand/50" };
                return (
                  <div
                    key={m.cardId ?? `${m.zoneSlug}-${m.mailMonth}`}
                    className="border border-white/12 bg-white/4 rounded-2xl p-5 grid gap-3.5 content-start"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[15.5px] font-semibold leading-snug">
                          {m.zoneName}
                          {cardCoverage(m).name && (
                            <span className="block text-[12.5px] font-medium text-brand">
                              {cardCoverage(m).name}
                            </span>
                          )}
                        </h3>
                        <p className="text-[12.5px] text-[#93A5B8] mt-1">
                          Mails {m.mailMonth}
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
                      {zoneBySlug(m.zoneSlug) ? (
                        <Link
                          href={`/${m.zoneSlug}-direct-mail-marketing`}
                          className="font-semibold text-brand hover:underline whitespace-nowrap"
                        >
                          {m.status === "waitlist" || m.status === "full" || left === 0
                            ? "Join waitlist"
                            : "Reserve a spot"}
                        </Link>
                      ) : (
                        <a
                          href="tel:+18432122969"
                          className="font-semibold text-brand hover:underline whitespace-nowrap"
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
