"use client";

import { useState } from "react";
import Link from "next/link";
import { ZONES } from "@/lib/zones";
import { UPCOMING_MAILINGS } from "@/lib/mailings";
import { POSTCARD_PRICING, formatPrice } from "@/lib/pricing";

/** Schematic bubble positions; bubble radius scales with reach. */
const POSITIONS: Record<string, { x: number; y: number; r: number; label?: string }> = {
  summerville: { x: 150, y: 150, r: 46 },
  "moncks-corner": { x: 330, y: 72, r: 34 },
  "goose-creek": { x: 378, y: 170, r: 36 },
  "north-charleston": { x: 330, y: 290, r: 42, label: "N. Charleston" },
  "daniel-island": { x: 480, y: 262, r: 32, label: "Daniel Island" },
  "mount-pleasant": { x: 565, y: 352, r: 44, label: "Mt. Pleasant" },
  "isle-of-palms": { x: 668, y: 415, r: 24 },
  "sullivans-island": { x: 600, y: 462, r: 22, label: "Sullivans Is." },
  charleston: { x: 428, y: 420, r: 44 },
  "james-island": { x: 340, y: 492, r: 30 },
  "johns-island": { x: 216, y: 462, r: 32 },
};

const availability = (slug: string) => {
  const m = UPCOMING_MAILINGS.find((x) => x.zoneSlug === slug);
  if (!m) return { text: "Coming soon", tone: "info" as const };
  if (m.status === "waitlist") return { text: "Waitlist", tone: "info" as const };
  const left = m.spotsTotal - m.spotsTaken;
  if (left <= 2) return { text: `${left} spot${left === 1 ? "" : "s"} left`, tone: "warn" as const };
  return { text: "Open", tone: "ok" as const };
};

export function CoverageMap() {
  const [selected, setSelected] = useState("summerville");
  const zone = ZONES.find((z) => z.slug === selected)!;
  const mailing = UPCOMING_MAILINGS.find((m) => m.zoneSlug === selected);
  const avail = availability(selected);
  const dotColor = { ok: "bg-ok", warn: "bg-cta", info: "bg-brand" }[avail.tone];

  return (
    <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-4 items-stretch">
      <div className="bg-navy-900 border border-white/10 rounded-2xl p-3 overflow-hidden">
        <svg viewBox="0 0 760 560" role="group" aria-label="Service zone map" className="w-full h-auto">
          <rect width="760" height="560" fill="#0e1d2e" rx="12" />
          <path d="M 470 560 Q 520 430 640 380 Q 720 350 760 340 L 760 560 Z" fill="#0a1622" />
          <path
            d="M 470 560 Q 520 430 640 380 Q 720 350 760 340"
            fill="none"
            stroke="rgba(56,182,255,.3)"
            strokeWidth="1.5"
            strokeDasharray="5 6"
          />
          <text x="635" y="500" fill="#2e4459" fontSize="13" fontStyle="italic">
            Atlantic Ocean
          </text>
          {ZONES.map((z) => {
            const pos = POSITIONS[z.slug];
            if (!pos) return null;
            const sel = selected === z.slug;
            return (
              <g
                key={z.slug}
                role="button"
                tabIndex={0}
                aria-label={`${z.name}, ${z.households5k} households`}
                className="cursor-pointer outline-none"
                onClick={() => setSelected(z.slug)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(z.slug);
                  }
                }}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={pos.r}
                  fill={sel ? "rgba(255,140,0,.32)" : "rgba(56,182,255,.2)"}
                  stroke={sel ? "#ff8c00" : "rgba(56,182,255,.75)"}
                  strokeWidth="1.25"
                />
                <text
                  x={pos.x}
                  y={pos.y + pos.r + 15}
                  textAnchor="middle"
                  fill={sel ? "#ffd9a8" : "#c6d3e0"}
                  fontSize="11"
                  fontWeight="550"
                  className="pointer-events-none"
                >
                  {pos.label ?? z.name}
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
          <span>Bubble size = households reached</span>
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
