import Link from "next/link";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const COLS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Advertise",
    links: [
      { href: "/advertise", label: "Spotlight Postcards" },
      { href: "/pricing", label: "Pricing" },
      { href: "/coverage-map", label: "Coverage Map" },
      { href: "/mailing-calendar", label: "Mailing Calendar" },
      { href: "/gallery", label: "Card Gallery" },
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
  telephone: "+1-843-212-2969",
  email: "hello@lbspotlight.com",
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
  knowsAbout: [
    "Direct Mail Marketing",
    "Postcard Advertising",
    "Local Business Advertising",
  ],
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/lb-spotlight.png"
              alt="LB Spotlight"
              className="h-9 w-auto"
            />
            <span className="font-bold text-white text-[15px] tracking-tight">
              {SITE_NAME}
            </span>
          </div>
          <p className="mb-2">Summerville, SC</p>
          <p>843-212-2969 · hello@lbspotlight.com</p>
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
