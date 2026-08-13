"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { UpcomingMailing } from "@/lib/mailings";

/**
 * Shared filtering for the upcoming cards, used by the calendar table
 * and the coverage map grid.
 *
 * The two pages show the same cards in different clothes — a white
 * table and a navy grid — so the chips take a tone rather than the
 * grid getting its own copy of the logic to drift out of sync.
 *
 * Selections live in React state and are mirrored into the query
 * string, rather than the query string being the state. Both pages are
 * force-dynamic, so routing a change through the router would re-run
 * the server component on every chip click: a round trip, a flash, and
 * a lost scroll position, to narrow a list already sitting in memory.
 * history.replaceState updates the address bar without telling Next
 * anything happened, which keeps filtering instant and still makes the
 * result a link somebody can send.
 *
 * replaceState, not pushState: eight chip clicks should not be eight
 * presses of the back button.
 */

export type Tone = "light" | "dark";

export type FacetOption = { value: string; label: string; count: number };

const STATUS_LABEL: Record<UpcomingMailing["status"], string> = {
  open: "Open",
  "almost-full": "Almost full",
  planned: "Planned",
  waitlist: "Waitlist",
  full: "Full",
};

/** Fixed order, most bookable first — not the order the data arrives in. */
const STATUS_ORDER: UpcomingMailing["status"][] = [
  "open",
  "almost-full",
  "planned",
  "waitlist",
  "full",
];

const PARAMS = { areas: "area", months: "month", statuses: "status" } as const;

const readParam = (sp: URLSearchParams | ReadonlyURLSearchParamsLike, key: string) => {
  const raw = sp.get(key);
  return new Set(raw ? raw.split(",").filter(Boolean) : []);
};

type ReadonlyURLSearchParamsLike = { get(name: string): string | null };

