import Link from "next/link";
import { DirectoryBrowser } from "@/components/directory-browser";
import {
  getBusinesses,
  getFilterOptions,
  usingSampleData,
  type DirectoryFilters,
} from "@/lib/directory";
import { getDealsByBusiness } from "@/lib/lowco-deals";
import { SITE_URL } from "@/lib/seo";

/**
 * Shared server shell for /directory and its category/location/tag
 * variants, so all four routes stay identical except the filter.
 */
export async function DirectoryPageShell({
  filters = {},
  heading,
  intro,
  faqs,
}: {
  filters?: DirectoryFilters;
  heading?: string;
  /** Editorial paragraph shown under the hero (category pages). */
  intro?: string;
  /** FAQ block rendered below the listings, with FAQPage JSON-LD. */
  faqs?: { q: string; a: string }[];
}) {
  const [businesses, options, dealsByBiz] = await Promise.all([
    getBusinesses(filters),
    getFilterOptions(),
    getDealsByBusiness(),
  ]);

  const lowcoDealCounts = Object.fromEntries(
    Object.entries(dealsByBiz).map(([k, v]) => [k, v.length]),
  );

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

  const faqJsonLd =
    faqs && faqs.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

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
            {intro ?? (
              <>
                Every listing is a real Lowcountry business. Advertisers on our
                postcards get featured placement.{" "}
                <Link href="/directory-signup" className="text-brand hover:underline">
                  List your business free.
                </Link>
              </>
            )}
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
          lowcoDealCounts={lowcoDealCounts}
        />

        {faqs && faqs.length > 0 && (
          <section className="mt-14 max-w-[720px]">
            <h2 className="text-[19px] font-bold tracking-tight mb-5">
              Common questions
            </h2>
            <div className="grid gap-3">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="bg-white border border-line rounded-xl px-5 py-4 group"
                >
                  <summary className="text-[14.5px] font-semibold cursor-pointer list-none flex items-center justify-between gap-4">
                    {f.q}
                    <span className="text-muted text-lg leading-none group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="text-sm text-body leading-relaxed mt-2.5">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
    </>
  );
}
