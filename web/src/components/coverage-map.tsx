"use client";

import { useState } from "react";
import Link from "next/link";
import { MAILING_AREAS, type MailingArea } from "@/lib/zones";
import type { UpcomingMailing } from "@/lib/mailings";
import { POSTCARD_PRICING, formatPrice } from "@/lib/pricing";
import { MAP_IMG, MAP_POSITIONS, type MapPosition } from "@/lib/map-positions";
import { TENTATIVE_MAIL_LABEL, hasMailDate } from "@/lib/mailings";

/**
 * Coverage markers pinned to the printed town markers on the base map.
 * The base map carries its own town labels; the site labels only the
 * three zones it does not name.
 *
 * One marker per card, not per zone. Isle of Palms and Sullivan's
 * Island never mail apart, so two offered a choice that does not exist
 * and implied twice the reach that does. West Ashley and Kiawah get a
 * marker each for the opposite reason: the base map names them, they
 * are not zones, and a printed neighbourhood with nothing to click
 * reads as "they do not mail here" to the person who lives there.
 */

/**
 * Marker fill by availability. The same three tones availability()
 * already returns, so the map and the panel beside it can never
 * disagree about whether a card is filling.
 */
const TONE_FILL = {
  ok: "#38B6FF",
  warn: "#FF8C00",
  info: "#93A5B8",
} as const;

const availability = (m: UpcomingMailing | undefined) => {
  if (!m) return { text: "Coming soon", tone: "info" as const };
  if (m.status === "waitlist") return { text: "Waitlist", tone: "info" as const };
  // A planned card is bookable, so it is not "coming soon", but it is
  // not filling either. Saying so beats a spot count on a date that is
  // still an intention.
  if (m.status === "planned") return { text: "Planned", tone: "info" as const };
  const left = m.spotsTotal - m.spotsTaken;
  if (left <= 2) return { text: `${left} spot${left === 1 ? "" : "s"} left`, tone: "warn" as const };
  return { text: "Open", tone: "ok" as const };
};

export function CoverageMap({
  mailings,
  areas = MAILING_AREAS,
  positions = MAP_POSITIONS,
  fromCents = POSTCARD_PRICING["5k"].small.priceCents,
}: {
  mailings: UpcomingMailing[];
  /** Cheapest live price. The constant was quoting the shipped one. */
  fromCents?: number;
  /** Live from the admin; the code defaults keep this usable anywhere. */
  areas?: MailingArea[];
  positions?: MapPosition[];
}) {
  const [selected, setSelected] = useState("summerville");
  // Falls back to the first card rather than crashing, in case a saved
  // pairing folds the selected slug into another area.
  const zone = areas.find((a) => a.slug === selected) ?? areas[0];
  // Either half of a shared card is this card's mailing.
  const mailing = mailings.find((m) => zone.zoneSlugs.includes(m.zoneSlug));
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
          {positions.map((b) => {
            const z = areas.find((x) => x.slug === b.slug);
            if (!z) return null;
            const sel = selected === b.slug;
            // This marker's own card, not the selected one's.
            const tone = availability(
              mailings.find((m) => z.zoneSlugs.includes(m.zoneSlug)),
            ).tone;
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
                {/* The card's own marker first, then any island it
                    shares the card with and any neighbourhood inside it
                    the base map names separately. They light up
                    together because they sell together.

                    Fill carries availability, the ring carries
                    selection. Keeping those on separate channels
                    matters: an almost-full card and the selected card
                    were both going to be orange, and one of them would
                    have been lying. */}
                {[{ x: b.x, y: b.y, r: b.r }, ...(b.also ?? [])].map((c) => (
                  <g key={`${c.x}-${c.y}`}>
                    {sel && (
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={c.r + 11}
                        fill={TONE_FILL[tone]}
                        fillOpacity={0.28}
                      />
                    )}
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={sel ? c.r + 3 : c.r}
                      fill={TONE_FILL[tone]}
                      stroke="#fff"
                      strokeWidth={sel ? 4 : 3}
                      className="transition-[r] duration-150 group-hover:[r:16]"
                    />
                  </g>
                ))}
                {b.label && (
                  <text
                    x={b.x}
                    y={b.labelAbove ? b.y - b.r - 12 : b.y + b.r + 24}
                    textAnchor="middle"
                    fill="#0B1F33"
                    fontSize="19"
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
        {/* Reads the colours off the markers now, rather than
            apologising for them. The old legend had to spend a sentence
            explaining that bubble size did NOT mean the size of the
            mailing, which is the clearest sign an encoding is wrong: if
            the caption has to correct what the picture says, change the
            picture. Every card mails the same 5,000 or 10,000 homes, so
            the only thing worth encoding is whether you can still get
            on it. */}
        <div className="flex flex-wrap gap-4.5 px-3 py-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full inline-block" style={{ background: TONE_FILL.ok }} />
            Spots open
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full inline-block" style={{ background: TONE_FILL.warn }} />
            Almost full
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full inline-block" style={{ background: TONE_FILL.info }} />
            Coming soon
          </span>
          <span>Every card mails 5,000 or 10,000 homes, whichever you pick</span>
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
            [
              TENTATIVE_MAIL_LABEL,
              hasMailDate(mailing?.mailMonth)
                ? (mailing?.mailMonth as string)
                : "Coming soon",
            ],
            ["Ads from", formatPrice(fromCents)],
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
        {/* Only a card that covers two zones has anything to explain,
            and it explains it here rather than leaving somebody to
            wonder why one bubble carries two names. */}
        {zone.note && (
          <p className="text-[12.5px] text-[#93A5B8] leading-relaxed -mt-1">
            {zone.note}
          </p>
        )}
        <Link
          href={`/postcards/${zone.slug}/checkout`}
          className="inline-flex items-center justify-center bg-cta text-navy-950 font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors"
        >
          {zone.zoneSlugs.length > 1
            ? "Reserve on this card"
            : `Reserve in ${zone.name}`}
        </Link>
        <p className="text-xs text-[#67768A] text-center">
          Availability updates live · one business per category
        </p>
      </aside>
    </div>
  );
}