export function useMailingFilter(mailings: UpcomingMailing[]) {
  const sp = useSearchParams();

  // Read once, on the first render. After that the chips own the state
  // and write to the URL, so re-reading would fight with them.
  const [areas, setAreas] = useState<Set<string>>(() => readParam(sp, PARAMS.areas));
  const [months, setMonths] = useState<Set<string>>(() =>
    readParam(sp, PARAMS.months),
  );
  const [statuses, setStatuses] = useState<Set<string>>(() =>
    readParam(sp, PARAMS.statuses),
  );

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    for (const [key, param] of [
      [areas, PARAMS.areas],
      [months, PARAMS.months],
      [statuses, PARAMS.statuses],
    ] as const) {
      if (key.size) q.set(param, [...key].join(","));
      else q.delete(param);
    }
    const qs = q.toString();
    // Keep any other params the page arrived with, and leave a bare
    // path bare rather than trailing a lone "?".
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [areas, months, statuses]);

  const facets = useMemo(() => {
    const tally = <T,>(pick: (m: UpcomingMailing) => T) => {
      const map = new Map<T, number>();
      for (const m of mailings) map.set(pick(m), (map.get(pick(m)) ?? 0) + 1);
      return map;
    };
    // Keyed by slug so the URL reads /?area=goose-creek rather than a
    // percent-encoded display name; labelled by the name people know.
    const areaNames = new Map<string, string>();
    for (const m of mailings) areaNames.set(m.zoneSlug, m.zoneName);
    const areaCounts = tally((m) => m.zoneSlug);
    const monthCounts = tally((m) => m.mailMonth);
    const statusCounts = tally((m) => m.status);

    return {
      areas: [...areaCounts.entries()]
        .map(([value, count]) => ({
          value,
          label: areaNames.get(value) ?? value,
          count,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      /* First-appearance order, deliberately not sorted. The month is a
         string like "September 2026" or "Winter 2026", so sorting it
         alphabetically puts December before September and has nowhere
         at all to put a season. The source list is chronological. */
      months: [...monthCounts.entries()].map(([value, count]) => ({
        value,
        label: value,
        count,
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
          (areas.size === 0 || areas.has(m.zoneSlug)) &&
          (months.size === 0 || months.has(m.mailMonth)) &&
          (statuses.size === 0 || statuses.has(m.status)),
      ),
    [mailings, areas, months, statuses],
  );

  const toggle = (set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return {
    visible,
    facets,
    selected: { areas, months, statuses },
    onToggle: {
      areas: (v: string) => setAreas((s) => toggle(s, v)),
      months: (v: string) => setMonths((s) => toggle(s, v)),
      statuses: (v: string) => setStatuses((s) => toggle(s, v)),
    },
    activeCount: areas.size + months.size + statuses.size,
    clearAll: () => {
      setAreas(new Set());
      setMonths(new Set());
      setStatuses(new Set());
    },
  };
}

const CHIP: Record<Tone, { on: string; off: string }> = {
  light: {
    on: "bg-navy-950 border-navy-950 text-white font-semibold",
    off: "bg-white border-line text-body hover:border-navy-950",
  },
  dark: {
    on: "bg-white border-white text-navy-950 font-semibold",
    off: "border-white/25 text-[#C6D3E0] hover:border-white/60",
  },
};

function FacetGroup({
  label,
  options,
  selected,
  onToggle,
  tone,
}: {
  label: string;
  options: FacetOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  tone: Tone;
}) {
  // One option filters nothing, so it is a control that can only ever
  // mislead about how much is on the schedule.
  if (options.length < 2) return null;
  return (
    <div className="grid gap-2">
      <span
        className={`text-[11px] font-semibold uppercase tracking-wider ${
          tone === "dark" ? "text-[#93A5B8]" : "text-muted"
        }`}
      >
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
                on ? CHIP[tone].on : CHIP[tone].off
              }`}
            >
              {o.label}
              <span
                className={`num ml-1.5 text-[11.5px] ${
                  on
                    ? tone === "dark"
                      ? "text-navy-950/60"
                      : "text-white/70"
                    : tone === "dark"
                      ? "text-[#93A5B8]"
                      : "text-muted"
                }`}
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

export function MailingFacets({
  filter,
  total,
  tone,
}: {
  filter: ReturnType<typeof useMailingFilter>;
  total: number;
  tone: Tone;
}) {
  const { facets, selected, onToggle, visible, activeCount, clearAll } = filter;
  return (
    <div
      className={
        tone === "dark"
          ? "border border-white/12 bg-white/4 rounded-2xl p-5 mb-3.5 grid gap-4"
          : "border border-line rounded-(--radius-card) bg-surface p-5 mb-4 grid gap-4"
      }
    >
      <FacetGroup
        label="Area"
        options={facets.areas}
        selected={selected.areas}
        onToggle={onToggle.areas}
        tone={tone}
      />
      <FacetGroup
        label="Mails"
        options={facets.months}
        selected={selected.months}
        onToggle={onToggle.months}
        tone={tone}
      />
      <FacetGroup
        label="Availability"
        options={facets.statuses}
        selected={selected.statuses}
        onToggle={onToggle.statuses}
        tone={tone}
      />

      <div
        className="flex items-center gap-3 flex-wrap"
        role="status"
        aria-live="polite"
      >
        <span
          className={`text-[13px] ${tone === "dark" ? "text-[#C6D3E0]" : "text-body"}`}
        >
          Showing{" "}
          <strong className={tone === "dark" ? "num text-white" : "num text-ink"}>
            {visible.length}
          </strong>{" "}
          of <span className="num">{total}</span>{" "}
          {total === 1 ? "card" : "cards"}
        </span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className={`text-[13px] font-semibold hover:underline ${
              tone === "dark" ? "text-brand" : "text-brand-deep"
            }`}
          >
            Clear {activeCount === 1 ? "filter" : "all filters"}
          </button>
        )}
      </div>
    </div>
  );
}
