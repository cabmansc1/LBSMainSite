import type { Metadata } from "next";
import Link from "next/link";
import { Card, StatusChip, FillMeter } from "@/components/sections";
import { getOpenCards, daysUntil, usingSampleCards } from "@/lib/cards";
import { formatPrice } from "@/lib/pricing";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Neighborhood Cards: Hyper-Local Postcards",
  description:
    "Smaller postcards for single neighborhoods: Nexton, Cane Bay, and more. Pick your exact spot on the card, from $59.",
  alternates: { canonical: `${SITE_URL}/neighborhood-cards` },
  robots: { index: false, follow: false },
  openGraph: {
    title: `Neighborhood Cards | ${SITE_NAME}`,
    description: "Hyper-local neighborhood postcards from $59.",
    siteName: SITE_NAME,
    type: "website",
  },
};

export default async function NeighborhoodCardsPage() {
  const cards = await getOpenCards();

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Neighborhood Cards
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[24ch] text-balance">
            One neighborhood. Your exact spot on the card.
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[56ch]">
            Smaller cards for single communities. Pick the physical position
            your ad occupies, lock your category, and pay online. From{" "}
            {formatPrice(5900)}.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-10">
        {usingSampleCards() && (
          <p className="mb-6 text-[12.5px] text-muted bg-surface border border-line rounded-lg px-3.5 py-2.5 w-max">
            Preview cards shown. Live cards connect with the staging database.
          </p>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {cards.map((c) => {
            const days = daysUntil(c.printDeadline);
            const full = c.status !== "open";
            return (
              <Card key={c.slug} className="p-6.5 grid gap-4 content-start">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[18px] font-bold tracking-tight">{c.name}</h2>
                  {full ? (
                    <StatusChip tone="danger">Full</StatusChip>
                  ) : days <= 10 ? (
                    <StatusChip tone="warn">{days} days left</StatusChip>
                  ) : (
                    <StatusChip tone="ok">Open</StatusChip>
                  )}
                </div>
                <dl className="grid gap-1.5 text-[13.5px] text-body">
                  <div className="flex justify-between">
                    <dt className="text-muted">Households</dt>
                    <dd className="font-semibold num">{c.households.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Print deadline</dt>
                    <dd className="font-semibold">{new Date(c.printDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">From</dt>
                    <dd className="font-semibold num">{formatPrice(c.spotTypes[0].priceCents)}</dd>
                  </div>
                </dl>
                <FillMeter taken={Math.round(c.spotsTaken)} total={c.totalSpots} />
                {full ? (
                  <span className="text-sm text-muted font-medium">
                    Sold out. Next edition opens soon.
                  </span>
                ) : (
                  <Link
                    href={`/neighborhood-card/${c.slug}`}
                    className="inline-flex items-center justify-center bg-cta text-navy-950 font-semibold text-[14.5px] px-5 py-2.5 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors"
                  >
                    Pick your spot
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
