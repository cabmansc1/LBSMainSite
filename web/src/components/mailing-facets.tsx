"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { COMMON_CATEGORIES, categoryKey } from "@/lib/categories";
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

const PARAMS = {
  areas: "area",
  months: "month",
  statuses: "status",
  categories: "category",
} as const;

type FacetName = keyof typeof PARAMS;

/**
 * Whether this card still has room for a given trade.
 *
 * The category facet is the one that reads backwards. Area, month and
 * status ask "is the card this?"; category asks "could I buy it?" — so
 * a match is the category being *absent* from the card's locked list.
 * Filtering to cards that already have a plumber would be the exact
 * opposite of what somebody clicking Plumbing wants.
 *
 * Undefined takenCategories means Mission Control could not be asked,
 * not that the card is empty, so an unknown card is never filtered out.
 * That is deliberate on a browse page — hiding a card we simply could
 * not check would lose a real sale — and it is safe because it is only
 * ever a browse: checkout re-asks and refuses rather than guessing.
 */
const categoryOpen = (m: UpcomingMailing, category: string) =>
  !m.takenCategories ||
  !m.takenCategories.some((t) => categoryKey(t) === categoryKey(category));

const readParam = (sp: URLSearchParams | ReadonlyURLSearchParamsLike, key: string) => {
  const raw = sp.get(key);
  return new Set(raw ? raw.split(",").filter(Boolean) : []);
};

type ReadonlyURLSearchParamsLike = { get(name: string): string | null };

/**
 * @param categoryOptions Mission Control's full vocabulary, which runs
 *   to a couple of hundred trades. Passed in rather than derived from
 *   the cards, because the categories nobody has bought are exactly the
 *   ones a browser most wants to hear are free, and deriving would drop
 *   every one of them. Empty falls back to the common handful.
 */
