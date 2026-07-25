"use client";

import { useState } from "react";
import Link from "next/link";
import { ZONES } from "@/lib/zones";
import type { UpcomingMailing } from "@/lib/mailings";
import { POSTCARD_PRICING, formatPrice } from "@/lib/pricing";
import { MAP_VIEW, ZONE_SHAPES, COUNTIES, LAKES_D } from "@/lib/map-data";

/**
 * Real Lowcountry geography: zone shapes are simplified Census ZCTA
 * boundaries (see scripts/build-map.mjs). The navy ground reads as
 * water; land only exists where we mail.
 */

/**
 * Coverage bubbles at each zone's true geographic center (projected
 * ZIP centroids), sized by reach. The base map behind them is
 * swappable; the user is sourcing a preferred base image.
 */
const BUBBLES: Record<string, { text?: string; r: number; dx?: number; dy?: number }> = {
  summerville: { r: 32 },
  "moncks-corner": { text: "Moncks Corner", r: 24, dx: 10, dy: -10 },
  "goose-creek": { text: "Goose Creek", r: 21, dx: 6 },
  "north-charleston": { text: "N. Charleston", r: 25, dx: -26, dy: -2 },
  "daniel-island": { text: "Daniel Island", r: 18, dx: 22, dy: -18 },
  "mount-pleasant": { text: "Mt. Pleasant", r: 25, dx: 22, dy: 10 },
  "isle-of-palms": { text: "Isle of Palms", r: 14, dx: 34, dy: -6 },
  "sullivans-island": { text: "Sullivans Is.", r: 12, dx: 30, dy: 26 },
  charleston: { r: 25, dx: -22, dy: 20 },
  "james-island": { text: "James Is.", r: 17, dx: 4, dy: 22 },
  "johns-island": { text: "Johns Island", r: 20, dx: -22, dy: 6 },
};

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
      <div className="bg-white border border-white/10 rounded-2xl p-3 overflow-hidden">
        <svg
          viewBox={`0 0 ${MAP_VIEW.w} ${MAP_VIEW.h}`}
          role="group"
          aria-label="Charleston Lowcountry service zone map"
          className="w-full h-auto"
        >
          {/* Water */}
          <rect width={MAP_VIEW.w} height={MAP_VIEW.h} fill="#ACD9EF" rx="10" />
          {/* County land, like a printed reference map: white silhouettes
              with dashed county lines; the coast and lakes stay water */}
          <g aria-hidden="true">
            {COUNTIES.map((c) => (
              <path
                key={c.name}
                d={c.d}
                fill="#FBFDFE"
                fillRule="evenodd"
                stroke="#9FB8C9"
                strokeWidth="1"
                strokeDasharray="3 4"
                strokeLinejoin="round"
              />
            ))}
            <path d={LAKES_D} fill="#ACD9EF" stroke="#8FC3DE" strokeWidth="0.75" strokeLinejoin="round" />
          </g>
          <text x={MAP_VIEW.w - 138} y={MAP_VIEW.h - 22} fill="#4E90B8" fontSize="13" fontStyle="italic">
            Atlantic Ocean
          </text>
          {ZONE_SHAPES.map((s) => {
            const z = ZONES.find((x) => x.slug === s.slug);
            if (!z) return null;
            const sel = selected === s.slug;
            const b = BUBBLES[s.slug] ?? { r: 24 };
            const cx = s.labelX + (b.dx ?? 0);
            const cy = s.labelY + (b.dy ?? 0);
            const label = b.text ?? z.name;
            return (
              <g
                key={s.slug}
                role="button"
                tabIndex={0}
                aria-label={`${z.name}, ${z.households5k} households`}
                className="cursor-pointer outline-none group"
                onClick={() => setSelected(s.slug)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(s.slug);
                  }
                }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={b.r}
                  fill={sel ? "rgba(255,140,0,.45)" : "rgba(56,182,255,.3)"}
                  stroke={sel ? "#E67C00" : "#1287D8"}
                  strokeWidth={sel ? 2 : 1.25}
                  className="transition-[fill] duration-150 group-hover:[fill:rgba(56,182,255,.5)]"
                  style={sel ? { fill: "rgba(255,140,0,.45)" } : undefined}
                />
                <text
                  x={cx}
                  y={cy + b.r + 14}
                  textAnchor="middle"
                  fill={sel ? "#8A4B00" : "#12293C"}
                  fontSize="11.5"
                  fontWeight="650"
                  className="pointer-events-none"
                  style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,.85)", strokeWidth: 3 }}
                >
                  {label}
                </text>
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
            ["Next mailing", mailing?.mailMonth ?? "Coming soon"],
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
          href={`/${zone.slug}-direct-mail-marketing`}
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
