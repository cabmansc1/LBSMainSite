import Image from "next/image";
import Link from "next/link";
import { PRINTING_LIVE } from "@/lib/print-products";
import { NewsletterSignup } from "@/components/newsletter-signup";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_INTL,
  SITE_NAME,
  SITE_URL,
  SOCIAL_LINKS,
} from "@/lib/seo";

const COLS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    /* "Services" rather than "Advertise" because print is in here now
       and it is not advertising. The nav separates the two deliberately;
       filing Printing under a heading that says Advertise would undo
       that in the one place every page shows.

       No fourth column instead: the grid below is md:grid-cols-4 and
       already holds the brand block plus three, so a fourth would wrap
       one orphan onto its own row. */
    heading: "Services",
    links: [
      { href: "/advertise", label: "Spotlight Postcards" },
      { href: "/pricing", label: "Pricing" },
      { href: "/coverage-map", label: "Coverage Map" },
      { href: "/mailing-calendar", label: "Mailing Calendar" },
      { href: "/gallery", label: "Card Gallery" },
      ...(PRINTING_LIVE
        ? [{ href: "/printing", label: "Print Services" }]
        : []),
      // Resources is the index over this calculator and the guides. The
      // calculator keeps its own line because it is the one people come
      // looking for by name, and a footer is where you go when you
      // already know what you want.
      { href: "/resources", label: "Resources" },
      { href: "/roi-calculator", label: "ROI Calculator" },
    ],
  },
  {
    heading: "Directory",
    links: [
      { href: "/directory", label: "Browse Businesses" },
      { href: "/deals", label: "Local Deals" },
      { href: "/directory-signup", label: "List Your Business" },
      { href: "/login", label: "Advertiser Login" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

/**
 * Sitewide LocalBusiness schema, matching what the legacy footer.php
 * emitted on every page. The areaServed cities and the opening hours are
 * not decoration: they are the local signals the old site carried on all
 * 161 URLs, and dropping them would be a sitewide regression rather than
 * a page-level one.
 */
const AREA_SERVED = [
  "Summerville",
  "Mount Pleasant",
  "Daniel Island",
  "North Charleston",
  "Moncks Corner",
  "Charleston",
];

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE_NAME,
  description:
    "Billboard-style direct mail marketing serving the Charleston, SC metro area. Affordable postcard advertising with exclusive category placement.",
  url: SITE_URL,
  logo: `${SITE_URL}/brand/lb-spotlight.png`,
  telephone: CONTACT_PHONE_INTL,
  email: CONTACT_EMAIL,
  address: {
    "@type": "PostalAddress",
    streetAddress: "PO Box 357",
    addressLocality: "Huger",
    addressRegion: "SC",
    postalCode: "29450",
    addressCountry: "US",
  },
  areaServed: AREA_SERVED.map((name) => ({
    "@type": "City",
    name,
    containedInPlace: { "@type": "State", name: "South Carolina" },
  })),
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "10:00",
      closes: "16:00",
    },
  ],
  priceRange: "$$",
  // What tells Google these pages and this domain are one organisation.
  // Without it the profiles and the site are two strangers with the same
  // name, and neither lends the other anything.
  sameAs: SOCIAL_LINKS.map((s) => s.href),
  knowsAbout: [
    "Direct Mail Marketing",
    "Postcard Advertising",
    "Local Business Advertising",
  ],
};

/** Drawn rather than fetched, so a footer costs no extra requests. */
const SOCIAL_ICON: Record<string, React.ReactNode> = {
  facebook: (
    <path d="M14 8h2V5h-2.5A3.5 3.5 0 0 0 10 8.5V11H8v3h2v7h3v-7h2.3l.7-3H13V9a1 1 0 0 1 1-1z" />
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="1.3" />
    </>
  ),
};

export function SiteFooter() {
  return (
    <footer className="bg-navy-950 text-[#93A5B8] text-[13.5px] mt-auto">
      {/* Renders its own band, and nothing at all on the signed-in and
          admin routes this footer also reaches. */}
      <NewsletterSignup />
      <div className="mx-auto max-w-[1120px] px-6 py-13 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-3 mb-3.5">
            {/* The same mark as the nav, a little smaller, and told the
                size it is drawn at for the same reason. It stays lazy:
                a footer is below the fold by definition. */}
            <Image
              src="/brand/lb-spotlight.png"
              alt="LB Spotlight"
              width={30}
              height={36}
              className="h-9 w-auto"
            />
            <span className="font-bold text-white text-[15px] tracking-tight">
              {SITE_NAME}
            </span>
          </div>
          <p className="mb-2">Summerville, SC</p>
          <p>{CONTACT_PHONE} · {CONTACT_EMAIL}</p>
          {/* Under the contact details, because following us is the same
              kind of thing as ringing us and belongs beside it rather
              than in a column of site links. */}
          <div className="flex gap-2.5 mt-4">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.key}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${SITE_NAME} on ${s.label}`}
                title={s.label}
                className="w-9 h-9 rounded-[9px] bg-white/8 border border-white/12 flex items-center justify-center text-[#93A5B8] hover:bg-brand hover:text-navy-950 hover:border-brand transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  {SOCIAL_ICON[s.key]}
                </svg>
              </a>
            ))}
          </div>
        </div>
        {COLS.map((col) => (
          <div key={col.heading}>
            <h5 className="text-white text-xs font-semibold uppercase tracking-widest mb-3.5">
              {col.heading}
            </h5>
            <ul className="flex flex-col gap-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/8 py-4.5 text-center text-xs text-[#67768A]">
        © {new Date().getFullYear()} {SITE_NAME} · All rights reserved
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
    </footer>
  );
}
