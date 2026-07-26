"use client";

import type { SpotSize } from "@/lib/pricing";
import type { Orientation } from "@/lib/card-capacity";

/**
 * The printed card, both sides, in the orientation the card is actually
 * printed in.
 *
 * Horizontal: four medium slots along the top and four along the bottom
 * of each side, with the branding and postage band between the rows.
 * Vertical: the band runs across the top and the slots sit two wide and
 * four deep beneath it.
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
};

const VERTICAL: Record<SpotSize, Footprint> = {
  small: { colSpan: 1, rowSpan: 1, half: true, note: "half a medium slot" },
  medium: { colSpan: 1, rowSpan: 1, half: false, note: "one slot" },
  large: { colSpan: 1, rowSpan: 2, half: false, note: "two slots stacked" },
  triple: { colSpan: 1, rowSpan: 3, half: false, note: "three slots stacked" },
  quad: { colSpan: 2, rowSpan: 2, half: false, note: "a two by two block" },
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
}: {
  label: string;
  size: SpotSize;
  business: string;
  addressSide: boolean;
  mailMonth: string;
}) {
  const { colSpan, half } = HORIZONTAL[size];
  const topRemaining = 4 - Math.min(4, colSpan);

  return (
    <div className="bg-[#f4f2ee] border border-line rounded-[6px] p-2 grid gap-1.5">
      <div className="grid grid-cols-4 gap-1 h-[62px]">
        <MyAd
          business={business}
          half={half}
          style={{ gridColumn: `span ${Math.min(4, colSpan)}` }}
        />
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
}: {
  label: string;
  size: SpotSize;
  business: string;
  addressSide: boolean;
  mailMonth: string;
}) {
  const { cols, rows } = GRID.vertical;
  const { colSpan, rowSpan, half } = VERTICAL[size];

  // The buyer's ad takes the top left block; every cell it does not
  // cover is another advertiser.
  const taken = new Set<string>();
  for (let r = 1; r <= rowSpan; r++) {
    for (let c = 1; c <= colSpan; c++) taken.add(`${c}:${r}`);
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
        <MyAd
          business={business}
          half={half}
          style={{
            gridColumn: `1 / span ${colSpan}`,
            gridRow: `1 / span ${rowSpan}`,
          }}
        />
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
          label="Front"
          size={size}
          business={business}
          addressSide={false}
          mailMonth={mailMonth}
        />
        <Side
          label="Address side"
          size={size}
          business={business}
          addressSide
          mailMonth={mailMonth}
        />
      </div>
      <div className="grid gap-1.5 border-t border-line pt-2.5">
        <p className="text-center text-[9.5px] text-muted">
          {orientation === "vertical" ? "Vertical" : "Horizontal"} card ·{" "}
          {zoneName} edition, {mailMonth} · {perSide} medium spots per side
        </p>
        <p className="text-center text-[9.5px] text-body bg-surface border border-line rounded-[6px] px-2.5 py-1.5">
          <b className="font-semibold">Example layout only.</b> Your ad is shown
          at its true size on the card,{" "}
          {GRID[orientation].footprints[size].note}, but the position here is
          illustrative. Where your ad actually lands is set during production
          and confirmed on your proof.
        </p>
      </div>
    </div>
  );
}
