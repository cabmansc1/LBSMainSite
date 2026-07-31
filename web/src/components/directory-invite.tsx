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
      className={`relative bg-white border border-line rounded-(--radius-card) px-5 py-4 grid gap-2 ${className}`}
    >
      <button
        onClick={dismiss}
        aria-label="Hide this for now"
        className="absolute top-3 right-3.5 text-muted hover:text-ink text-[17px] leading-none"
      >
        &times;
      </button>

      <div className="grid gap-1 pr-6">
        <b className="text-[14.5px] font-semibold tracking-tight">
          You are not in the directory yet, and a listing is free.
        </b>
        <p className="text-[13px] text-muted max-w-[68ch] leading-relaxed">
          It puts your name, phone and category in front of people already
          searching for what you do. We have your details from your order,
          so it is a couple of clicks.
        </p>
      </div>

      {/* Premium is one line, not a panel. The free listing is the ask;
          the paid tier is the answer to "what else is there", and it
          does not need equal weight to be read. */}
      <div className="flex items-center gap-3.5 flex-wrap pt-0.5">
        <Link
          href="/register"
          className="text-[13px] font-semibold px-3.5 py-2 rounded-(--radius-btn) bg-navy-950 text-white hover:bg-navy-800"
        >
          Add my free listing
        </Link>
        {(monthlyOnSale || annualOnSale) && (
          <span className="text-[12.5px] text-muted num">
            Premium, with photos and an offer, is{" "}
            {monthlyOnSale && annualOnSale
              ? `${monthly} a month or ${annual} a year`
              : monthlyOnSale
                ? `${monthly} a month`
                : `${annual} a year`}
            {saving !== null && monthlyOnSale && annualOnSale
              ? ` (save ${saving})`
              : ""}
            .
          </span>
        )}
        <button
          onClick={dismiss}
          className="text-[12.5px] font-semibold text-muted hover:text-ink ml-auto"
        >
          Not right now
        </button>
      </div>
    </div>
  );
}
