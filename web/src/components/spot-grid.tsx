"use client";

import { useMemo, useState } from "react";
import type { NeighborhoodCard, CardPosition } from "@/lib/cards";
import { formatPrice } from "@/lib/pricing";

/**
 * Visual spot picker: the buyer clicks the literal position their ad
 * occupies on the printed card, exactly like the legacy flow. Taken
 * positions show who holds them; category exclusivity is enforced at
 * checkout with a row lock, this UI just surfaces it early.
 */
export function SpotGrid({
  card,
  categories,
}: {
  card: NeighborhoodCard;
  categories: string[];
}) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [selected, setSelected] = useState<CardPosition | null>(null);
  const [category, setCategory] = useState("");
  const [business, setBusiness] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");

  const positions = useMemo(
    () => card.positions.filter((p) => p.side === side),
    [card.positions, side],
  );

  const price = selected
    ? card.spotTypes.find((t) => t.key === selected.spotType)?.priceCents ?? 0
    : 0;
  const categoryTaken = category !== "" && card.takenCategories.includes(category);
  const ready =
    selected && business.trim().length > 1 && category !== "" && !categoryTaken;

  async function checkout() {
    if (!ready || !selected) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "neighborhood-card",
          cardSlug: card.slug,
          positionId: selected.id,
          spotType: selected.spotType,
          businessName: business.trim(),
          category,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-5 items-start">
      <div className="bg-white border border-line rounded-(--radius-card) p-5">
        <div className="flex gap-2 mb-4">
          {(["front", "back"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setSide(s);
                setSelected(null);
              }}
              className={`text-[13px] font-semibold px-4 py-2 rounded-lg border transition-colors ${
                side === s
                  ? "bg-navy-950 text-white border-navy-950"
                  : "bg-white text-body border-line-strong hover:border-faint"
              }`}
            >
              Card {s}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 bg-surface border border-line rounded-[10px] p-3">
          {positions.map((p) => {
            const taken = !!p.takenBy;
            const sel = selected?.id === p.id;
            const type = card.spotTypes.find((t) => t.key === p.spotType);
            return (
              <button
                key={p.id}
                disabled={taken}
                onClick={() => setSelected(sel ? null : p)}
                style={{
                  gridColumn: `span ${p.colSpan}`,
                  minHeight: p.rowSpan > 1 ? "132px" : "64px",
                }}
                className={`rounded-lg border text-left px-3 py-2.5 transition-colors ${
                  taken
                    ? "bg-line/50 border-line text-faint cursor-not-allowed"
                    : sel
                      ? "bg-brand-tint border-navy-950 border-[1.5px]"
                      : "bg-white border-line-strong hover:border-faint"
                }`}
                aria-pressed={sel}
              >
                <span className="block text-[12.5px] font-bold">
                  {type?.name} · <span className="num">{formatPrice(type?.priceCents ?? 0)}</span>
                </span>
                <span className="block text-[11px] text-muted">
                  {taken ? p.takenBy : type?.dims}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11.5px] text-muted mt-3">
          Grayed spots are sold. Positions shown match the printed layout.
        </p>
      </div>

      <aside className="bg-white border border-line rounded-(--radius-card) p-6.5 grid gap-4 content-start lg:sticky lg:top-5">
        <h2 className="text-[17px] font-semibold tracking-tight">Your reservation</h2>
        <div>
          <label htmlFor="ng-biz" className="text-[12.5px] font-semibold text-body block mb-1.5">
            Business name
          </label>
          <input
            id="ng-biz"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            maxLength={128}
            className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950"
          />
        </div>
        <div>
          <label htmlFor="ng-cat" className="text-[12.5px] font-semibold text-body block mb-1.5">
            Industry category
          </label>
          <select
            id="ng-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950"
          >
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c} value={c} disabled={card.takenCategories.includes(c)}>
                {c}
                {card.takenCategories.includes(c) ? " (taken on this card)" : ""}
              </option>
            ))}
          </select>
          {categoryTaken && (
            <p className="text-[12.5px] text-danger mt-1.5">
              That category is already exclusive on this card.
            </p>
          )}
        </div>
        <dl className="grid gap-2 text-sm border-t border-line pt-4">
          <div className="flex justify-between">
            <dt className="text-muted">Card</dt>
            <dd className="font-semibold">{card.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Spot</dt>
            <dd className="font-semibold">
              {selected
                ? card.spotTypes.find((t) => t.key === selected.spotType)?.name
                : "Pick one on the card"}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line-strong pt-2.5 text-base">
            <dt className="font-bold">Due today</dt>
            <dd className="font-bold num">{selected ? formatPrice(price) : "$0"}</dd>
          </div>
        </dl>
        <button
          onClick={checkout}
          disabled={!ready || status === "sending"}
          className="bg-cta text-navy-950 font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "sending" ? "Starting checkout..." : "Continue to secure payment"}
        </button>
        {status === "error" && (
          <p className="text-sm text-danger">
            Could not start checkout. Please try again.
          </p>
        )}
        <p className="text-xs text-muted text-center">
          Payments by Stripe. Your category locks when you pay.
        </p>
      </aside>
    </div>
  );
}
