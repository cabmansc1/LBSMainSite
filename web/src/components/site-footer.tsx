import Link from "next/link";
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

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE_NAME,
  url: SITE_URL,
  telephone: "+1-843-212-2969",
  email: "hello@lbspotlight.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Summerville",
    addressRegion: "SC",
    addressCountry: "US",
  },
};

export function SiteFooter() {
  return (
    <footer className="bg-navy-950 text-[#93A5B8] text-[13.5px] mt-auto">
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
