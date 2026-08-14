"use client";

import Link from "next/link";
import { MailingFacets, useMailingFilter } from "@/components/mailing-facets";
import { cardCoverage } from "@/lib/card-coverage";
import type { UpcomingMailing } from "@/lib/mailings";
import { tentativelyMails } from "@/lib/mailings";
import { CONTACT_PHONE_TEL } from "@/lib/seo";
import { zoneBySlug } from "@/lib/zones";

/**
 * The coverage map's upcoming-cards grid, filtered.
 *
 * Same cards and same filtering as the calendar table, in the clothes
 * this page wears — hence the shared hook and a dark tone rather than a
 * second implementation. The card markup is unchanged from when it
 * lived in the page.
 */

export function CoverageMapCards({
  mailings,
  descriptions,
  categoryOptions = [],
}: {
  mailings: UpcomingMailing[];
  descriptions: Record<string, string>;
  /** Mission Control's category vocabulary, for the category search. */
  categoryOptions?: string[];
}) {
  const filter = useMailingFilter(mailings, categoryOptions);
  const { visible, clearAll } = filter;

  return (
    <>
      <MailingFacets filter={filter} total={mailings.length} tone="dark" />

      {visible.length === 0 ? (
        <div className="border border-white/12 bg-white/4 rounded-2xl p-8 text-center">
          <h3 className="text-[16px] font-semibold tracking-tight">
            No cards match those filters
          </h3>
          <p className="text-[13.5px] text-[#93A5B8] mt-2 max-w-[42ch] mx-auto leading-relaxed">
            Every combination is not always on the schedule. Widen the
            selection, or call and we will tell you what is coming for the area
            you want.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="inline-block mt-4 text-[13.5px] font-semibold text-brand hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {visible.map((m) => {
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
      )}
    </>
  );
}
