"use client";

import { useState } from "react";
import {
  ALL_SIZES,
  POSTCARD_PRICING,
  HOUSEHOLDS,
  formatPrice,
  type Reach,
  type SpotSize,
} from "@/lib/pricing";
import { EmailCapture } from "@/components/lead-capture";

const RATES = [0.0025, 0.005, 0.0075, 0.01, 0.02, 0.025];

const fmtMoney = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

export function RoiCalculator({
  pricing = POSTCARD_PRICING,
}: {
  /** Live, admin-editable prices. Falls back to the code defaults. */
  pricing?: typeof POSTCARD_PRICING;
} = {}) {
  const [reach, setReach] = useState<Reach>("5k");
  const [size, setSize] = useState<SpotSize>("small");
  const [rate, setRate] = useState(0.0075);
  const [avgSale, setAvgSale] = useState(600);

  // Only sizes actually on sale at this reach; a zero price means the
  // size is not offered there.
  const sizes = ALL_SIZES.filter(
    (s) => (pricing[reach]?.[s]?.priceCents ?? 0) > 0,
  );
  const active = sizes.includes(size) ? size : (sizes[0] ?? "small");
  const priceCents = pricing[reach][active].priceCents;
  const investment = priceCents / 100;
  const homes = HOUSEHOLDS[reach];
  const customers = Math.round(homes * rate);
  const revenue = customers * avgSale;
  const roi = investment > 0 ? ((revenue - investment) / investment) * 100 : 0;

  const toggle = (active: boolean) =>
    `text-[13.5px] font-semibold px-4 py-2.5 rounded-lg border transition-colors ${
      active
        ? "bg-navy-950 text-white border-navy-950"
        : "bg-white text-body border-line-strong hover:border-faint"
    }`;

  return (
    <div className="grid lg:grid-cols-[1fr_.85fr] gap-5 items-start">
      <div className="bg-white border border-line rounded-(--radius-card) p-7 grid gap-6">
        <div>
          <label className="text-[12.5px] font-semibold text-body block mb-2.5">
            Mailing reach
          </label>
          <div className="flex flex-wrap gap-2">
            {(["5k", "10k"] as Reach[]).map((r) => (
              <button key={r} className={toggle(reach === r)} onClick={() => setReach(r)}>
                {HOUSEHOLDS[r].toLocaleString()} households
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[12.5px] font-semibold text-body block mb-2.5">
            Ad size
          </label>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button key={s} className={toggle(active === s)} onClick={() => setSize(s)}>
                {s[0].toUpperCase() + s.slice(1)} ({pricing[reach][s].size}){" "}
                <span className="num">{formatPrice(pricing[reach][s].priceCents)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[12.5px] font-semibold text-body block mb-1">
            Expected response rate
          </label>
          <p className="text-xs text-muted mb-2.5">
            Industry average for direct mail is 0.5% to 2%
          </p>
          <div className="flex flex-wrap gap-2">
            {RATES.map((r) => (
              <button key={r} className={toggle(rate === r)} onClick={() => setRate(r)}>
                {(r * 100).toFixed(r < 0.005 ? 2 : r === 0.0075 ? 2 : 1)}%
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="avg-sale" className="text-[12.5px] font-semibold text-body block mb-2.5">
            Average sale value
          </label>
          <div className="flex items-center gap-3">
            <input
              id="avg-sale"
              type="range"
              min={50}
              max={5000}
              step={50}
              value={avgSale}
              onChange={(e) => setAvgSale(Number(e.target.value))}
              className="flex-1 accent-[#1287d8]"
            />
            <span className="text-[15px] font-bold num w-16 text-right">${avgSale}</span>
          </div>
        </div>
      </div>

      <aside className="bg-navy-950 text-white rounded-(--radius-card) p-7 grid gap-4 content-start lg:sticky lg:top-5">
        <h3 className="text-lg font-bold tracking-tight">Your results</h3>
        <dl className="grid grid-cols-2 gap-3">
          {[
            ["Your investment", fmtMoney(investment)],
            ["Households reached", homes.toLocaleString()],
            ["Cost per household", `$${(investment / homes).toFixed(2)}`],
            [`New customers (${(rate * 100).toFixed(2)}%)`, customers.toLocaleString()],
            ["Estimated revenue", fmtMoney(revenue)],
            ["Return on investment", `${Math.round(roi).toLocaleString()}%`],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={`rounded-[10px] p-3.5 ${
                i >= 4 ? "bg-white/8 border border-brand/30" : "bg-white/4 border border-white/10"
              }`}
            >
              <dt className="text-[11px] uppercase tracking-wider text-[#93A5B8] font-semibold">
                {label}
              </dt>
              <dd className="text-xl font-bold num mt-1">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-[#67768A]">
          Estimates only. Actual results vary by offer, season, and category.
        </p>
      </aside>

      {/* The numbers on screen are what a follow-up call is about, so
          they go with the email. The legacy calculator captured nothing
          at all, which made every visit to this page anonymous. */}
      <div className="lg:col-span-2 max-w-[720px]">
        <EmailCapture
          source="roi"
          details={{
            households: homes,
            adSize: `${active[0].toUpperCase()}${active.slice(1)} (${pricing[reach][active].size})`,
            price: investment,
            responseRate: rate,
            avgSale,
            customers,
            revenue,
            roi,
          }}
          blurb="Want these numbers checked against what your category actually costs on the next card? Leave your email."
          action="Send me the numbers"
          confirmation="Got it. We will come back with real numbers for your category and neighborhood."
        />
      </div>
    </div>
  );
}
