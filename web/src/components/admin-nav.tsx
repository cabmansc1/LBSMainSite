"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Admin navigation, grouped by the job rather than by page.
 *
 * Sixteen flat links wrapped onto two rows and had no order anyone
 * could hold in their head, so finding a screen meant reading all of
 * them. Grouping is what lets it keep growing: a new page joins a
 * group instead of lengthening a list.
 *
 * The groups follow the questions actually being asked. "What am I
 * selling" is a different mode of work from "who are these people",
 * and both are different from writing a blog post.
 */
type Item = { href: string; label: string; hint?: string };
type Group = { label: string; items: Item[] };

const GROUPS: Group[] = [
  {
    label: "Selling",
    items: [
      { href: "/admin/cards", label: "Cards", hint: "What is filling now" },
      { href: "/admin/orders", label: "Orders", hint: "Paid, pending, refunds" },
      { href: "/admin/artwork", label: "Artwork", hint: "Sent in, still missing" },
      { href: "/admin/pricing", label: "Pricing", hint: "Sizes and rates" },
      { href: "/admin/categories", label: "Categories", hint: "Exclusivity list" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/users", label: "Accounts", hint: "Logins, view as" },
      { href: "/admin/directory", label: "Directory", hint: "Business listings" },
      { href: "/admin/listing-edits", label: "Listing changes", hint: "Advertiser edits to approve" },
      { href: "/admin/signups", label: "Signups", hint: "Awaiting review" },
      { href: "/admin/inquiries", label: "Inquiries", hint: "Messages to listings" },
      { href: "/admin/leads", label: "Leads", hint: "Forms and quizzes" },
      { href: "/admin/waitlist", label: "Waitlist", hint: "Category is taken" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/gallery", label: "Card gallery", hint: "Past card images" },
      { href: "/admin/blog", label: "Blog", hint: "Posts" },
      { href: "/admin/testimonials", label: "Testimonials", hint: "Quotes on the site" },
      { href: "/admin/stats", label: "Stats", hint: "Homepage figures" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/admin/qr", label: "QR codes", hint: "Generate and track" },
      { href: "/admin/import", label: "Import", hint: "Bulk CSV" },
      { href: "/admin/integrations", label: "Integrations", hint: "Email, GHL, MC" },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape. A menu that stays open after
  // you have moved on is worse than no menu.
  useEffect(() => {
    if (!open && !mobileOpen) return;
    const down = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) {
        setOpen(null);
        setMobileOpen(false);
      }
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open, mobileOpen]);

  // Navigating should always dismiss whatever is open.
  useEffect(() => {
    setOpen(null);
    setMobileOpen(false);
  }, [pathname]);

  const isCurrent = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  const groupHasCurrent = (g: Group) => g.items.some((i) => isCurrent(i.href));

  return (
    <div ref={wrap} className="flex items-center gap-1.5 flex-wrap">
      <Link
        href="/admin"
        className={`text-[13px] px-2.5 py-1.5 rounded-md transition-colors ${
          isCurrent("/admin")
            ? "bg-white/12 text-white font-semibold"
            : "text-[#93A5B8] hover:text-white"
        }`}
      >
        Dashboard
      </Link>

      <div className="hidden md:flex items-center gap-1.5">
        {GROUPS.map((g) => {
          const active = groupHasCurrent(g);
          return (
            <div key={g.label} className="relative">
              <button
                type="button"
                aria-expanded={open === g.label}
                aria-haspopup="true"
                onClick={() => setOpen(open === g.label ? null : g.label)}
                className={`text-[13px] px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors ${
                  active
                    ? "bg-white/12 text-white font-semibold"
                    : "text-[#93A5B8] hover:text-white"
                }`}
              >
                {g.label}
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M2 4.5 6 8.5l4-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {open === g.label && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-[248px] bg-white text-ink border border-line rounded-(--radius-card) shadow-[0_12px_34px_rgba(8,21,39,.22)] overflow-hidden">
                  {g.items.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      className={`block px-4 py-2.5 border-b border-line last:border-b-0 hover:bg-surface ${
                        isCurrent(i.href) ? "bg-brand-tint" : ""
                      }`}
                    >
                      <span className="text-[13.5px] font-semibold block">
                        {i.label}
                      </span>
                      {i.hint && (
                        <span className="text-[12px] text-muted block">{i.hint}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-expanded={mobileOpen}
        className="md:hidden text-[13px] px-2.5 py-1.5 rounded-md text-[#93A5B8] hover:text-white"
      >
        {mobileOpen ? "Close" : "Menu"}
      </button>

      {mobileOpen && (
        <div className="md:hidden absolute left-0 right-0 top-full z-50 bg-white text-ink border-y border-line max-h-[70vh] overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <div className="text-[10.5px] font-bold uppercase tracking-widest text-muted px-5 pt-4 pb-1.5">
                {g.label}
              </div>
              {g.items.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  className={`block px-5 py-2.5 text-[14px] border-b border-line ${
                    isCurrent(i.href) ? "bg-brand-tint font-semibold" : ""
                  }`}
                >
                  {i.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
