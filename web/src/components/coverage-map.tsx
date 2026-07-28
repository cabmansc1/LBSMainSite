"use client";

import { useState } from "react";
import Link from "next/link";
import { ZONES } from "@/lib/zones";
import type { UpcomingMailing } from "@/lib/mailings";
import { POSTCARD_PRICING, formatPrice } from "@/lib/pricing";
import { MAP_IMG, MAP_POSITIONS } from "@/lib/map-positions";
import { TENTATIVE_MAIL_LABEL } from "@/lib/mailings";

/**
 * Coverage bubbles pinned to the printed town markers on the
 * Tri-County base map. The base map carries its own town labels; the
 * site labels only the two zones the map does not name.
 */

const availability = (m: UpcomingMailing | undefined) => {
  if (!m) return { text: "Coming soon", tone: "info" as const };
  if (m.status === "waitlist") return { text: "Waitlist", tone: "info" as const };
  const left = m.spotsTotal - m.spotsTaken;
  if (left <= 2) return { text: `${left} spot${left === 1 ? "" : "s"} left`, tone: "warn" as const };
  return { text: "Open", tone: "ok" as const };
};

export function CoverageMap({ mailings }: { mailings: UpcomingMailing[] }) {
  const [selected, setSelected] = useState("summerville");
  const zone = ZONES.find((z) => z.slug === selected)!;
  const mailing = mailings.find((m) => m.zoneSlug === selected);
  const avail = availability(mailing);
  const dotColor = { ok: "bg-ok", warn: "bg-cta", info: "bg-brand" }[avail.tone];

  return (
    <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-4 items-stretch">
      <div className="bg-white border border-line rounded-2xl p-3 overflow-hidden">
        <svg
          viewBox={`0 0 ${MAP_IMG.w} ${MAP_IMG.h}`}
          role="group"
          aria-label="Charleston Lowcountry service zone map"
          className="w-full h-auto rounded-[10px]"
        >
          <image href={MAP_IMG.src} width={MAP_IMG.w} height={MAP_IMG.h} />
          {MAP_POSITIONS.map((b) => {
            const z = ZONES.find((x) => x.slug === b.slug);
            if (!z) return null;
            const sel = selected === b.slug;
            return (
              <g
                key={b.slug}
                role="button"
                tabIndex={0}
                aria-label={`${z.name}, ${z.households5k} households`}
                className="cursor-pointer outline-none group"
                onClick={() => setSelected(b.slug)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(b.slug);
                  }
                }}
              >
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={b.r}
                  fill={sel ? "rgba(255,140,0,.4)" : "rgba(56,182,255,.3)"}
                  stroke={sel ? "#E67C00" : "#1287D8"}
                  strokeWidth={sel ? 4 : 2.5}
                  className="transition-[fill] duration-150 group-hover:[fill:rgba(56,182,255,.5)]"
                  style={sel ? { fill: "rgba(255,140,0,.4)" } : undefined}
                />
                {b.label && (
                  <text
                    x={b.x}
                    y={b.labelAbove ? b.y - b.r - 14 : b.y + b.r + 26}
                    textAnchor="middle"
                    fill="#1F2937"
                    fontSize="23"
                    fontWeight="700"
                    className="pointer-events-none"
                    style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,.9)", strokeWidth: 6 }}
                  >
                    {b.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap gap-4.5 px-3 py-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full bg-brand inline-block" />
            Open spots
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full bg-cta inline-block" />
            Selected
          </span>
          <span>Bubble size reflects households reached</span>
        </div>
      </div>

      <aside
        className="bg-white/3 border border-white/10 rounded-2xl p-7 grid gap-4 content-start"
        aria-live="polite"
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/6 border border-white/14 text-[#C6D3E0] w-max">
          <span className={`w-[7px] h-[7px] rounded-full ${dotColor}`} />
          {avail.text}
        </span>
        <h3 className="text-[23px] font-bold tracking-tight text-white">{zone.name}</h3>
        <dl className="grid gap-2.5 text-sm">
          {[
            ["Households / mailing", zone.households5k],
            ["ZIP codes", zone.zipCodes.join(", ")],
            [TENTATIVE_MAIL_LABEL, mailing?.mailMonth ?? "Coming soon"],
            ["Ads from", formatPrice(POSTCARD_PRICING["5k"].small.priceCents)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-3 border-b border-white/8 pb-2.5 last:border-b-0"
            >
              <dt className="text-[#67768A]">{label}</dt>
              <dd className="text-white font-semibold text-right num">{value}</dd>
            </div>
          ))}
        </dl>
        <Link
          href={`/postcards/${zone.slug}/checkout`}
          className="inline-flex items-center justify-center bg-cta text-navy-950 font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors"
        >
          Reserve in {zone.name}
        </Link>
        <p className="text-xs text-[#67768A] text-center">
          Availability updates live · one business per category
        </p>
      </aside>
    </div>
  );
}
