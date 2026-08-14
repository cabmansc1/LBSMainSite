"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

  /**
   * Whether a card survives every facet except one.
   *
   * The exception is what makes the counts honest. A facet's options
   * are counted against the results the *other* facets allow, so
   * picking Daniel Island immediately narrows the month counts to
   * Daniel Island's months. Counting a facet against its own selection
   * instead would drive every unpicked option in it to zero the moment
   * you picked one, which is why this reads "except".
   */
  const survives = useCallback(
    (m: UpcomingMailing, except: "areas" | "months" | "statuses" | null) =>
      (except === "areas" || areas.size === 0 || areas.has(m.zoneSlug)) &&
      (except === "months" || months.size === 0 || months.has(m.mailMonth)) &&
      (except === "statuses" || statuses.size === 0 || statuses.has(m.status)),
    [areas, months, statuses],
  );

  const facets = useMemo(() => {
    const tally = <T,>(
      pick: (m: UpcomingMailing) => T,
      except: "areas" | "months" | "statuses",
    ) => {
      const map = new Map<T, number>();
      for (const m of mailings) {
        if (!survives(m, except)) continue;
        map.set(pick(m), (map.get(pick(m)) ?? 0) + 1);
      }
      return map;
    };
    /* The vocabulary comes from every card, the counts from the
       cross-filtered set. Options that drop to zero stay on screen and
       go dead rather than disappearing: chips vanishing and the rows
       reflowing under the cursor is worse than a greyed-out one that
       explains itself. */
    const allAreas = new Map<string, string>();
    const allMonths: string[] = [];
    const allStatuses = new Set<UpcomingMailing["status"]>();
    for (const m of mailings) {
      allAreas.set(m.zoneSlug, m.zoneName);
      if (!allMonths.includes(m.mailMonth)) allMonths.push(m.mailMonth);
      allStatuses.add(m.status);
    }
    const areaCounts = tally((m) => m.zoneSlug, "areas");
    const monthCounts = tally((m) => m.mailMonth, "months");
    const statusCounts = tally((m) => m.status, "statuses");

    return {
      areas: [...allAreas.entries()]
        .map(([value, label]) => ({
          value,
          label,
          count: areaCounts.get(value) ?? 0,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      /* First-appearance order, deliberately not sorted. The month is a
         display string like "September 2026" or "Winter 2026", so
         sorting puts December before September and cannot place a
         season at all. The source list is chronological. */
      months: allMonths.map((value) => ({
        value,
        label: value,
        count: monthCounts.get(value) ?? 0,
      })),
      statuses: STATUS_ORDER.filter((s) => allStatuses.has(s)).map((s) => ({
        value: s,
        label: STATUS_LABEL[s],
        count: statusCounts.get(s) ?? 0,
      })),
    };
  }, [mailings, survives]);

  const visible = useMemo(
    () => mailings.filter((m) => survives(m, null)),
    [mailings, survives],
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

/**
 * One extra choice mirrored to the URL, for things that are not facets.
 *
 * Separate from useMailingFilter because the coverage map has no view
 * toggle and should not carry the concept. Both effects read
 * window.location.search at the moment they run and touch only their
 * own keys, so they compose rather than clobbering each other.
 *
 * The default is omitted from the query string rather than written out,
 * so an unfiltered page keeps a clean address and only a deliberate
 * choice shows up in a link.
 *
 * The value is validated against the allowed list: a URL is something
 * anybody can type, and ?view=nonsense should land on the default
 * rather than render neither view.
 */
export function useUrlChoice<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
) {
  const sp = useSearchParams();
  const [value, setValue] = useState<T>(() => {
    const raw = sp.get(key) as T | null;
    return raw && allowed.includes(raw) ? raw : fallback;
  });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (value === fallback) q.delete(key);
    else q.set(key, value);
    const qs = q.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [key, value, fallback]);

  return [value, setValue] as const;
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
    <div className="grid gap-1.5">
      <span
        className={`text-[11px] font-semibold uppercase tracking-wider ${
          tone === "dark" ? "text-[#93A5B8]" : "text-muted"
        }`}
      >
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {/* Zero means the other facets have ruled it out, so it goes
            rather than greying out — the row is shorter for it, which
            is the point. A selected chip stays whatever its count, or
            the only way out of an empty result would be Clear all. */}
        {options
          .filter((o) => o.count > 0 || selected.has(o.value))
          .map((o) => {
          const on = selected.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              aria-pressed={on}
              className={`text-[12px] rounded-full border px-2.5 py-1 transition-colors ${
                on ? CHIP[tone].on : CHIP[tone].off
              }`}
            >
              {o.label}
              <span
                className={`num ml-1 text-[10.5px] ${
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

  /* Collapsed by default, because ten area chips wrap to two rows and
     the panel was 282px of chrome above the thing people came to read.
     Open when something is already selected, so a link somebody was
     sent shows what was filtered rather than a count they have to
     expand a panel to explain. */
  const [open, setOpen] = useState(activeCount > 0);

  const dark = tone === "dark";

  return (
    <div
      className={
        dark
          ? "border border-white/12 bg-white/4 rounded-2xl px-4 py-3 mb-3.5"
          : "border border-line rounded-(--radius-card) bg-surface px-4 py-3 mb-4"
      }
    >
      {/* Always visible: the toggle, how many cards are showing, and the
          way out. The count is the one thing worth keeping on screen
          when the chips are away — a filtered list that does not say it
          is filtered reads as a short list. */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold rounded-full border px-3 py-1.5 transition-colors ${
            dark
              ? "border-white/25 text-white hover:border-white/60"
              : "border-line bg-white text-ink hover:border-navy-950"
          }`}
        >
          Filters
          {activeCount > 0 && (
            <span
              className={`num text-[11px] rounded-full px-1.5 ${
                dark ? "bg-white text-navy-950" : "bg-navy-950 text-white"
              }`}
            >
              {activeCount}
            </span>
          )}
          <span aria-hidden className={dark ? "text-[#93A5B8]" : "text-muted"}>
            {open ? "\u2013" : "+"}
          </span>
        </button>

        <span
          className={`text-[12.5px] ${dark ? "text-[#C6D3E0]" : "text-body"}`}
          role="status"
          aria-live="polite"
        >
          Showing{" "}
          <strong className={dark ? "num text-white" : "num text-ink"}>
            {visible.length}
          </strong>{" "}
          of <span className="num">{total}</span>{" "}
          {total === 1 ? "card" : "cards"}
        </span>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className={`text-[12.5px] font-semibold hover:underline ${
              dark ? "text-brand" : "text-brand-deep"
            }`}
          >
            Clear {activeCount === 1 ? "filter" : "all filters"}
          </button>
        )}
      </div>

      {open && (
        <div
          className={`grid gap-3 mt-3 pt-3 border-t ${
            dark ? "border-white/12" : "border-line"
          }`}
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
        </div>
      )}
    </div>
  );
}
