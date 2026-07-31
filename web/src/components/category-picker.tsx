"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * Searchable category picker for checkout.
 *
 * A native select was fine for a dozen categories. The taxonomy is
 * heading for roughly two hundred, at which point scrolling to find
 * "Retail - Jewelry" is the worst moment in the purchase. Typing three
 * letters is not.
 *
 * The taxonomy names categories "Family - Specific", so a plain
 * substring match already does most of the work: "auto" narrows to the
 * automotive family, "jewel" lands on one row. Matching is per word so
 * "auto detail" finds "Auto - Detailing" even though that exact string
 * never appears.
 *
 * Taken categories stay in the list rather than disappearing. A buyer
 * who cannot find their industry assumes the site is broken; a buyer who
 * sees it marked taken understands they are looking at the product.
 */
export function CategoryPicker({
  id,
  categories,
  value,
  onChange,
  isTaken,
  placeholder = "Search categories...",
}: {
  id?: string;
  categories: string[];
  value: string;
  onChange: (v: string) => void;
  isTaken: (c: string) => boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    // Every word typed has to appear somewhere in the name, so "auto
    // detail" and "detail auto" both find "Auto - Detailing".
    const words = q.split(/\s+/);
    const hit = categories.filter((c) => {
      const hay = c.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    // A name that starts with what was typed is almost always the one
    // meant, so float those up without disturbing the rest.
    return [
      ...hit.filter((c) => c.toLowerCase().startsWith(q)),
      ...hit.filter((c) => !c.toLowerCase().startsWith(q)),
    ];
  }, [categories, query]);

  // Reset the highlight whenever the visible list changes, or it points
  // at whatever row happens to be at that index now.
  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted row on screen during keyboard navigation.
  useEffect(() => {
    if (!open) return;
    list.current
      ?.querySelector(`[data-i="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (c: string) => {
    if (isTaken(c)) return;
    onChange(c);
    setQuery("");
    setOpen(false);
    input.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + matches.length) % Math.max(1, matches.length));
    } else if (e.key === "Enter") {
      if (open && matches[active]) {
        e.preventDefault();
        choose(matches[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrap} className="relative">
      <input
        id={id}
        ref={input}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={open ? query : value}
        placeholder={value && !open ? value : placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950"
      />

      {value && !open && (
        <button
          type="button"
          aria-label="Clear category"
          onClick={() => {
            onChange("");
            setQuery("");
            input.current?.focus();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-[17px] leading-none px-1"
        >
          ×
        </button>
      )}

      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-[280px] overflow-y-auto bg-white border border-line-strong rounded-lg shadow-[0_10px_30px_rgba(8,21,39,.13)]"
        >
          {matches.length === 0 && (
            <li className="px-3.5 py-3 text-[13.5px] text-muted">
              Nothing matches “{query}”. Try a shorter word, or the trade
              rather than the business name.
            </li>
          )}
          {matches.map((c, i) => {
            const taken = isTaken(c);
            return (
              <li
                key={c}
                id={`${listId}-${i}`}
                data-i={i}
                role="option"
                aria-selected={c === value}
                aria-disabled={taken}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  // mousedown, not click: the input's blur would close
                  // the list before a click ever landed.
                  e.preventDefault();
                  choose(c);
                }}
                className={`px-3.5 py-2 text-[14px] flex items-center justify-between gap-3 ${
                  taken
                    ? "text-faint cursor-not-allowed"
                    : `cursor-pointer ${i === active ? "bg-brand-tint text-brand-deep" : ""}`
                }`}
              >
                <span className={c === value ? "font-semibold" : ""}>{c}</span>
                {taken && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider shrink-0">
                    Taken
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
