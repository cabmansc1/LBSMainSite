"use client";

import type { SpotSize } from "@/lib/pricing";
import type { Orientation } from "@/lib/card-capacity";

/**
 * The printed card, both sides, in the orientation the card is actually
 * printed in.
 *
 * Horizontal: four medium slots along the top and four along the bottom
 * of each side, with the branding band between the rows. Vertical: the
 * band runs across the top and the slots sit two wide and four deep
 * beneath it.
 *
 * One side carries the postage indicia, which is technically the front of
 * the card. EDDM needs no address, so the rest of that side sells like
 * any other. The buyer's ad is drawn on the other side, and a full page
 * takes that whole side, which is why only one can exist per card.
 *
 * One slot is one medium either way, so an ad is drawn at its real
 * relative size. Position is illustrative, which the caption says
 * plainly: the real placement is decided in production.
 */

type Footprint = {
  /** Slots wide and deep. */
  colSpan: number;
  rowSpan: number;
  /** Fills only half the slot's height. */
  half: boolean;
  note: string;
};

const HORIZONTAL: Record<SpotSize, Footprint> = {
  small: { colSpan: 1, rowSpan: 1, half: true, note: "half a medium slot" },
  medium: { colSpan: 1, rowSpan: 1, half: false, note: "one slot" },
  large: { colSpan: 2, rowSpan: 1, half: false, note: "two slots side by side" },
  triple: { colSpan: 3, rowSpan: 1, half: false, note: "three slots across" },
  quad: { colSpan: 4, rowSpan: 1, half: false, note: "a full row of four" },
  full: { colSpan: 4, rowSpan: 2, half: false, note: "every spot on the side" },
};

const VERTICAL: Record<SpotSize, Footprint> = {
  small: { colSpan: 1, rowSpan: 1, half: true, note: "half a medium slot" },
  medium: { colSpan: 1, rowSpan: 1, half: false, note: "one slot" },
  large: { colSpan: 1, rowSpan: 2, half: false, note: "two slots stacked" },
  triple: { colSpan: 1, rowSpan: 3, half: false, note: "three slots stacked" },
  quad: { colSpan: 2, rowSpan: 2, half: false, note: "a two by two block" },
  full: { colSpan: 2, rowSpan: 4, half: false, note: "every spot on the side" },
};

const GRID = {
  horizontal: { cols: 4, rows: 2, footprints: HORIZONTAL },
  vertical: { cols: 2, rows: 4, footprints: VERTICAL },
} as const;

function Slot({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className="rounded-[3px] bg-[#e8edf2] border border-[#dbe3ea] flex items-center justify-center text-[7px] font-bold text-[#9aa8b6]"
    >
      AD
    </div>
  );
}

function MyAd({
  business,
  half,
  style,
}: {
  business: string;
  half: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`rounded-[3px] bg-navy-950 text-white flex items-center justify-center text-center px-1 font-semibold leading-tight ${
        half ? "self-start h-[calc(50%-1px)] text-[6.5px]" : "text-[8px]"
      }`}
    >
      {business.trim() || "YOUR AD HERE"}
    </div>
  );
}

/** A vertical card is narrow, so the band has to shed the month and
 *  shrink its postage mark to stay on one line. */
function Band({
  addressSide,
  mailMonth,
  compact = false,
}: {
  addressSide: boolean;
  mailMonth: string;
  compact?: boolean;
}) {
  const wordmark = (
    <>
      Lowcountry <span className="text-brand-deep">Business</span> Spotlight
    </>
  );
  const size = compact ? "text-[6px]" : "text-[7px]";

  if (!addressSide) {
    return (
      <div className="flex items-center justify-center py-0.5 overflow-hidden">
        <span className={`${size} font-bold tracking-tight whitespace-nowrap`}>
          {wordmark}
          {!compact && (
            <span className="text-muted font-medium"> · {mailMonth}</span>
          )}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 py-0.5 overflow-hidden">
      <span
        className={`rounded-full bg-brand shrink-0 ${compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"}`}
      />
      <span className={`${size} font-bold tracking-tight truncate min-w-0`}>
        {wordmark}
      </span>
      <span
        className={`ml-auto shrink-0 border border-[#c9d3dd] rounded-[2px] text-center font-bold text-[#8fa0b0] leading-[1.15] ${
          compact ? "px-0.5 py-px text-[4px]" : "px-1 py-0.5 text-[5px]"
        }`}
      >
        US POSTAGE
        <br />
        PAID
      </span>
    </div>
  );
}

function Caption({ label }: { label: string }) {
  return (
    <p className="text-center text-[8px] font-semibold uppercase tracking-wider text-muted">
      {label}
    </p>
  );
}

function HorizontalSide({
  label,
  size,
  business,
  addressSide,
  mailMonth,
  mine,
}: {
  label: string;
  size: SpotSize;
  business: string;
  addressSide: boolean;
  mailMonth: string;
  /** Whether the buyer's ad is drawn on this side. It runs once. */
  mine: boolean;
}) {
  const { colSpan, rowSpan, half } = HORIZONTAL[size];
  const wholeSide = mine && rowSpan > 1;
  const topRemaining = mine && !wholeSide ? 4 - Math.min(4, colSpan) : 4;

  // A full page takes every ad slot on the side. The card's own branding
  // still runs, so the band stays.
  if (wholeSide) {
    return (
      <div className="bg-[#f4f2ee] border border-line rounded-[6px] p-2 grid gap-1.5">
        <MyAd business={business} half={false} style={{ height: 130 }} />
        <Band addressSide={addressSide} mailMonth={mailMonth} />
        <Caption label={label} />
      </div>
    );
  }

  return (
    <div className="bg-[#f4f2ee] border border-line rounded-[6px] p-2 grid gap-1.5">
      <div className="grid grid-cols-4 gap-1 h-[62px]">
        {mine && (
          <MyAd
            business={business}
            half={half}
            style={{ gridColumn: `span ${Math.min(4, colSpan)}` }}
          />
        )}
        {Array.from({ length: topRemaining }).map((_, i) => (
          <Slot key={`t${i}`} />
        ))}
      </div>
      <Band addressSide={addressSide} mailMonth={mailMonth} />
      <div className="grid grid-cols-4 gap-1 h-[62px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <Slot key={`b${i}`} />
        ))}
      </div>
      <Caption label={label} />
    </div>
  );
}

