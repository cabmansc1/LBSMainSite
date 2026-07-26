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
    title: page.title,
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
