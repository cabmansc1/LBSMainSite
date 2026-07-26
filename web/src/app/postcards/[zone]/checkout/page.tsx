import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostcardCheckout } from "@/components/postcard-checkout";
import { zoneBySlug } from "@/lib/zones";
import { getZoneMailing, getTakenCategories } from "@/lib/mission-control";
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

/** Spot counts derive from the mailing's remaining capacity. */
const availabilityFrom = (leftRaw: number) => {
  const left = Math.max(0, Math.floor(leftRaw)); // half-spots exist in MC
  return [
    { size: "small" as const, open: Math.min(4, left) },
    { size: "medium" as const, open: Math.max(0, Math.min(2, left - 2)) },
    { size: "large" as const, open: Math.max(0, left - 8) },
  ];
};

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
  searchParams,
}: {
  params: Promise<{ zone: string }>;
  searchParams: Promise<{ spot?: string; reach?: string }>;
}) {
  const { zone } = await params;
  const sp = await searchParams;
  const initialSize = ["small", "medium", "large"].includes(sp.spot ?? "")
    ? (sp.spot as "small" | "medium" | "large")
    : undefined;
  const z = zoneBySlug(zone);
  if (!z) notFound();

  const [mailing, takenCategories] = await Promise.all([
    getZoneMailing(zone),
    getTakenCategories(zone),
  ]);
  // An unknown zone is a 404; a zone with no card open right now is not.
  // Hard 404ing a money page on a transient Mission Control blip loses a
  // sale and looks broken, so explain and offer the waitlist instead.
  if (!mailing || mailing.status === "waitlist") {
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
            </nav>
            <h1 className="mt-4 text-[24px] md:text-[34px] font-bold tracking-[-0.03em]">
              No {z.name} card is open right now
            </h1>
            <p className="text-[#93A5B8] text-[14.5px] mt-2 max-w-[52ch]">
              The next {z.name} mailing has not opened for booking yet. Tell us
              you want a spot and you get first pick of your category when it
              does.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[1120px] px-6 py-10 grid gap-3.5 max-w-[640px]">
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/contact"
              className="bg-cta text-navy-950 font-bold text-[15px] px-5 py-3 rounded-(--radius-btn) hover:bg-[#FFA033]"
            >
              Ask about {z.name}
            </Link>
            <a
              href="tel:+18432122969"
              className="bg-white border border-line-strong font-semibold text-[15px] px-5 py-3 rounded-(--radius-btn) hover:border-faint"
            >
              Call 843-212-2969
            </a>
          </div>
          <p className="text-[13px] text-muted">
            Other neighborhoods may have spots today.{" "}
            <Link href="/coverage-map" className="text-brand-deep font-semibold hover:underline">
              See the coverage map
            </Link>
            .
          </p>
        </div>
      </>
    );
  }
  const spotsLeft =
    mailing.status === "full" ? 0 : mailing.spotsTotal - mailing.spotsTaken;

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
          reach={sp.reach === "10k" ? "10k" : "5k"}
          initialSize={initialSize}
          availability={availabilityFrom(spotsLeft)}
          takenCategories={takenCategories}
          categories={CATEGORIES}
        />
      </div>
    </>
  );
}
