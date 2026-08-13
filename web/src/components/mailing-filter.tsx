"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusChip, FillMeter } from "@/components/sections";
import { cardCoverage } from "@/lib/card-coverage";
import type { UpcomingMailing } from "@/lib/mailings";
import { CONTACT_PHONE_TEL } from "@/lib/seo";
import { zoneBySlug } from "@/lib/zones";

/**
 * The mailing calendar table, with multi-select filters over it.
 *
 * A client component because the filtering is instant and local: the
 * page already fetches every upcoming card, so re-asking the server to
 * narrow a list of a dozen rows would be slower and would lose the
 * scroll position for nothing.
 *
 * Chips rather than dropdowns. At this size every option fits on screen,
 * which means the filter doubles as a summary — you can see there are
 * four cards in October without opening anything, and multi-select in a
 * native <select> is genuinely awkward on a phone.
 *
 * Counts are computed against the whole list, not the filtered one, so
 * a chip never reads "0" because of a selection you have already made
 * and can still see.
 */

type Props = {
  mailings: UpcomingMailing[];
  descriptions: Record<string, string>;
};

const STATUS_LABEL: Record<UpcomingMailing["status"], string> = {
  open: "Open",
  "almost-full": "Almost full",
  planned: "Planned",
  waitlist: "Waitlist",
  full: "Full",
};

/** Fixed order, most bookable first — not the order the data happens to arrive in. */
const STATUS_ORDER: UpcomingMailing["status"][] = [
  "open",
  "almost-full",
  "planned",
  "waitlist",
  "full",
];

const chipFor = (status: string, left: number) => {
  if (status === "waitlist") return <StatusChip tone="info">Waitlist</StatusChip>;
  if (status === "full") return <StatusChip tone="danger">Full</StatusChip>;
  if (status === "planned") return <StatusChip tone="info">Planned</StatusChip>;
  if (left <= 2) return <StatusChip tone="warn">{left} left</StatusChip>;
  return <StatusChip tone="ok">Open</StatusChip>;
};

const toggle = (set: Set<string>, value: string) => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
};

function FacetGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string; count: number }[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  if (options.length < 2) return null;
  return (
    <div className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              aria-pressed={on}
              className={`text-[13px] rounded-full border px-3 py-1.5 transition-colors ${
                on
                  ? "bg-navy-950 border-navy-950 text-white font-semibold"
                  : "bg-white border-line text-body hover:border-navy-950"
              }`}
            >
              {o.label}
              <span
                className={`num ml-1.5 text-[11.5px] ${on ? "text-white/70" : "text-muted"}`}
              >
                {o.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MailingFilter({ mailings, descriptions }: Props) {
  const [areas, setAreas] = useState<Set<string>>(new Set());
  const [months, setMonths] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Set<string>>(new Set());

  const facets = useMemo(() => {
    const count = (pick: (m: UpcomingMailing) => string) => {
      const map = new Map<string, number>();
      for (const m of mailings) map.set(pick(m), (map.get(pick(m)) ?? 0) + 1);
      return map;
    };
    const areaCounts = count((m) => m.zoneName);
    const monthCounts = count((m) => m.mailMonth);
    const statusCounts = count((m) => m.status);

    return {
      // Alphabetical: there are enough zones that scanning beats
      // whatever order the pipeline returned them in.
      areas: [...areaCounts.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([value, c]) => ({ value, label: value, count: c })),
      /* First-appearance order, deliberately not sorted. The month is a
         string like "September 2026" or "Winter 2026", so sorting it
         alphabetically puts December before September and has nowhere
         to put a season at all. The source list is already
         chronological. */
      months: [...monthCounts.entries()].map(([value, c]) => ({
        value,
        label: value,
        count: c,
      })),
      statuses: STATUS_ORDER.filter((s) => statusCounts.has(s)).map((s) => ({
        value: s,
        label: STATUS_LABEL[s],
        count: statusCounts.get(s) ?? 0,
      })),
    };
  }, [mailings]);

  const visible = useMemo(
    () =>
      mailings.filter(
        (m) =>
          (areas.size === 0 || areas.has(m.zoneName)) &&
          (months.size === 0 || months.has(m.mailMonth)) &&
          (statuses.size === 0 || statuses.has(m.status)),
      ),
    [mailings, areas, months, statuses],
  );

  const active = areas.size + months.size + statuses.size;
  const clearAll = () => {
    setAreas(new Set());
    setMonths(new Set());
    setStatuses(new Set());
  };

  return (
    <>
      <div className="border border-line rounded-(--radius-card) bg-surface p-5 mb-4 grid gap-4">
        <FacetGroup
          label="Area"
          options={facets.areas}
          selected={areas}
          onToggle={(v) => setAreas((s) => toggle(s, v))}
        />
        <FacetGroup
          label="Mails"
          options={facets.months}
          selected={months}
          onToggle={(v) => setMonths((s) => toggle(s, v))}
        />
        <FacetGroup
          label="Availability"
          options={facets.statuses}
          selected={statuses}
          onToggle={(v) => setStatuses((s) => toggle(s, v))}
        />

        <div
          className="flex items-center gap-3 flex-wrap"
          role="status"
          aria-live="polite"
        >
          <span className="text-[13px] text-body">
            Showing <strong className="text-ink num">{visible.length}</strong>{" "}
            of <span className="num">{mailings.length}</span>{" "}
            {mailings.length === 1 ? "card" : "cards"}
          </span>
          {active > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[13px] font-semibold text-brand-deep hover:underline"
            >
              Clear {active === 1 ? "filter" : "all filters"}
            </button>
          )}
        </div>
      </div>

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
