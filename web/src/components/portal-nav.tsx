"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Portal navigation: sidebar on desktop, bottom bar on phones. Order is
 * Home, To do, Cards, Listings, Messages, with Results, Profile and
 * Billing below the main destinations.
 *
 * The mobile bar holds five and no more. Results moved off it to make
 * room for To do, because a print deadline is worth more of a phone
 * screen than a scan chart is.
 */

type Item = {
  href: string;
  label: string;
  short: string;
  icon: React.ReactNode;
  badge?: number;
  /** Draws the badge as a warning rather than a plain count. */
  urgent?: boolean;
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
  cardCount = 0,
  listingCount = 0,
  todoCount = 0,
  todoOverdue = false,
}: {
  /** "sidebar" renders the desktop rail; "bottom" the mobile bar. */
  variant: "sidebar" | "bottom";
  unreadMessages?: number;
  cardCount?: number;
  listingCount?: number;
  todoCount?: number;
  /** At least one to-do has a date on it that has gone by. */
  todoOverdue?: boolean;
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
      href: "/account/todos",
      label: "To do",
      short: "To do",
      mobile: true,
      badge: todoCount,
      urgent: todoOverdue,
      icon: icon(
        <>
          <path d="M9 11.5 11 13.5 15.5 9" />
          <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
          <path d="M8 2.5v4M16 2.5v4" />
        </>,
      ),
    },
    {
      href: "/account/cards",
      label: "Cards",
      short: "Cards",
      mobile: true,
      badge: cardCount,
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
      badge: listingCount,
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
      mobile: false,
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
              <span
                className={`ml-auto text-[11px] font-extrabold rounded-full px-1.5 num ${
                  i.urgent ? "bg-[#e5484d] text-white" : "bg-cta text-navy-950"
                }`}
              >
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
                <span
                  className={`absolute top-0.5 left-1/2 ml-1.5 text-[10px] font-extrabold rounded-full px-1.5 num ${
                    i.urgent ? "bg-[#e5484d] text-white" : "bg-cta text-navy-950"
                  }`}
                >
                  {i.badge}
                </span>
              )}
            </Link>
        ))}
    </nav>
  );
}
