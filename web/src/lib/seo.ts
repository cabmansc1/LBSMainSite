import type { Metadata } from "next";

/**
 * Centralized SEO registry, the successor to includes/seo-config.php.
 * Each route exports `metadata` (static) or `generateMetadata` (dynamic)
 * built from this map, so titles and descriptions stay in one file.
 *
 * Remaining entries port over route by route during Phase 2; parity is
 * verified by the URL crawl diff before cutover.
 */
export const SITE_NAME = "Lowcountry Business Spotlight";
export const SITE_URL = "https://www.lowcountrybusinessspotlight.com";

/**
 * The address we ask people to write to, and the one mail arrives from.
 *
 * Here rather than typed into each page, because it was hardcoded in
 * six of them, including two LocalBusiness JSON-LD blocks, and moving
 * from lbspotlight.com meant finding all six. EMAIL_FROM defaults to
 * the same address, so what a customer is told to write to is what
 * their reply goes to.
 */
export const CONTACT_EMAIL = "hello@lowcountrybusinessspotlight.com";

/**
 * The phone number, in the three shapes anything needs it.
 *
 * It was written out by hand in fourteen files and four different
 * formats, so changing it meant finding every one and getting each
 * format right, and a missed instance is a customer ringing a number we
 * no longer answer. Three constants rather than one because a tel: href
 * and a JSON-LD telephone field are not free text: the first must be
 * digits, the second is read by machines that expect E.164.
 */
export const CONTACT_PHONE = "854-946-4500";
/** For a tel: href. Digits only, with the country code. */
export const CONTACT_PHONE_TEL = "+18549464500";
/** For schema.org telephone fields. */
export const CONTACT_PHONE_INTL = "+1-854-946-4500";

type PageSeo = {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
};

export const PAGE_SEO: Record<string, PageSeo> = {
  home: {
    title: `Direct Mail Advertising in Charleston SC | ${SITE_NAME}`,
    description:
      "Shared 9x12 postcards mailed to 5,000+ Lowcountry households. One exclusive spot per industry, free ad design, from $249 per mailing.",
    canonical: "/",
  },
  pricing: {
    title: `Pricing | ${SITE_NAME}`,
    description:
      "Transparent pricing for all Lowcountry Business Spotlight products: Spotlight Postcards from $249 and free directory listings. No hidden fees.",
    canonical: "/pricing",
  },
  directory: {
    title: `Charleston Area Business Directory | ${SITE_NAME}`,
    description:
      "Find trusted local businesses across the Charleston Lowcountry. Free listings for local businesses.",
    canonical: "/directory",
  },
};

export function buildMetadata(key: keyof typeof PAGE_SEO): Metadata {
  const page = PAGE_SEO[key];
  return {
    // These titles already carry the brand, so they bypass the layout
    // template rather than picking it up a second time.
    title: { absolute: page.title },
    description: page.description,
    alternates: page.canonical
      ? { canonical: `${SITE_URL}${page.canonical === "/" ? "" : page.canonical}` }
      : undefined,
    robots: page.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: page.title,
      description: page.description,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}
