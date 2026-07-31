"use client";

import { useState } from "react";
import Link from "next/link";


/**
 * Shown to an advertiser who is not in the directory yet.
 *
 * Somebody who has already paid for a postcard spot is the warmest
 * audience the directory has, and until now nothing in their account
 * told them the directory existed. The free tier leads, because it is
 * the offer that costs them nothing to accept and it is the one that
 * makes Premium worth explaining.
 *
 * Prices come from the admin, never from a constant here. A banner
 * quoting last year's price is worse than no banner: the number is a
 * promise somebody arrives at checkout holding.
 *
 * Dismissable, and it comes back. Somebody saying "not now" is not
 * saying "never", but a banner that ignores being dismissed is one
 * people learn to read past. It goes away for three weeks, then longer
 * each time it is dismissed again.
 */
export function DirectoryInvite({
  monthly,
  annual,
  saving,
  className = "",
}: {
  /**
   * Already formatted, and empty when that term is not on sale.
   *
   * Strings rather than the pricing object on purpose: this is a client
   * component, and importing lib/directory-pricing here pulls
   * admin-data and then sharp into the browser bundle, which fails the
   * build. The server page does the money formatting, the same way the
   * register form takes its prices.
   */
  monthly: string;
  annual: string;
  /** "Save $60", or null when annual is not cheaper. */
  saving: string | null;
  className?: string;
}) {
  const [gone, setGone] = useState(false);

  // Hidden straight away and recorded in the background. A dismissal
  // that waits on a round trip feels broken, and one that fails to save
  // only means it is offered again sooner than intended.
  const dismiss = () => {
    setGone(true);
    void fetch("/api/account/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss-directory-invite" }),
    }).catch(() => {});
  };

  if (gone) return null;

  // Empty means that term is not on sale, which is a real setting.
  const monthlyOnSale = monthly !== "";
  const annualOnSale = annual !== "";

  return (
    <div
      className={`relative bg-navy-950 text-white rounded-(--radius-card) p-6 grid gap-3.5 ${className}`}
    >
      <button
        onClick={dismiss}
        aria-label="Hide this for now"
        className="absolute top-3.5 right-4 text-[#67768A] hover:text-white text-[18px] leading-none"
      >
        &times;
      </button>

      <div className="grid gap-1.5 pr-6">
        <span className="text-[11px] font-bold uppercase tracking-widest text-brand">
          Not in the directory yet
        </span>
        <h2 className="text-[19px] font-bold tracking-[-0.02em]">
          Add your business to the directory, free.
        </h2>
        <p className="text-[13.5px] text-[#93A5B8] max-w-[62ch] leading-relaxed">
          A free listing puts your name, phone, website and category in
          front of people already searching the Lowcountry for what you
          do. It takes a couple of minutes and there is nothing to cancel.
        </p>
      </div>

      {(monthlyOnSale || annualOnSale) && (
        <div className="border border-white/12 bg-white/4 rounded-[10px] px-4.5 py-3.5 grid gap-1.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <b className="text-[15px] font-semibold">Or go Premium</b>
            <span className="text-[13.5px] text-[#C6D3E0] num">
              {monthlyOnSale && annualOnSale
                ? `${monthly} per month, or ${annual} per year`
                : monthlyOnSale
                  ? `${monthly} per month`
                  : `${annual} per year`}
            </span>
            {saving !== null && monthlyOnSale && annualOnSale && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-cta num">
                Save {saving}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#93A5B8] leading-relaxed">
            Premium adds photos, a special offer on your listing and on
            your card in the directory, and puts you above the free
            listings in your category.
          </p>
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/register"
          className="inline-flex items-center justify-center bg-cta text-navy-950 font-semibold text-[14.5px] px-5 py-2.5 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors"
        >
          List my business
        </Link>
        <button
          onClick={dismiss}
          className="text-[13px] font-semibold text-[#93A5B8] hover:text-white"
        >
          Not right now
        </button>
      </div>
    </div>
  );
}
