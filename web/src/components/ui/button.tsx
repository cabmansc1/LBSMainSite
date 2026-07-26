import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "cta" | "ghost" | "navy" | "quiet";

const styles: Record<Variant, string> = {
  cta: "bg-cta text-navy-950 hover:bg-cta-hover hover:text-white",
  ghost: "bg-transparent text-white border border-white/30 hover:border-white/60",
  navy: "bg-navy-950 text-white hover:bg-navy-800",
  quiet: "bg-white text-ink border border-line-strong hover:border-faint",
};

export function Button({
  href,
  variant = "cta",
  small = false,
  children,
  className = "",
}: {
  href: string;
  variant?: Variant;
  small?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-(--radius-btn) transition-colors";
  const size = small ? "text-[13px] px-3.5 py-2" : "text-[15px] px-6 py-3";
  return (
    <Link href={href} className={`${base} ${size} ${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}
