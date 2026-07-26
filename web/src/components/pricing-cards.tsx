"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BIG_SIZES,
  CORE_SIZES,
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
  triple: {
    label: "Triple",
    dims: "3 mediums",
    sub: "Owns a whole band of the card",
    features: ["Everything in Large", "Three medium spots together", "Impossible to skim past"],
  },
  quad: {
    label: "Quad",
    dims: "2 larges",
    sub: "Half the card is yours",
    features: ["Everything in Triple", "Two larges or four mediums", "A half-card takeover"],
  },
  full: {
    label: "Full page",
    dims: "one whole side",
    sub: "Every spot on the non-postage side",
    features: ["Everything in Quad", "No other business on your side", "One per card, ever"],
  },
};

const SIZES = CORE_SIZES;
const BIG = BIG_SIZES;

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
        className="inline-flex bg-surface border border-line rounded-[10px] p-[3px] mt-7"
        role="group"
        aria-label="Mailing reach"
      >
        {(["5k", "10k"] as Reach[]).map((r) => (
          <button
            key={r}
            onClick={() => setReach(r)}
            className={`text-[13.5px] font-semibold px-5 py-2 rounded-lg transition-colors ${
              reach === r ? "bg-navy-950 text-white" : "text-muted hover:text-body"
            }`}
            aria-pressed={reach === r}
          >
            {r === "5k" ? "5,000 households" : "10,000 households"}
          </button>
        ))}
      </div>

      <div className="mt-6 bg-surface border border-line rounded-xl p-5 max-w-[560px]">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="w-6 h-6 rounded-full bg-cta text-navy-950 text-[12px] font-extrabold grid place-items-center">
            1
          </span>
          <b className="text-[15px]">Pick your neighborhood</b>
        </div>
        {zones.length > 0 ? (
          <>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              aria-label="Neighborhood"
              className="w-full text-[15px] font-medium px-4 py-3 rounded-[10px] bg-white text-navy-950 border border-line-strong cursor-pointer focus:outline-none focus:border-navy-950"
            >
              <option value="">Choose a neighborhood...</option>
              {zones.map((z) => (
                <option key={z.slug} value={z.slug}>
                  {z.name}
                </option>
              ))}
            </select>
            <p className="text-[12.5px] text-muted mt-2">
              {zone
                ? "Now pick an ad size below to reserve."
                : `${zones.length} ${zones.length === 1 ? "neighborhood has" : "neighborhoods have"} spots open right now.`}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-muted">
            No neighborhoods are open for booking this minute.{" "}
            <a href="/contact" className="text-brand-deep font-semibold hover:underline">
              Tell us where you want to be
            </a>{" "}
            and we will hold you a spot on the next card.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5 mt-7 mb-3">
        <span
          className={`w-6 h-6 rounded-full text-[12px] font-extrabold grid place-items-center ${
            zone ? "bg-cta text-navy-950" : "bg-surface border border-line text-muted"
          }`}
        >
          2
        </span>
        <b className="text-[15px]">Pick your ad size</b>
      </div>

      <div className="grid md:grid-cols-3 gap-3.5 relative z-10">
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

      <div className="mt-3.5 grid md:grid-cols-3 gap-3.5 relative z-10">
        {BIG.map((size) => {
          const meta = CARD_META[size];
          const tier = pricing[reach]?.[size];
          // A price of zero means the size is not sold at this reach, and
          // the format is big enough that dropping it off the page reads
          // as though it does not exist. Show it and route to a
          // conversation instead.
          const priced = (tier?.priceCents ?? 0) > 0;
          return (
            <div
              key={size}
              className="bg-white rounded-(--radius-card) p-6 border border-line grid gap-3.5 content-start"
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {meta.label}
                </div>
                <div className="text-[17px] font-bold tracking-tight mt-1">
                  {meta.dims}
                </div>
                <div className="text-[13.5px] text-muted">{meta.sub}</div>
              </div>
              <div>
                <div className="text-[30px] font-bold tracking-[-0.03em] leading-none num">
                  {priced ? formatPrice(tier.priceCents) : "On request"}
                  {priced && (
                    <span className="text-sm font-medium text-muted tracking-normal">
                      {" "}
                      / mailing
                    </span>
                  )}
                </div>
                <div className="text-[12.5px] text-muted mt-1.5 num">
                  {priced
                    ? centsPerHome(tier.priceCents, reach)
                    : "Ask us about this reach"}
                </div>
              </div>
              <Link
                href={priced ? hrefFor(size) : "/contact"}
                className="inline-flex items-center justify-center font-semibold text-[14.5px] px-5 py-2.5 rounded-(--radius-btn) bg-white text-ink border border-line-strong hover:border-faint transition-colors"
              >
                {priced
                  ? zone
                    ? `Reserve ${meta.label}`
                    : `Choose ${meta.label}`
                  : "Talk to us"}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
