import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpotGrid } from "@/components/spot-grid";
import { StatusChip } from "@/components/sections";
import { getCard, daysUntil } from "@/lib/cards";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "Plumbing",
  "HVAC",
  "Roofing",
  "Dental",
  "Restaurants",
  "Landscaping",
  "Automotive",
  "Real Estate",
  "Insurance",
  "Fitness",
  "Med Spa",
  "Pest Control",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const card = await getCard(slug);
  if (!card) return {};
  return {
    title: `${card.name} Neighborhood Card`,
    description: `Reserve your exact ad position on the ${card.name} neighborhood postcard. ${card.households.toLocaleString()} households.`,
    alternates: { canonical: `${SITE_URL}/neighborhood-card/${slug}` },
    robots: { index: false, follow: false },
  };
}

export default async function NeighborhoodCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await getCard(slug);
  if (!card || card.status !== "open") notFound();

  const days = daysUntil(card.printDeadline);

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-11 pb-12">
          <nav className="text-[12.5px] text-[#67768A] flex gap-2" aria-label="Breadcrumb">
            <Link href="/neighborhood-cards" className="hover:text-white">
              Neighborhood Cards
            </Link>
            <span>/</span>
            <b className="text-white font-semibold">{card.name}</b>
          </nav>
          <div className="mt-4 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[26px] md:text-[38px] font-bold tracking-[-0.03em]">
                The {card.name} card
              </h1>
              <p className="text-[#93A5B8] text-[14.5px] mt-1.5 num">
                {card.households.toLocaleString()} households · prints{" "}
                {new Date(card.printDeadline).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <StatusChip tone={days <= 10 ? "warn" : "ok"}>
              {days} days until print deadline
            </StatusChip>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-10">
        <SpotGrid card={card} categories={CATEGORIES} />
      </div>
    </>
  );
}
