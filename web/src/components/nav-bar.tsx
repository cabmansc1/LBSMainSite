"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

/* Ordered so the mailing business reads as one run — advertise it, see
   where it goes, see what it looked like, browse who is on it — with
   Printing after that as the separate thing it is, rather than wedged
   into the middle of a sequence it has nothing to do with.

   No "Home" item: the logo to the left is a link home on every page and
   is the convention everywhere, so the slot buys back the width Printing
   needs rather than spending it twice.

   Advertise points at the hub, not /pricing. The Reserve a Spot button
   already goes to /pricing, and two nav elements aimed at one URL is a
   wasted slot — so the link browses and the button buys. It also gives
   the pillar page a sitewide internal link, which is the thing a pillar
   page most needs and the one it did not have.

   Blog, Printing and Resources are all deliberately absent. A flat bar
   has no room to grow — every item added shortens the rest and makes
   the whole thing harder to scan — and none of these three is what
   somebody arrives to do. All three are in the footer, which renders on
   every page too, so nothing here is unreachable.

   Printing is the one this costs something. It is a page written to
   rank, and a nav link is a stronger internal signal than a footer one.
   The trade was made knowingly: a crowded bar hurts every page, and the
   footer link plus the one on the direct mail hub carry it. If a
   dropdown ever lands, Printing and Resources are the two that should
   come back first. */
const LINKS = [
  { href: "/direct-mail-marketing", label: "Advertise" },
  { href: "/coverage-map", label: "Service Areas" },
  // The archive of mailed cards is the strongest proof the product is
  // real, so it belongs in the nav rather than buried in the footer.
  { href: "/gallery", label: "Past Cards" },
  /* Local Stories and Events are built and reachable, and deliberately
     not linked from here yet. A nav item pointing at an empty page
     advertises that a section was started and abandoned, which is worse
     than not having it at all. Both go back the moment there is a first
     story and a first event to land on. */
  { href: "/directory", label: "Directory" },
];

export function NavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    /* Sticky on desktop only. On a phone the menu drops out of this bar
       and a pinned header eats a real share of a short screen, so it
       keeps scrolling away there. Anything the page anchors to needs a
       scroll-margin clear of this, or the jump lands underneath it. */
    <nav className="bg-navy-950 text-white md:sticky md:top-0 md:z-50">
      <div className="mx-auto max-w-[1120px] px-6 py-4 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3">
          {/* The file is a 58KB PNG and this draws it 34 pixels wide on
              every page in the site, so the size given here is the size
              it is drawn at rather than the size it was saved at. Eager
              because the header is above the fold everywhere and there
              is nothing to gain by deferring it. */}
          <Image
            src="/brand/lb-spotlight.png"
            alt="LB Spotlight"
            width={34}
            height={40}
            loading="eager"
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
          {/* Always the same link, signed in or not, because reading the
              session here would make every page dynamic and eleven of
              them are still prerendered. /login already redirects to the
              account when there is a session, so somebody signed in
              lands where they expected either way. */}
          <Link
            href="/login"
            className="text-[13.5px] text-[#AEBDCC] font-medium hover:text-white whitespace-nowrap"
          >
            Advertiser login
          </Link>
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
            href="/login"
            className="text-[14px] text-[#AEBDCC] font-medium"
            onClick={() => setOpen(false)}
          >
            Advertiser login
          </Link>
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
