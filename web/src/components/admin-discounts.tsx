"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscountCode } from "@/lib/discount-codes";

/**
 * Making a discount code without leaving for the Stripe dashboard.
 *
 * The form asks for a code and an amount off. Stripe's coupon and
 * promotion code split happens on the server: it is real, but it is not
 * a distinction anybody needs while trying to give a customer $50 off.
 */
export function AdminDiscounts({
  codes,
  enabled,
}: {
  codes: DiscountCode[];
  enabled: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [percentOff, setPercentOff] = useState("");
  const [amountOff, setAmountOff] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [made, setMade] = useState("");

  async function create() {
    setBusy(true);
    setError("");
    setMade("");
    try {
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          percentOff: kind === "percent" ? Number(percentOff) : undefined,
          amountOffDollars: kind === "amount" ? Number(amountOff) : undefined,
          maxRedemptions: Number(maxRedemptions) || undefined,
          expiresOn,
          firstOrderOnly,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not work.");
      setMade(j.code ?? code.toUpperCase());
      setCode("");
      setPercentOff("");
      setAmountOff("");
      setMaxRedemptions("");
      setExpiresOn("");
      setFirstOrderOnly(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(c: DiscountCode) {
    setBusy(true);
    try {
      await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: c.active ? "deactivate" : "activate",
          id: c.id,
        }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";

  if (!enabled) {
    return (
      <p className="text-[13px] text-[#7a4a00] bg-cta-tint border border-[#f3ddbb] rounded-lg px-4 py-2.5">
        Stripe is not configured on this deploy, so there is nothing to make a
        code against.
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3.5">
        <b className="text-[15px]">Make a code</b>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="grid gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
              The code they type
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SPRING50"
              className={`${field} num`}
            />
          </label>

          <div className="grid gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
              Discount
            </span>
            <div className="flex gap-2">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as "percent" | "amount")}
                className={field}
              >
                <option value="percent">Percent off</option>
                <option value="amount">Dollars off</option>
              </select>
              <input
                inputMode="numeric"
                value={kind === "percent" ? percentOff : amountOff}
                onChange={(e) =>
                  kind === "percent"
                    ? setPercentOff(e.target.value)
                    : setAmountOff(e.target.value)
                }
                placeholder={kind === "percent" ? "10" : "50"}
                className={`${field} num`}
              />
            </div>
          </div>

          <label className="grid gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
              Times it can be used
            </span>
            <input
              inputMode="numeric"
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder="Leave empty for no limit"
              className={field}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
              Last day it works
            </span>
            <input
              type="date"
              value={expiresOn}
              onChange={(e) => setExpiresOn(e.target.value)}
              className={field}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-[13.5px]">
          <input
            type="checkbox"
            checked={firstOrderOnly}
            onChange={(e) => setFirstOrderOnly(e.target.checked)}
          />
          New customers only
        </label>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={create}
            disabled={busy || !code.trim()}
            className="bg-cta text-navy-950 text-[14px] font-bold px-5 py-2.5 rounded-(--radius-btn) hover:bg-[#FFA033] disabled:opacity-50"
          >
            {busy ? "Making..." : "Make the code"}
          </button>
          {made && (
            <span className="text-[13px] font-semibold text-ok num">
              {made} is live. Customers enter it at checkout.
            </span>
          )}
          {error && (
            <span className="text-[13px] font-semibold text-danger">{error}</span>
          )}
        </div>
      </div>

      {codes.length === 0 ? (
        <p className="text-[13px] text-muted border border-line rounded-(--radius-card) bg-white px-4 py-5">
          No codes yet.
        </p>
      ) : (
        <div className="border border-line rounded-(--radius-card) bg-white overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead>
              <tr className="text-left border-b border-line">
                {["Code", "Discount", "Used", "Expires", "", ""].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-bold num">{c.code}</td>
                  <td className="px-4 py-3">{c.discount}</td>
                  <td className="px-4 py-3 num">
                    {c.timesRedeemed}
                    {c.maxRedemptions ? ` of ${c.maxRedemptions}` : ""}
                  </td>
                  <td className="px-4 py-3 num text-muted">
                    {c.expiresAt ?? "No end date"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        c.active ? "bg-ok text-white" : "bg-surface text-muted"
                      }`}
                    >
                      {c.active ? "Live" : "Off"}
                    </span>
                    {c.firstOrderOnly && (
                      <span className="block text-[11.5px] text-muted mt-0.5">
                        New customers only
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggle(c)}
                      className="text-[12.5px] font-semibold text-brand-deep hover:underline disabled:opacity-40"
                    >
                      {c.active ? "Switch off" : "Switch on"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
