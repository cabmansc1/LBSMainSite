import Link from "next/link";
import { DirectoryBrowser } from "@/components/directory-browser";
import {
  getBusinesses,
  getFilterOptions,
  usingSampleData,
  type DirectoryFilters,
} from "@/lib/directory";
import { SITE_URL } from "@/lib/seo";

/**
 * Shared server shell for /directory and its category/location/tag
 * variants, so all four routes stay identical except the filter.
 */
export async function DirectoryPageShell({
  filters = {},
  heading,
}: {
  filters?: DirectoryFilters;
  heading?: string;
}) {
  const [businesses, options] = await Promise.all([
    getBusinesses(filters),
    getFilterOptions(),
  ]);

  // ItemList structured data: tells search engines this page is a
  // ranked list of local businesses, each with its own indexable page.
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: businesses.slice(0, 25).map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/business/${b.slug}`,
      name: b.name,
    })),
  };

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Business directory
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[24ch] text-balance">
            {heading ?? "Trusted local businesses, all in one place."}
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[56ch]">
            Every listing is a real Lowcountry business. Advertisers on our
            postcards get featured placement.{" "}
            <Link href="/directory-signup" className="text-brand hover:underline">
              List your business free.
            </Link>
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-10">
        {usingSampleData() && (
          <p className="mb-6 text-[12.5px] text-muted bg-surface border border-line rounded-lg px-3.5 py-2.5 w-max">
            Preview listings shown. Live listings connect with the staging
            database.
          </p>
        )}
        <DirectoryBrowser
          businesses={businesses}
          categories={options.categories}
          locations={options.locations}
          activeCategory={filters.category}
          activeLocation={filters.location}
        />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
    </>
  );
}
