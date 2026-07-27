"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/coverage-map", label: "Service Areas" },
  { href: "/pricing", label: "Advertise" },
  // The archive of mailed cards is the strongest proof the product is
  // real, so it belongs in the nav rather than buried in the footer.
  { href: "/gallery", label: "Past Cards" },
  { href: "/directory", label: "Directory" },
  { href: "/blog", label: "Blog" },
];

export function NavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="bg-navy-950 text-white">
      <div className="mx-auto max-w-[1120px] px-6 py-4 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/lb-spotlight.png"
            alt="LB Spotlight"
            className="h-10 w-auto"
          />
          <span className="font-bold text-[15px] tracking-tight whitespace-nowrap max-[380px]:hidden">
            Lowcountry Business Spotlight
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 ml-auto">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-[13.5px] ${
                pathname === l.href
                  ? "text-white font-semibold"
                  : "text-[#AEBDCC] font-medium hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/pricing"
            className="bg-cta text-navy-950 text-[13px] font-bold px-4 py-2 rounded-(--radius-btn) hover:bg-[#FFA033] whitespace-nowrap"
          >
            Reserve a Spot
          </Link>
        </div>

        <button
          className="md:hidden ml-auto w-9 h-9 rounded-lg bg-white/10 flex flex-col items-center justify-center gap-[5px]"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className="w-4 h-[1.5px] bg-white rounded" />
          <span className="w-4 h-[1.5px] bg-white rounded" />
          <span className="w-4 h-[1.5px] bg-white rounded" />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 px-6 py-4 flex flex-col gap-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[14px] text-[#AEBDCC] font-medium"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/pricing"
            className="bg-cta text-navy-950 text-[13px] font-bold px-4 py-2 rounded-(--radius-btn) w-max"
            onClick={() => setOpen(false)}
          >
            Reserve a Spot
          </Link>
        </div>
      )}
    </nav>
  );
}
