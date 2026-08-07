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

/** Eight rows of three on a wide screen, twelve rows of two on a tablet. */
export const PAGE_SIZE = 24;

/**
 * The `page` query parameter, as a page number.
 *
 * Anything that is not a page past the first — a word, a negative, a
 * repeated parameter — reads as the first page. A URL nobody meant to
 * write should still answer with the directory.
 */
export function readPageParam(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(n) && n > 1 ? Math.floor(n) : 1;
}

/**
 * The address of one page of listings.
 *
 * The first page is the bare path. /directory and /directory?page=1
 * would otherwise be two URLs for one set of listings, and the bare
 * one is the one everything already links to.
 */
export function directoryPageUrl(basePath: string, page: number): string {
  return page > 1 ? `${basePath}?page=${page}` : basePath;
}

/**
 * Shared server shell for /directory and its category/location/tag
 * variants, so all four routes stay identical except the filter.
 */
export async function DirectoryPageShell({
  filters = {},
  basePath,
  page: requestedPage,
  heading,
  intro,
  faqs,
}: {
  filters?: DirectoryFilters;
  /** This route's own path, for the page links and nothing else. */
  basePath: string;
  /** The page asked for in the query string, before clamping. */
  page: number;
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

  // Which page you asked for is decided here rather than in the
  // browser, because the query string is only legible on this side of
  // the boundary during the render that produces the HTML. Deciding it
  // there meant every page of the directory shipped the first page's
  // listings, and the ninety-six businesses past page one had no link
  // pointing at them from anywhere a crawler could reach.
  //
  // Featured listings are their own block and repeat on every page, so
  // paging counts the rest.
  const featured = businesses.filter((b) => b.isFeatured);
  const rest = businesses.filter((b) => !b.isFeatured);
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  // A page past the end shows the last one rather than nothing at all.
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageRows = rest.slice(pageStart, pageStart + PAGE_SIZE);

  // ItemList structured data: tells search engines this page is a
  // ranked list of local businesses, each with its own indexable page.
  // It describes the listings this page actually draws, so page two
  // does not announce page one's businesses a second time.
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [...featured, ...pageRows].slice(0, 25).map((b, i) => ({
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
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-26">
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

      <div className="mx-auto max-w-[1120px] px-6 pb-12">
        <DirectoryBrowser
          businesses={businesses}
          categories={options.categories}
          locations={options.locations}
          tags={options.tags}
          activeCategory={filters.category}
          activeLocation={filters.location}
          activeTag={filters.tag}
          lowcoDealCounts={lowcoDealCounts}
          basePath={basePath}
          page={page}
          pageSize={PAGE_SIZE}
        />
        {usingSampleData() && (
          <p className="mt-6 text-[12.5px] text-muted bg-surface border border-line rounded-lg px-3.5 py-2.5 w-max">
            Preview listings shown. Live listings connect with the staging
            database.
          </p>
        )}

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
