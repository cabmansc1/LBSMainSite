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

/**
 * Order the phone's list puts them in: the ones closing first, then the
 * ones you can still get on, then the ones not selling yet.
 *
 * Sorted rather than headed, because the dots already carry the grouping
 * and a heading per group costs a row of a list that is six rows long
 * on a phone already. The sort is stable, so zones sharing a status keep
 * the geographic order the rest of the site lists them in.
 */
const TONE_RANK = { warn: 0, ok: 1, info: 2 } as const;

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
          viewBox={`${MAP_IMG.view.x} ${MAP_IMG.view.y} ${MAP_IMG.view.w} ${MAP_IMG.view.h}`}
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
                    {/* The tap target, invisible and much larger than the
                        marker. r=40 is the ceiling: Hanahan and North
                        Charleston are 83 units apart, so anything bigger
                        would have two zones fighting over the same
                        finger. Even this is only 17px across on a phone,
                        well under the 44px a touch target wants, which
                        is a fact about twelve zones on a 318px image
                        rather than something marker design can fix. */}
                    <circle cx={c.x} cy={c.y} r={40} fill="transparent" />
                    {sel && (
                      <>
                        {/* Selection is a navy ring, deliberately not a
                            colour. The fill already carries availability,
                            and an orange "selected" would be
                            indistinguishable from an orange "almost
                            full": two different facts, one appearance,
                            and no way for a reader to tell which they
                            were looking at. A ring is a different
                            channel, so it can say "this one" without
                            saying anything about spots. */}
                        <circle
                          cx={c.x}
                          cy={c.y}
                          fill={TONE_FILL[tone]}
                          fillOpacity={0.22}
                          r={c.r + 11}
                          className="[r:32px] sm:[r:25px]"
                        />
                        {/* White under navy, so the ring stays legible
                            wherever it lands. Two of the printed labels
                            sit hard against their own dot, Summerville
                            and West Ashley, and a bare navy ring drawn
                            across a navy pill just muddied the text. The
                            white keeps the two apart without moving the
                            marker off the dot it belongs to. */}
                        <circle
                          cx={c.x}
                          cy={c.y}
                          fill="none"
                          stroke="#fff"
                          strokeWidth={8}
                          strokeOpacity={0.95}
                          r={c.r + 11}
                          className="[r:32px] sm:[r:25px]"
                        />
                        <circle
                          cx={c.x}
                          cy={c.y}
                          fill="none"
                          stroke="#0B1F33"
                          strokeWidth={3}
                          r={c.r + 11}
                          className="[r:32px] sm:[r:25px]"
                        />
                      </>
                    )}
                    {/* Markers are drawn far larger on a phone, where the
                        whole map is 318px wide and a desktop-sized dot
                        renders at five pixels across. The r attribute is
                        the no-CSS fallback; the classes are what actually
                        apply, verified in Chromium at both widths. */}
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={sel ? c.r + 3 : c.r}
                      fill={TONE_FILL[tone]}
                      stroke="#fff"
                      strokeWidth={sel ? 4 : 3}
                      className={`transition-[r] duration-150 ${
                        sel
                          ? "[r:24px] sm:[r:16px]"
                          : "[r:20px] sm:[r:13px] group-hover:[r:16px]"
                      }`}
                    />
                  </g>
                ))}
                {b.label && (
                  /*
                    Size and offset both move with the breakpoint,
                    because the marker does. The y attribute is computed
                    from b.r, which stays 13 in JavaScript while CSS
                    draws the marker at 30 on a phone, so the label was
                    landing inside its own marker there. The transform
                    lifts it clear; the attribute alone is still the
                    right answer for desktop and the no-CSS fallback.

                    Size matches the labels the base map prints, near
                    enough, now that the cropped viewBox magnifies both by
                    1.55x. Making ours bigger instead put them in a
                    different tier from the nine printed ones, which read
                    as two maps stacked. A phone still gets a little more,
                    because at 318px wide everything is small and these
                    three are the only labels that have to carry a zone
                    nobody else names.
                  */
                  <text
                    x={b.x}
                    y={b.labelAbove ? b.y - b.r - 12 : b.y + b.r + 24}
                    textAnchor="middle"
                    fill="#0B1F33"
                    fontSize="20"
                    fontWeight="700"
                    className={`pointer-events-none [font-size:28px] sm:[font-size:20px] [stroke-width:7px] sm:[stroke-width:5px] ${
                      b.labelAbove
                        ? "[transform:translateY(-11px)] sm:[transform:translateY(-1px)]"
                        : "[transform:translateY(11px)] sm:[transform:translateY(1px)]"
                    }`}
                    style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,.92)" }}
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
            picture. Reach is a per-card fact and it varies, which is
            why the panel reports it per zone and the legend no longer
            claims anything about it: the Isle of Palms and Sullivan's
            card reaches 4,915, and a legend saying every card mails
            5,000 was wrong about the one zone the map is most likely to
            be asked about. What every marker does share is whether you
            can still get on it, so that is what the colour carries. */}
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
        </div>

        {/*
          The phone's actual control. Below the sm breakpoint the map is
          about 318px wide, and twelve zones on an image that size cannot
          all carry a 44px touch target: Hanahan and North Charleston are
          83 image units apart, which is 17px on that screen, so the
          markers are capped well under what a finger needs no matter how
          they are drawn. Bigger markers made that three times better and
          still not good.

          So on a phone the map stops being the control and becomes the
          picture, and these buttons do the selecting. They are ordinary
          buttons at a real size, they say the availability out loud
          rather than only in colour, and they cannot be missed by a
          thumb. The map still responds, for anyone who does hit it.
        */}
        <div className="sm:hidden px-3 pb-3 pt-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted mb-2">
            Pick an area
          </p>
          <div className="grid grid-cols-2 gap-2">
            {positions
              .map((b) => {
                const z = areas.find((x) => x.slug === b.slug);
                return z
                  ? {
                      b,
                      z,
                      a: availability(
                        mailings.find((m) => z.zoneSlugs.includes(m.zoneSlug)),
                      ),
                    }
                  : null;
              })
              .filter((e) => e !== null)
              .sort((p, q) => TONE_RANK[p.a.tone] - TONE_RANK[q.a.tone])
              .map(({ b, z, a }) => {
              const on = selected === b.slug;
              return (
                <button
                  key={b.slug}
                  onClick={() => setSelected(b.slug)}
                  aria-pressed={on}
                  // text-ink on the button, not on each span. The page
                  // wrapper is bg-navy-950 text-white, so anything on a
                  // white card that does not name a colour inherits white
                  // and disappears. That is exactly what happened here:
                  // the zone name was invisible on the phone while the
                  // status line below it, which carries text-muted, read
                  // perfectly.
                  // ring rather than a thicker border, so selecting a
                  // zone does not shift every button in the grid by a
                  // pixel.
                  className={`min-h-11 text-left rounded-[10px] border px-3 py-2 transition-colors text-ink ${
                    on
                      ? "border-cta bg-cta-tint ring-2 ring-cta"
                      : "border-line bg-white active:bg-surface"
                  }`}
                >
                  {/* items-start, not items-center: "Daniel Island &
                      Clements Ferry" wraps to two lines and a centred dot
                      then floats between them instead of marking the
                      name. The margin drops it onto the optical centre
                      of the first line. */}
                  <span className="flex items-start gap-1.5">
                    <i
                      className="w-2 h-2 rounded-full inline-block shrink-0 mt-[5px]"
                      style={{ background: TONE_FILL[a.tone] }}
                    />
                    <span className="text-[13px] font-semibold leading-tight">
                      {z.name}
                    </span>
                  </span>
                  {/* Says it, rather than only colouring it. A tint and a
                      ring are invisible to anybody who cannot separate
                      orange from white, and this is the control the whole
                      page turns on. */}
                  <span className="block text-[11.5px] mt-0.5">
                    <span className={on ? "font-semibold text-[#9a5c00]" : "text-muted"}>
                      {on ? `Selected · ${a.text}` : a.text}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
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
