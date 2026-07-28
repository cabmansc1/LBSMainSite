"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Portal navigation: sidebar on desktop, bottom bar on phones. Order is
 * Home, Cards, Listings, Messages, Results, with Billing below the five
 * main destinations and off the mobile bar.
 */

type Item = {
  href: string;
  label: string;
  short: string;
  icon: React.ReactNode;
  badge?: number;
  mobile: boolean;
};

const icon = (d: React.ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4 shrink-0 max-md:w-5 max-md:h-5"
  >
    {d}
  </svg>
);

export function PortalNav({
  variant,
  unreadMessages = 0,
  cardsNeedingAction = 0,
}: {
  /** "sidebar" renders the desktop rail; "bottom" the mobile bar. */
  variant: "sidebar" | "bottom";
  unreadMessages?: number;
  cardsNeedingAction?: number;
}) {
  const pathname = usePathname();

  const items: Item[] = [
    {
      href: "/account",
      label: "Home",
      short: "Home",
      mobile: true,
      icon: icon(
        <>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </>,
      ),
    },
    {
      href: "/account/cards",
      label: "Cards",
      short: "Cards",
      mobile: true,
      badge: cardsNeedingAction,
      icon: icon(
        <>
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <path d="M3 9h18M8 4v16" />
        </>,
      ),
    },
    {
      href: "/account/listings",
      label: "Listings",
      short: "Listings",
      mobile: true,
      icon: icon(
        <>
          <path d="M4 21V8l8-5 8 5v13" />
          <path d="M9 21v-6h6v6" />
        </>,
      ),
    },
    {
      href: "/account/messages",
      label: "Messages",
      short: "Messages",
      mobile: true,
      badge: unreadMessages,
      icon: icon(
        <>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m3.5 7 8.5 6 8.5-6" />
        </>,
      ),
    },
    {
      href: "/account/results",
      label: "Results",
      short: "Results",
      mobile: true,
      icon: icon(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
    },
    {
      href: "/account/profile",
      label: "Profile",
      short: "Profile",
      mobile: false,
      icon: icon(
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </>,
      ),
    },
    {
      href: "/account/billing",
      label: "Billing",
      short: "Billing",
      mobile: false,
      icon: icon(
        <>
          <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
          <path d="M2.5 10h19" />
        </>,
      ),
    },
  ];

  const isActive = (href: string) =>
    href === "/account" ? pathname === "/account" : pathname.startsWith(href);

  if (variant === "sidebar") {
    return (
      <nav className="hidden md:flex flex-col gap-0.5" aria-label="Portal">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={isActive(i.href) ? "page" : undefined}
            className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-[9px] text-[13.5px] transition-colors ${
              isActive(i.href)
                ? "bg-brand/15 text-white font-semibold"
                : "text-[#b6c6d6] hover:bg-white/6 hover:text-white font-medium"
            }`}
          >
            {i.icon}
            {i.label}
            {!!i.badge && i.badge > 0 && (
              <span className="ml-auto bg-cta text-navy-950 text-[11px] font-extrabold rounded-full px-1.5 num">
                {i.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 bg-white border-t border-line pb-[env(safe-area-inset-bottom)]"
        aria-label="Portal"
      >
        {items
          .filter((i) => i.mobile)
          .map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={isActive(i.href) ? "page" : undefined}
              className={`relative grid justify-items-center gap-0.5 py-2 text-[10.5px] font-semibold ${
                isActive(i.href) ? "text-brand-deep" : "text-muted"
              }`}
            >
              {i.icon}
              {i.short}
              {!!i.badge && i.badge > 0 && (
                <span className="absolute top-0.5 left-1/2 ml-1.5 bg-cta text-navy-950 text-[10px] font-extrabold rounded-full px-1.5 num">
                  {i.badge}
                </span>
              )}
            </Link>
        ))}
    </nav>
  );
}
