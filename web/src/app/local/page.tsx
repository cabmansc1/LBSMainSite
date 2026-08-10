import type { Metadata } from "next";
import Link from "next/link";
import { listActivePlaces } from "@/lib/places";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Lowcountry, Town by Town",
  description:
    "Local stories, events and businesses across Mount Pleasant, Charleston, Summerville, the North Area and Moncks Corner.",
  alternates: { canonical: `${SITE_URL}/local` },
  openGraph: {
    title: "The Lowcountry, Town by Town",
    description:
      "Local stories, events and businesses from across Greater Charleston.",
    url: `${SITE_URL}/local`,
    siteName: SITE_NAME,
    type: "website",
  },
};

/**
 * The way in to the place pages.
 *
 * Markets as the headings, with the zones and neighbourhoods under each
 * one listed rather than hidden, because the specific name is what
 * anybody actually looks for. Somebody wants Daniel Island, not East
 * Cooper, and will only find out those are the same conversation by
 * seeing them together.
 */
export default async function LocalIndexPage() {
  const places = await listActivePlaces().catch(() => []);
  const markets = places.filter((p) => p.kind === "market");
  const under = (slug: string) =>
    places.filter((p) => p.parentSlug === slug && p.kind !== "market");

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-12">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-brand">
            Around here
          </p>
          <h1 className="mt-2.5 text-[32px] md:text-[46px] font-bold tracking-[-0.035em] leading-[1.05] text-balance">
            The Lowcountry, town by town.
          </h1>
          <p className="mt-4 text-[16.5px] leading-relaxed text-[#AEBDCC] max-w-[58ch]">
            What is on, who has opened and which businesses are worth knowing
            about, wherever you happen to be.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-[1120px] px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {markets.length === 0 ? (
          <p className="text-[15px] text-muted">Nothing set up yet.</p>
        ) : (
          markets.map((m) => {
            const kids = under(m.slug);
            return (
              <div
                key={m.slug}
                className="border border-line rounded-(--radius-card) bg-white p-5"
              >
                <Link
                  href={`/local/${m.slug}`}
                  className="text-[17px] font-bold tracking-tight hover:text-brand-deep"
                >
                  {m.name}
                </Link>
                {m.blurb && (
                  <p className="mt-1.5 text-[13.5px] text-muted leading-relaxed line-clamp-2">
                    {m.blurb}
                  </p>
                )}
                {kids.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {kids.map((k) => (
                      <Link
                        key={k.slug}
                        href={`/local/${k.slug}`}
                        className="text-[12.5px] px-2.5 py-1 rounded-full border border-line-strong hover:border-navy-950"
                      >
                        {k.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
