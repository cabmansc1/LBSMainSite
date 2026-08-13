"use client";

import Link from "next/link";
import { MailingFacets, useMailingFilter } from "@/components/mailing-facets";
import { StatusChip, FillMeter } from "@/components/sections";
import { cardCoverage } from "@/lib/card-coverage";
import type { UpcomingMailing } from "@/lib/mailings";
import { CONTACT_PHONE_TEL } from "@/lib/seo";
import { zoneBySlug } from "@/lib/zones";

/**
 * The mailing calendar table, with the shared facet chips over it.
 *
 * Filtering, counting and the URL mirroring live in mailing-facets so
 * the coverage map grid runs the same logic rather than a second copy
 * of it to drift out of sync. What is left here is the table.
 */

type Props = {
  mailings: UpcomingMailing[];
  descriptions: Record<string, string>;
};

const chipFor = (status: string, left: number) => {
  if (status === "waitlist") return <StatusChip tone="info">Waitlist</StatusChip>;
  if (status === "full") return <StatusChip tone="danger">Full</StatusChip>;
  // Before scarcity, because "2 left" on a card we have not committed
  // to printing is pressure we have not earned.
  if (status === "planned") return <StatusChip tone="info">Planned</StatusChip>;
  if (left <= 2) return <StatusChip tone="warn">{left} left</StatusChip>;
  return <StatusChip tone="ok">Open</StatusChip>;
};

export function MailingFilter({ mailings, descriptions }: Props) {
  const filter = useMailingFilter(mailings);
  const { visible, clearAll } = filter;

  return (
    <>
      <MailingFacets filter={filter} total={mailings.length} tone="light" />

      {visible.length === 0 ? (
        <div className="border border-line rounded-(--radius-card) bg-white p-8 text-center">
          <h2 className="text-[17px] font-semibold tracking-tight">
            No cards match those filters
          </h2>
          <p className="text-sm text-body mt-2 max-w-[42ch] mx-auto leading-relaxed">
            Every combination is not always on the schedule. Widen the
            selection, or call and we will tell you what is coming for the area
            you want.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="inline-block mt-4 text-sm font-semibold text-brand-deep hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="border border-line rounded-(--radius-card) bg-white overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px] min-w-[720px]">
            <thead>
              <tr>
                {[
                  "Neighborhood",
                  "Tentatively mails",
                  "Artwork deadline",
                  "Reach",
                  "Availability",
                  "Status",
                  "",
                ].map((h) => (
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
              {visible.map((m) => {
                const left = m.spotsTotal - m.spotsTaken;
                return (
                  <tr
                    key={m.cardId ?? `${m.zoneSlug}-${m.mailMonth}`}
                    className="hover:bg-surface"
                  >
                    <td className="px-4 py-3.5 border-b border-line font-semibold">
                      {m.zoneName}
                      {cardCoverage(m).name && (
                        <span className="block text-[12.5px] font-medium text-muted">
                          {cardCoverage(m).name}
                        </span>
                      )}
                      {cardCoverage(m).zips.length > 0 && (
                        <span className="block text-[12px] text-muted num">
                          ZIP {cardCoverage(m).zips.join(", ")}
                        </span>
                      )}
                      {m.cardId && descriptions[m.cardId] && (
                        <span className="block text-[12.5px] font-normal text-body mt-1 max-w-[42ch]">
                          {descriptions[m.cardId]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line">
                      {m.mailMonth}
                    </td>
                    {/* Blank in Mission Control means blank here. These
                        cells used to print "Ask us" and an invented
                        "5,000+" rather than admit the schedule is not
                        set yet. */}
                    <td className="px-4 py-3.5 border-b border-line">
                      {m.artworkDeadline ?? (
                        <span className="text-faint">TBD</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line num">
                      {m.households ?? <span className="text-faint">TBD</span>}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line">
                      <FillMeter taken={m.spotsTaken} total={m.spotsTotal} />
                    </td>
                    <td className="px-4 py-3.5 border-b border-line">
                      {chipFor(m.status, left)}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line">
                      {zoneBySlug(m.zoneSlug) ? (
                        <Link
                          href={`/${m.zoneSlug}-direct-mail-marketing`}
                          className="text-brand-deep font-semibold hover:underline whitespace-nowrap"
                        >
                          {m.status === "waitlist" ? "Join waitlist" : "Reserve"}
                        </Link>
                      ) : (
                        <a
                          href={`tel:${CONTACT_PHONE_TEL}`}
                          className="text-brand-deep font-semibold hover:underline whitespace-nowrap"
                        >
                          Call to book
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
