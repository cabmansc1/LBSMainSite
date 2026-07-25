import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostcardCheckout } from "@/components/postcard-checkout";
import { zoneBySlug } from "@/lib/zones";
import { UPCOMING_MAILINGS } from "@/lib/mailings";
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

/** Sample availability until the postcard inventory tables go live. */
const sampleAvailability = (zoneSlug: string) => {
  const m = UPCOMING_MAILINGS.find((x) => x.zoneSlug === zoneSlug);
  const left = m ? m.spotsTotal - m.spotsTaken : 6;
  return [
    { size: "small" as const, open: Math.max(0, Math.min(4, left)) },
    { size: "medium" as const, open: Math.max(0, Math.min(2, left - 2)) },
    { size: "large" as const, open: Math.max(0, left - 8) },
  ];
};

const sampleTaken = ["Plumbing", "Dental"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ zone: string }>;
}): Promise<Metadata> {
  const { zone } = await params;
  const z = zoneBySlug(zone);
  if (!z) return {};
  return {
    title: `Reserve a Spot: ${z.name}`,
    description: `Reserve and pay for your ad spot on the next ${z.name} Spotlight Postcard.`,
    alternates: { canonical: `${SITE_URL}/postcards/${zone}/checkout` },
    robots: { index: false, follow: true },
  };
}

export default async function PostcardCheckoutPage({
  params,
}: {
  params: Promise<{ zone: string }>;
}) {
  const { zone } = await params;
  const z = zoneBySlug(zone);
  if (!z) notFound();

  const mailing = UPCOMING_MAILINGS.find((m) => m.zoneSlug === zone);
  if (!mailing || mailing.status === "waitlist") notFound();

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-11 pb-12">
          <nav className="text-[12.5px] text-[#67768A] flex gap-2" aria-label="Breadcrumb">
            <Link href="/coverage-map" className="hover:text-white">Coverage</Link>
            <span>/</span>
            <Link href={`/${zone}-direct-mail-marketing`} className="hover:text-white">
              {z.name}
            </Link>
            <span>/</span>
            <b className="text-white font-semibold">Checkout</b>
          </nav>
          <h1 className="mt-4 text-[24px] md:text-[34px] font-bold tracking-[-0.03em]">
            Reserve your spot: {z.name}, {mailing.mailMonth}
          </h1>
          <p className="text-[#93A5B8] text-[14.5px] mt-2 num">
            {mailing.households} households · artwork deadline{" "}
            {mailing.artworkDeadline}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-10">
        <PostcardCheckout
          zoneSlug={zone}
          zoneName={z.name}
          mailMonth={mailing.mailMonth}
          reach="5k"
          availability={sampleAvailability(zone)}
          takenCategories={sampleTaken}
          categories={CATEGORIES}
        />
      </div>
    </>
  );
}