export function useMailingFilter(
  mailings: UpcomingMailing[],
  categoryOptions: string[] = [],
) {
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
  const [categories, setCategories] = useState<Set<string>>(() =>
    readParam(sp, PARAMS.categories),
  );

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    for (const [key, param] of [
      [areas, PARAMS.areas],
      [months, PARAMS.months],
      [statuses, PARAMS.statuses],
      [categories, PARAMS.categories],
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
  }, [areas, months, statuses, categories]);

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
    (m: UpcomingMailing, except: FacetName | null) =>
      (except === "areas" || areas.size === 0 || areas.has(m.zoneSlug)) &&
      (except === "months" || months.size === 0 || months.has(m.mailMonth)) &&
      (except === "statuses" || statuses.size === 0 || statuses.has(m.status)) &&
      /* OR within the facet, like the others: picking Plumbing and
         Roofing shows the cards where either could still buy, not the
         cards where both could. A business has one trade, so two picked
         chips are somebody unsure which of two names theirs goes by. */
      (except === "categories" ||
        categories.size === 0 ||
        [...categories].some((c) => categoryOpen(m, c))),
    [areas, months, statuses, categories],
  );

  const facets = useMemo(() => {
    const tally = <T,>(pick: (m: UpcomingMailing) => T, except: FacetName) => {
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

    /* Mission Control's vocabulary, plus anything actually locked on a
       card in case MC's list and its cards disagree, deduped case-
       insensitively so a hand-typed "real estate" does not sit next to
       "Real Estate". The common handful stands in only when MC gave us
       nothing. */
    const allCategories = new Map<string, string>();
    for (const name of categoryOptions.length ? categoryOptions : COMMON_CATEGORIES) {
      const key = categoryKey(name);
      if (key) allCategories.set(key, name.trim());
    }
    for (const m of mailings) {
      for (const t of m.takenCategories ?? []) {
        const key = categoryKey(t);
        if (key && !allCategories.has(key)) allCategories.set(key, t.trim());
      }
    }
    /* Counted as "cards where this is still open", which is what the
       row promises. Not tally(), because a card contributes to many
       categories at once rather than falling into one bucket. */
    const categoryCounts = new Map<string, number>();
    for (const m of mailings) {
      if (!survives(m, "categories")) continue;
      for (const [key, name] of allCategories) {
        if (categoryOpen(m, name)) {
          categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
        }
      }
    }

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
      categories: [...allCategories.entries()]
        .map(([key, label]) => ({
          value: label,
          label,
          count: categoryCounts.get(key) ?? 0,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    };
  }, [mailings, survives, categoryOptions]);

  /**
   * Whether any card could tell us what it has locked.
   *
   * With Mission Control unreachable every card comes back unknown, and
   * a category filter over unknowns is a control that answers every
   * question with "yes, available" — the one answer that costs a
   * refund. Better to not offer it than to offer it wrong, so the whole
   * group disappears until at least one card knows its own answer.
   */
  const categoriesKnown = useMemo(
    () => mailings.some((m) => !!m.takenCategories),
    [mailings],
  );

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
    categoriesKnown,
    selected: { areas, months, statuses, categories },
    onToggle: {
      areas: (v: string) => setAreas((s) => toggle(s, v)),
      months: (v: string) => setMonths((s) => toggle(s, v)),
      statuses: (v: string) => setStatuses((s) => toggle(s, v)),
      categories: (v: string) => setCategories((s) => toggle(s, v)),
    },
    activeCount: areas.size + months.size + statuses.size + categories.size,
    clearAll: () => {
      setAreas(new Set());
      setMonths(new Set());
      setStatuses(new Set());
      setCategories(new Set());
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

/** How many matches the list shows before asking for a narrower search. */
const MAX_SUGGESTIONS = 8;

/**
 * Type-ahead for the category facet.
 *
 * The other three facets are chips because they have five to ten
 * options each. Mission Control's category vocabulary runs past a
 * hundred and eighty, and a hundred and eighty chips is not a filter —
 * it is a wall, and it would be taller than the schedule underneath it.
 * So this one is a search box: you type your trade, you pick it, it
 * becomes a chip like everything else.
 *
 * Matching is substring rather than prefix, because somebody typing
 * "clean" should find "Commercial Cleaning" — the useful word in a
 * two-word trade is as often the second as the first.
 *
 * A match that is taken on every visible card is still listed, greyed
 * and unselectable, with the reason next to it. That is the answer
 * somebody came for and it is worth a dead row: leaving it out reads as
 * though we do not sell to roofers at all.
 */
function CategorySearch({
  options,
  selected,
  onToggle,
  tone,
}: {
  options: FacetOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  tone: Tone;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const dark = tone === "dark";

  const matches = useMemo(() => {
    const q = categoryKey(query);
    if (!q) return [];
    return options
      .filter((o) => !selected.has(o.value) && categoryKey(o.label).includes(q))
      /* Relevance, in the order a person means it. An exact hit first,
         then names that start with what was typed — "car" should offer
         "Carpet Cleaning" before "Childcare" — then the shortest, so
         typing "plumb" leads with "Plumbing" rather than "Plumbing
         Services". Only after all that does availability break a tie. */
      .sort((a, b) => {
        const rank = (label: string) => {
          const k = categoryKey(label);
          return k === q ? 0 : k.startsWith(q) ? 1 : 2;
        };
        return (
          rank(a.label) - rank(b.label) ||
          a.label.length - b.label.length ||
          b.count - a.count ||
          a.label.localeCompare(b.label)
        );
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [options, selected, query]);

  const choose = (o: FacetOption) => {
    if (o.count === 0) return;
    onToggle(o.value);
    setQuery("");
    setActive(0);
  };

  const chosen = options.filter((o) => selected.has(o.value));

  return (
    <div className="grid gap-1.5">
      <label
        htmlFor="cat-search"
        className={`text-[11px] font-semibold uppercase tracking-wider ${
          dark ? "text-[#93A5B8]" : "text-muted"
        }`}
      >
        Your category
        <span
          className={`ml-1.5 font-medium normal-case tracking-normal ${
            dark ? "text-[#7C8FA3]" : "text-muted"
          }`}
        >
          shows the cards it is still open on
        </span>
      </label>

      <div className="relative max-w-[320px]">
        <input
          id="cat-search"
          type="text"
          role="combobox"
          aria-expanded={matches.length > 0}
          aria-controls="cat-suggestions"
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          /* The real number, not a round one. Mission Control's
             vocabulary grows and shrinks, and a hardcoded "180+" turns
             into a claim that is quietly wrong the day it changes. */
          placeholder={`Search ${options.length} categories…`}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && matches[active]) {
              e.preventDefault();
              choose(matches[active]);
            } else if (e.key === "Escape") {
              setQuery("");
            }
          }}
          className={`w-full text-[12.5px] rounded-full border px-3 py-1.5 outline-none transition-colors ${
            dark
              ? "bg-white/8 border-white/25 text-white placeholder:text-[#7C8FA3] focus:border-white/60"
              : "bg-white border-line text-ink placeholder:text-muted focus:border-navy-950"
          }`}
        />

        {query && (
          <ul
            id="cat-suggestions"
            role="listbox"
            className={`absolute z-20 mt-1 w-full max-h-[264px] overflow-y-auto rounded-xl border shadow-lg ${
              dark ? "bg-navy-950 border-white/20" : "bg-white border-line"
            }`}
          >
            {matches.length === 0 && (
              <li
                className={`text-[12.5px] px-3 py-2 ${
                  dark ? "text-[#93A5B8]" : "text-muted"
                }`}
              >
                No category matches “{query}”.
              </li>
            )}
            {matches.map((o, i) => {
              const dead = o.count === 0;
              return (
                <li key={o.value} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    disabled={dead}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o)}
                    className={`w-full text-left text-[12.5px] px-3 py-2 flex items-baseline justify-between gap-3 ${
                      dead
                        ? dark
                          ? "text-[#6B7C8E] cursor-default"
                          : "text-muted cursor-default"
                        : i === active
                          ? dark
                            ? "bg-white/12 text-white"
                            : "bg-surface text-ink"
                          : dark
                            ? "text-[#C6D3E0]"
                            : "text-body"
                    }`}
                  >
                    <span className={dead ? "line-through" : undefined}>{o.label}</span>
                    <span
                      className={`num text-[11px] shrink-0 ${
                        dark ? "text-[#93A5B8]" : "text-muted"
                      }`}
                    >
                      {dead ? "taken on all" : `${o.count} open`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {chosen.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              aria-label={`Remove ${o.label}`}
              className={`text-[12px] rounded-full border px-2.5 py-1 transition-colors ${CHIP[tone].on}`}
            >
              {o.label}
              <span
                className={`num ml-1 text-[10.5px] ${
                  dark ? "text-navy-950/60" : "text-white/70"
                }`}
              >
                {o.count}
              </span>
              <span aria-hidden className="ml-1.5 opacity-60">
                ×
              </span>
            </button>
          ))}
        </div>
      )}
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
  const { facets, selected, onToggle, visible, activeCount, clearAll, categoriesKnown } =
    filter;

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
          {/* Last, because it is the one that needs a sentence to read
              right, and because the three above are the ones somebody
              reaches for first. Only rendered when the schedule
              actually knows what it has sold. */}
          {categoriesKnown && (
            <CategorySearch
              options={facets.categories}
              selected={selected.categories}
              onToggle={onToggle.categories}
              tone={tone}
            />
          )}
        </div>
      )}
    </div>
  );
}
