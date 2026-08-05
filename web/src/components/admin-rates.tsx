"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PriceOverrides } from "@/lib/pricing-store";

/**
 * Agreed rates, one advertiser at a time.
 *
 * Laid out as the same reach-by-size grid the global pricing screen
 * uses, with the list price as each box's placeholder. Empty means "they
 * pay list", so a rate is only ever the cells actually negotiated and
 * nobody has to retype the whole table to change one number.
 */

export type RateRow = {
  email: string;
  overrides: PriceOverrides;
  note: string;
  active: boolean;
};

type Cell = { reach: string; size: string; label: string; listCents: number };

const dollars = (cents: number) => (cents / 100).toFixed(0);

export function AdminRates({
  rates,
  cells,
}: {
  rates: RateRow[];
  /** Every reach and size with what it normally costs. */
  cells: Cell[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<RateRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reaches = [...new Set(cells.map((c) => c.reach))];
  const sizes = [...new Set(cells.map((c) => c.size))];
  const listFor = (reach: string, size: string) =>
    cells.find((c) => c.reach === reach && c.size === size)?.listCents ?? 0;
  const labelFor = (size: string) =>
    cells.find((c) => c.size === size)?.label ?? size;

  const value = (r: RateRow, reach: string, size: string) => {
    const cents = (r.overrides as Record<string, Record<string, number>>)[reach]?.[size];
    return typeof cents === "number" ? dollars(cents) : "";
  };

  function setCell(reach: string, size: string, raw: string) {
    if (!editing) return;
    const next = structuredClone(editing.overrides) as Record<
      string,
      Record<string, number>
    >;
    const dollarsIn = Number(raw);
    if (!raw.trim() || !Number.isFinite(dollarsIn) || dollarsIn <= 0) {
      // Cleared means "back to list price", which is a delete rather
      // than a zero: a stored zero would read as free.
      delete next[reach]?.[size];
      if (next[reach] && Object.keys(next[reach]).length === 0) delete next[reach];
    } else {
      next[reach] ??= {};
      next[reach][size] = Math.round(dollarsIn * 100);
    }
    setEditing({ ...editing, overrides: next as PriceOverrides });
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(email: string) {
    if (!window.confirm(`Put ${email} back on list price?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/rates?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      {rates.length === 0 && (
        <p className="text-[13px] text-muted border border-line rounded-(--radius-card) bg-white px-4 py-5">
          Nobody is on an agreed rate. Everybody pays the prices set under
          Pricing.
        </p>
      )}

      {rates.map((r) => (
        <div
          key={r.email}
          className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-2"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <b className="text-[14px]">{r.email}</b>
              {!r.active && (
                <span className="ml-2 text-[11.5px] font-semibold text-muted">
                  paused, paying list
                </span>
              )}
              {r.note && (
                <div className="text-[12.5px] text-muted">{r.note}</div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditing(r)}
                className="text-[12.5px] font-semibold text-brand-deep hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(r.email)}
                className="text-[12.5px] font-semibold text-danger hover:underline disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
            {reaches.flatMap((reach) =>
              sizes
                .filter(
                  (size) =>
                    typeof (r.overrides as Record<string, Record<string, number>>)[
                      reach
                    ]?.[size] === "number",
                )
                .map((size) => {
                  const cents = (
                    r.overrides as Record<string, Record<string, number>>
                  )[reach][size];
                  const list = listFor(reach, size);
                  return (
                    <span key={`${reach}-${size}`} className="num">
                      <b>{labelFor(size)}</b> {reach}: ${dollars(cents)}
                      {list > cents && (
                        <span className="text-muted line-through ml-1">
                          ${dollars(list)}
                        </span>
                      )}
                    </span>
                  );
                }),
            )}
          </div>
        </div>
      ))}

      {!editing && (
        <div>
          <button
            type="button"
            onClick={() =>
              setEditing({ email: "", overrides: {}, note: "", active: true })
            }
            className="bg-navy-950 text-white text-[13.5px] font-semibold px-4 py-2.5 rounded-[10px] hover:bg-navy-800"
          >
            Add an agreed rate
          </button>
        </div>
      )}

      {editing && (
        <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3.5">
          <b className="text-[15px]">
            {editing.email ? `Rate for ${editing.email}` : "Add an agreed rate"}
          </b>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                Their sign-in email
              </span>
              <input
                value={editing.email}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                placeholder="owner@business.com"
                className="w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                Note
              </span>
              <input
                value={editing.note}
                onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                placeholder="Why they are on this rate"
                className="w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
              />
            </label>
          </div>
          <p className="text-[12px] text-muted -mt-1">
            It has to be the address they sign in with. The rate is applied
            from their session, so a purchase made signed out pays list.
          </p>

          <div className="overflow-x-auto">
            <table className="text-sm border-collapse min-w-[420px]">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Spot
                  </th>
                  {reaches.map((reach) => (
                    <th
                      key={reach}
                      className="px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted"
                    >
                      {reach}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizes.map((size) => (
                  <tr key={size} className="border-t border-line">
                    <td className="px-3 py-2 text-[13.5px]">{labelFor(size)}</td>
                    {reaches.map((reach) => (
                      <td key={reach} className="px-3 py-2">
                        <input
                          inputMode="numeric"
                          value={value(editing, reach, size)}
                          onChange={(e) => setCell(reach, size, e.target.value)}
                          placeholder={`${dollars(listFor(reach, size))}`}
                          className="w-24 text-[13.5px] px-2.5 py-1.5 border border-line-strong rounded-[8px] bg-white focus:outline-none focus:border-navy-950 num"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-muted -mt-1">
            Whole dollars. The faint number is what everybody else pays; leave
            a box empty and they pay that.
          </p>

          <label className="flex items-center gap-2 text-[13.5px]">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
            />
            Rate is in force
          </label>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={save}
              disabled={busy || !editing.email.trim()}
              className="bg-cta text-navy-950 text-[14px] font-bold px-5 py-2.5 rounded-(--radius-btn) hover:bg-[#FFA033] disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setError("");
              }}
              className="text-[13px] font-semibold text-muted hover:text-navy-950"
            >
              Cancel
            </button>
            {error && (
              <span className="text-[13px] font-semibold text-danger">{error}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
