"use client";

import { useState } from "react";
import Link from "next/link";
import { ZONES } from "@/lib/zones";
import type { UpcomingMailing } from "@/lib/mailings";
import { POSTCARD_PRICING, formatPrice } from "@/lib/pricing";
import { MAP_VIEW, ZONE_SHAPES } from "@/lib/map-data";

/**
 * Real Lowcountry geography: zone shapes are simplified Census ZCTA
 * boundaries (see scripts/build-map.mjs). The navy ground reads as
 * water; land only exists where we mail.
 */

const LABELS: Record<string, { text?: string; dx?: number; dy?: number }> = {
  "north-charleston": { text: "N. Charleston" },
  "mount-pleasant": { text: "Mt. Pleasant" },
  "daniel-island": { text: "Daniel Island", dy: -6 },
  "sullivans-island": { text: "Sullivans Is.", dx: 30, dy: 14 },
  "isle-of-palms": { text: "Isle of Palms", dx: 34, dy: -8 },
  "james-island": { text: "James Is." },
  "moncks-corner": { text: "Moncks Corner" },
  "goose-creek": { text: "Goose Creek" },
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
      <div className="bg-navy-900 border border-white/10 rounded-2xl p-3 overflow-hidden">
        <svg
          viewBox={`0 0 ${MAP_VIEW.w} ${MAP_VIEW.h}`}
          role="group"
          aria-label="Charleston Lowcountry service zone map"
          className="w-full h-auto"
        >
          <rect width={MAP_VIEW.w} height={MAP_VIEW.h} fill="#0e1d2e" rx="12" />
          <text x={MAP_VIEW.w - 130} y={MAP_VIEW.h - 24} fill="#2e4459" fontSize="13" fontStyle="italic">
            Atlantic Ocean
          </text>
          {/* Land underlay: thick same-color strokes fuse adjacent zones
              into one continuous landmass and hide simplification cracks */}
          <g aria-hidden="true">
            {ZONE_SHAPES.map((s) => (
              <path
                key={s.slug}
                d={s.d}
                fill="#182c42"
                stroke="#182c42"
                strokeWidth="8"
                strokeLinejoin="round"
              />
            ))}
          </g>
          {ZONE_SHAPES.map((s) => {
            const z = ZONES.find((x) => x.slug === s.slug);
            if (!z) return null;
            const sel = selected === s.slug;
            const label = LABELS[s.slug]?.text ?? z.name;
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
                <path
                  d={s.d}
                  fill={sel ? "rgba(255,140,0,.42)" : "rgba(56,182,255,.24)"}
                  stroke={sel ? "#ff8c00" : "rgba(56,182,255,.8)"}
                  strokeWidth={sel ? 1.75 : 1}
                  strokeLinejoin="round"
                  className="transition-[fill] duration-150 group-hover:[fill:rgba(56,182,255,.4)]"
                  style={sel ? { fill: "rgba(255,140,0,.42)" } : undefined}
                />
                <text
                  x={s.labelX + (LABELS[s.slug]?.dx ?? 0)}
                  y={s.labelY + (LABELS[s.slug]?.dy ?? 0)}
                  textAnchor="middle"
                  fill={sel ? "#ffd9a8" : "#dcebf7"}
                  fontSize="11.5"
                  fontWeight="600"
                  className="pointer-events-none"
                  style={{ paintOrder: "stroke", stroke: "rgba(10,22,34,.75)", strokeWidth: 3 }}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap gap-4.5 px-3 pb-2 text-xs text-[#67768A]">
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full bg-brand/70 inline-block" />
            Open spots
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full bg-cta inline-block" />
            Selected
          </span>
          <span>Boundaries follow real ZIP codes</span>
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