function VerticalSide({
  label,
  size,
  business,
  addressSide,
  mailMonth,
  mine,
}: {
  label: string;
  size: SpotSize;
  business: string;
  addressSide: boolean;
  mailMonth: string;
  /** Whether the buyer's ad is drawn on this side. It runs once. */
  mine: boolean;
}) {
  const { cols, rows } = GRID.vertical;
  const { colSpan, rowSpan, half } = VERTICAL[size];

  // The buyer's ad takes the top left block; every cell it does not
  // cover is another advertiser.
  const taken = new Set<string>();
  if (mine) {
    for (let r = 1; r <= rowSpan; r++) {
      for (let c = 1; c <= colSpan; c++) taken.add(`${c}:${r}`);
    }
  }
  const rest: { c: number; r: number }[] = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      if (!taken.has(`${c}:${r}`)) rest.push({ c, r });
    }
  }

  return (
    <div className="bg-[#f4f2ee] border border-line rounded-[6px] p-2 grid gap-1.5 max-w-[172px] mx-auto w-full overflow-hidden">
      <Band addressSide={addressSide} mailMonth={mailMonth} compact />
      <div className="grid grid-cols-2 grid-rows-4 gap-1 h-[184px]">
        {mine && (
          <MyAd
            business={business}
            half={half}
            style={{
              gridColumn: `1 / span ${colSpan}`,
              gridRow: `1 / span ${rowSpan}`,
            }}
          />
        )}
        {rest.map(({ c, r }) => (
          <Slot key={`${c}:${r}`} style={{ gridColumn: c, gridRow: r }} />
        ))}
      </div>
      <Caption label={label} />
    </div>
  );
}

export function CardPreview({
  size,
  business,
  zoneName,
  mailMonth,
  orientation = "horizontal",
}: {
  size: SpotSize;
  business: string;
  zoneName: string;
  mailMonth: string;
  orientation?: Orientation;
}) {
  const Side = orientation === "vertical" ? VerticalSide : HorizontalSide;
  const perSide = orientation === "vertical" ? "Eight and a half" : "Eight";

  return (
    <div className="bg-white rounded-[10px] border border-line p-4 shadow-[0_12px_30px_rgba(11,31,51,.12)] grid gap-2.5">
      <div className="grid sm:grid-cols-2 gap-2.5">
        <Side
          label="Standard layout · postage side"
          size={size}
          business={business}
          addressSide
          mailMonth={mailMonth}
          mine={false}
        />
        <Side
          label={
            size === "full"
              ? "Your full page · one whole side"
              : "Your ad size, to scale"
          }
          size={size}
          business={business}
          addressSide={false}
          mailMonth={mailMonth}
          mine
        />
      </div>
      <div className="grid gap-1.5 border-t border-line pt-2.5">
        <p className="text-center text-[9.5px] text-muted">
          {orientation === "vertical" ? "Vertical" : "Horizontal"} card ·{" "}
          {zoneName} edition, {mailMonth} · {perSide} medium spots per side
        </p>
        <p className="text-center text-[9.5px] text-body bg-surface border border-line rounded-[6px] px-2.5 py-1.5">
          {size === "full" ? (
            <>
              <b className="font-semibold">You take the whole side.</b> A full
              page is every ad spot on the non-postage side, so no other
              business appears next to you there. The postage side carries the
              rest of the card. Only one full page exists per card.
            </>
          ) : (
            <>
              <b className="font-semibold">Example only.</b> On the left is the
              standard card layout with the postage mark. On the right your ad
              is drawn at its true size, {GRID[orientation].footprints[size].note}.
              Your ad runs once, and where it lands is set during production and
              confirmed on your proof.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
