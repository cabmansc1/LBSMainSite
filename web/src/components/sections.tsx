import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="max-w-[560px] mb-11">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-[26px] md:text-[32px] font-bold tracking-[-0.025em] text-balance">
        {title}
      </h2>
      {sub && <p className="mt-3 text-[14.5px] text-muted">{sub}</p>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  /** For pages that link to one card in a list, such as the to-dos. */
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`bg-white border border-line rounded-(--radius-card) ${className}`}
    >
      {children}
    </div>
  );
}

export function StatusChip({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "danger" | "info";
  children: ReactNode;
}) {
  const dot = {
    ok: "bg-ok",
    warn: "bg-cta",
    danger: "bg-danger",
    info: "bg-brand",
  }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-surface border border-line text-body whitespace-nowrap">
      <span className={`w-[7px] h-[7px] rounded-full ${dot}`} />
      {children}
    </span>
  );
}


export function CtaBand({
  title,
  sub,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  sub: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="bg-navy-950 text-white rounded-2xl px-8 py-11 md:px-10 flex flex-wrap items-center justify-between gap-6">
      <div>
        <h3 className="text-xl md:text-[27px] font-bold tracking-[-0.025em] max-w-[26ch] text-balance">
          {title}
        </h3>
        <p className="text-[#93A5B8] text-[14.5px] mt-2">{sub}</p>
      </div>
      <Button href={ctaHref}>{ctaLabel}</Button>
    </div>
  );
}

export function FillMeter({
  taken,
  total,
}: {
  taken: number;
  total: number;
}) {
  const pct = Math.min(100, Math.round((taken / total) * 100));
  return (
    <div className="flex items-center gap-2.5 min-w-[140px]">
      <div
        className="h-1.5 flex-1 rounded-full bg-line overflow-hidden"
        role="meter"
        aria-valuenow={taken}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${taken} of ${total} spots filled`}
      >
        <div
          className={`h-full rounded-full ${pct >= 80 ? "bg-cta" : "bg-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted num whitespace-nowrap">
        {taken}/{total} spots
      </span>
    </div>
  );
}
