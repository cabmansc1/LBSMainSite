"use client";

import { useState } from "react";

/**
 * What a Premium directory listing costs.
 *
 * Separate from the postcard table above it because they are different
 * products sold on different terms, and because a save here revalidates
 * different pages. Sharing one Save button would mean a typo in an ad
 * price blocking a directory price change.
 */
export function AdminDirectoryPricing({
  monthlyCents,
  annualCents,
}: {
  monthlyCents: number;
  annualCents: number;
}) {
  const [monthly, setMonthly] = useState(String(monthlyCents / 100));
  const [annual, setAnnual] = useState(String(annualCents / 100));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const monthlyNum = Number(monthly);
  const annualNum = Number(annual);
  const valid =
    isFinite(monthlyNum) && monthlyNum >= 0 && isFinite(annualNum) && annualNum >= 0;

  // Shown live rather than on save, because the number that matters to
  // somebody choosing a term is the one neither field states.
  const saving = valid ? monthlyNum * 12 - annualNum : 0;

  async function save() {
    if (!valid) {
      setState("error");
      setMessage("Enter both prices as numbers.");
      return;
    }
    setState("saving");
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "directory-pricing",
          monthlyCents: Math.round(monthlyNum * 100),
          annualCents: Math.round(annualNum * 100),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setState("saved");
        setMessage("Directory pricing updated.");
      } else {
        setState("error");
        setMessage(j.error ?? "Save failed");
      }
    } catch {
      setState("error");
      setMessage("Save failed");
    }
  }

  const field =
    "w-[130px] text-sm px-3 py-2 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950 num";

  return (
    <section className="border border-line rounded-(--radius-card) bg-white p-6 grid gap-4">
      <div>
        <h2 className="text-[16px] font-semibold tracking-tight">
          Directory Premium
        </h2>
        <p className="text-[13px] text-muted mt-1 max-w-[68ch]">
          What a Premium directory listing costs. Saving updates the signup
          page straight away, with no deploy. A change applies to new
          subscribers only: Stripe holds the price somebody signed up at, so
          nobody already paying is re-billed at a new rate.
        </p>
      </div>

      <div className="flex items-end gap-5 flex-wrap">
        <label className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Per month
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-muted">$</span>
            <input
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              inputMode="decimal"
              className={field}
            />
          </span>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Per year
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-muted">$</span>
            <input
              value={annual}
              onChange={(e) => setAnnual(e.target.value)}
              inputMode="decimal"
              className={field}
            />
          </span>
        </label>
      </div>

      {valid && (
        <p className="text-[12.5px] text-muted num">
          {saving > 0 ? (
            <>
              Paying yearly saves ${saving.toLocaleString("en-US")}, about{" "}
              {(saving / monthlyNum).toFixed(1)} months free.
            </>
          ) : saving === 0 ? (
            "Yearly costs the same as paying monthly, so there is no reason to choose it."
          ) : (
            // Worth saying plainly rather than letting the site quietly
            // offer a worse deal to anyone who commits for longer.
            <span className="text-[#b42318]">
              Yearly costs ${Math.abs(saving).toLocaleString("en-US")} more than
              paying monthly.
            </span>
          )}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={state === "saving"}
          className="text-[14px] font-semibold px-4 py-2.5 rounded-(--radius-btn) bg-navy-950 text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {state === "saving" ? "Saving..." : "Save directory pricing"}
        </button>
        {message && (
          <span
            className={`text-[13px] ${
              state === "error" ? "text-[#b42318]" : "text-ok"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </section>
  );
}
