"use client";

import { useState } from "react";
import Link from "next/link";
import {
  POSTCARD_PRICING,
  formatPrice,
  centsPerHome,
  type Reach,
  type SpotSize,
} from "@/lib/pricing";

const CARD_META: Record<
  SpotSize,
  { label: string; dims: string; sub: string; features: string[]; popular?: boolean }
> = {
  small: {
    label: "Small",
    dims: "3″ × 2″",
    sub: "Business-card size",
    features: ["Category exclusivity", "Free ad design", "QR and URL tracking"],
  },
  medium: {
    label: "Medium",
    dims: "3″ × 4″",
    sub: "Double the canvas",
    features: ["Everything in Small", "Room for offer and photo", "Social spotlight post"],
    popular: true,
  },
  large: {
    label: "Large",
    dims: "4″ × 6″",
    sub: "Dominant position",
    features: ["Everything in Medium", "Largest ad on the card", "Priority placement"],
  },
};

const SIZES: SpotSize[] = ["small", "medium", "large"];

export function PricingCards({
  pricing = POSTCARD_PRICING,
  zones = [],
}: {
  pricing?: typeof POSTCARD_PRICING;
  /** Zones with an open card, so a spot choice can go straight to checkout. */
  zones?: { slug: string; name: string }[];
} = {}) {
  const [reach, setReach] = useState<Reach>("5k");
  const [zone, setZone] = useState("");

  // Without a zone we cannot know which card they are buying onto, so the
  // button asks for one first rather than dropping them on a contact form.
  const hrefFor = (size: SpotSize) =>
    zone
      ? `/postcards/${zone}/checkout?spot=${size}&reach=${reach}`
      : "/coverage-map";

  return (
    <>
      <div
        className="inline-flex bg-white/6 border border-white/14 rounded-[10px] p-[3px] mt-7"
        role="group"
        aria-label="Mailing reach"
      >
        {(["5k", "10k"] as Reach[]).map((r) => (
          <button
            key={r}
            onClick={() => setReach(r)}
            className={`text-[13.5px] font-semibold px-5 py-2 rounded-lg transition-colors ${
              reach === r ? "bg-white text-navy-950" : "text-[#93A5B8]"
            }`}
            aria-pressed={reach === r}
          >
            {r === "5k" ? "5,000 households" : "10,000 households"}
          </button>
        ))}
      </div>

      {zones.length > 0 && (
        <div className="mt-4">
          <label className="text-[12.5px] text-[#93A5B8] block mb-1.5">
            Which neighborhood?
          </label>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="text-[14px] font-medium px-3.5 py-2.5 rounded-[10px] bg-white text-navy-950 border border-white/20 min-w-[240px]"
          >
            <option value="">Choose a neighborhood</option>
            {zones.map((z) => (
              <option key={z.slug} value={z.slug}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3.5 -mt-16 relative z-10 pt-24">
        {SIZES.map((size) => {
          const meta = CARD_META[size];
          const tier = pricing[reach][size];
          return (
            <div
              key={size}
              className={`bg-white rounded-(--radius-card) p-7 grid gap-4.5 content-start relative border ${
                meta.popular ? "border-navy-950 border-[1.5px]" : "border-line"
              }`}
            >
              {meta.popular && (
                <span className="absolute -top-[11px] left-6 bg-navy-950 text-white text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {meta.label}
                </div>
                <div className="text-[21px] font-bold tracking-tight mt-1">{meta.dims}</div>
                <div className="text-[14.5px] text-muted">{meta.sub}</div>
              </div>
              <div>
                <div className="text-[42px] font-bold tracking-[-0.035em] leading-none num">
                  {formatPrice(tier.priceCents)}
                  <span className="text-sm font-medium text-muted tracking-normal">
                    {" "}
                    / mailing
                  </span>
                </div>
                <div className="text-[12.5px] text-muted mt-1.5 num">
                  {centsPerHome(tier.priceCents, reach)}
                </div>
              </div>
              <ul className="grid gap-2 text-[13.5px] text-body">
                {meta.features.map((f) => (
                  <li key={f} className="flex gap-2 items-start">
                    <svg className="text-ok mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={hrefFor(size)}
                className={`inline-flex items-center justify-center font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) transition-colors ${
                  meta.popular
                    ? "bg-cta text-navy-950 hover:bg-cta-hover hover:text-white"
                    : "bg-white text-ink border border-line-strong hover:border-faint"
                }`}
              >
                {zone ? `Reserve ${meta.label}` : `Choose ${meta.label}`}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
