"use client";

import { useState } from "react";
import type { SpotSize } from "@/lib/pricing";

type SizeKey = SpotSize;

type Row = { reach: "5k" | "10k"; size: SizeKey; label: string; dollars: string };

export function AdminPricing({
  initial,
}: {
  initial: { reach: "5k" | "10k"; size: SizeKey; label: string; cents: number }[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initial.map((r) => ({ ...r, dollars: String(r.cents / 100) })),
  );
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save() {
    setState("saving");
    setMessage("");
    const overrides: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const dollars = Number(r.dollars);
      if (!isFinite(dollars) || dollars < 0) {
        setState("error");
        setMessage(`Enter a valid price for ${r.reach} ${r.size}`);
        return;
      }
      overrides[r.reach] ??= {};
      // Zero is meaningful: it takes the size off sale at that reach.
      overrides[r.reach][r.size] = Math.round(dollars * 100);
    }
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "pricing", overrides }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setState("saved");
        setMessage("Prices updated across the site.");
      } else {
        setState("error");
        setMessage(j.error ?? "Save failed");
      }
    } catch {
      setState("error");
      setMessage("Save failed");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[520px]">
          <thead>
            <tr>
              {["Reach", "Ad size", "Price (USD)", "Per home"].map((h) => (
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
            {rows.map((r, i) => {
              const homes = r.reach === "5k" ? 5000 : 10000;
              const cents = Number(r.dollars) * 100;
              return (
                <tr key={`${r.reach}-${r.size}`} className="hover:bg-surface">
                  <td className="px-4 py-3 border-b border-line font-semibold num">
                    {r.reach === "5k" ? "5,000" : "10,000"} homes
                  </td>
                  <td className="px-4 py-3 border-b border-line capitalize">
                    {r.size} <span className="text-muted">({r.label})</span>
                  </td>
                  <td className="px-4 py-3 border-b border-line">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted">$</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={r.dollars}
                        onChange={(e) => {
                          const next = [...rows];
                          next[i] = { ...r, dollars: e.target.value };
                          setRows(next);
                        }}
                        className="w-28 text-sm px-3 py-2 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950 num"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-line text-muted num">
                    {isFinite(cents) && cents > 0
                      ? `${(cents / homes).toFixed(1)}¢`
                      : "not sold"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={save}
          disabled={state === "saving"}
          className="bg-cta text-navy-950 text-[14px] font-bold px-5 py-2.5 rounded-(--radius-btn) hover:bg-[#FFA033] disabled:opacity-60"
        >
          {state === "saving" ? "Saving..." : "Save pricing"}
        </button>
        {message && (
          <span
            className={`text-[13px] font-semibold ${
              state === "error" ? "text-[#a33]" : "text-ok"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
