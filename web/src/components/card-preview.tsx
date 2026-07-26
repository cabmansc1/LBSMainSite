"use client";

import type { SpotSize } from "@/lib/pricing";

/**
 * The printed card, both sides.
 *
 * A horizontal card carries four mediums along the top and four along
 * the bottom of each side, with the branding and postage band between
 * the rows on the address side. One slot is one medium, so an ad's
 * footprint is drawn at its real relative size: a large covers two
 * slots, a triple three, a quad a whole row, and a small is half a slot.
 */

const SLOTS_PER_ROW = 4;

/** Slots wide, and whether it only fills half the slot's height. */
const FOOTPRINT: Record<SpotSize, { span: number; half: boolean; note: string }> = {
  small: { span: 1, half: true, note: "half a medium slot" },
  medium: { span: 1, half: false, note: "one slot" },
  large: { span: 2, half: false, note: "two slots" },
  triple: { span: 3, half: false, note: "three slots" },
  quad: { span: 4, half: false, note: "a full row" },
};

function Slot({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[3px] bg-[#e8edf2] border border-[#dbe3ea] flex items-center justify-center text-[7px] font-bold text-[#9aa8b6] ${className}`}
    >
      {children ?? "AD"}
    </div>
  );
}

function Side({
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
  const { span, half } = FOOTPRINT[size];
  // The buyer's ad sits in the top row; the rest of that row and the
  // whole bottom row are other advertisers.
  const topFilled = Math.min(SLOTS_PER_ROW, span);
  const topRemaining = SLOTS_PER_ROW - topFilled;

  const mine = (
    <div
      style={{ gridColumn: `span ${topFilled}` }}
      className={`rounded-[3px] bg-navy-950 text-white flex items-center justify-center text-center px-1 font-semibold leading-tight ${
        half ? "self-start h-[calc(50%-1px)] text-[6.5px]" : "text-[8px]"
      }`}
    >
      {business.trim() || "YOUR AD HERE"}
    </div>
  );

  return (
    <div className="bg-[#f4f2ee] border border-line rounded-[6px] p-2 grid gap-1.5">
      <div className="grid grid-cols-4 gap-1 h-[62px]">
        {mine}
        {Array.from({ length: topRemaining }).map((_, i) => (
          <Slot key={`t${i}`} />
        ))}
      </div>

      {addressSide ? (
        <div className="flex items-center gap-1.5 py-0.5">
          <span className="w-3.5 h-3.5 rounded-full bg-brand shrink-0" />
          <span className="text-[7px] font-bold tracking-tight truncate">
            Lowcountry <span className="text-brand-deep">Business</span> Spotlight
          </span>
          <span className="ml-auto border border-[#c9d3dd] rounded-[2px] px-1 py-0.5 text-[5px] font-bold text-[#8fa0b0] text-center leading-[1.15]">
            US POSTAGE
            <br />
            PAID
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center py-0.5">
          <span className="text-[7px] font-bold tracking-tight">
            Lowcountry <span className="text-brand-deep">Business</span> Spotlight
            <span className="text-muted font-medium"> · {mailMonth}</span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1 h-[62px]">
        {Array.from({ length: SLOTS_PER_ROW }).map((_, i) => (
          <Slot key={`b${i}`} />
        ))}
      </div>

      <p className="text-center text-[8px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
    </div>
  );
}

export function CardPreview({
  size,
  business,
  zoneName,
  mailMonth,
}: {
  size: SpotSize;
  business: string;
  zoneName: string;
  mailMonth: string;
}) {
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
      <p className="text-center text-[9.5px] text-muted">
        Your ad shown at its real size: {FOOTPRINT[size].note}. {zoneName}{" "}
        edition, {mailMonth}. Eight medium spots per side.
      </p>
    </div>
  );
}
