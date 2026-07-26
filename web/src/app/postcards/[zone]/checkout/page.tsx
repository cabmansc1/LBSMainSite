import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostcardCheckout } from "@/components/postcard-checkout";
import { zoneBySlug } from "@/lib/zones";
import {
  getZoneMailings,
  getTakenCategoriesForCard,
} from "@/lib/mission-control";
import {
  cardCapacity,
  getCardOrientation,
  type CardCapacity,
} from "@/lib/card-capacity";
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
/**
 * Real availability: what still fits in the space left on the card,
 * from Mission Control's spot counts and the card's orientation.
 */
const availabilityFrom = (cap: CardCapacity) =>
  (["small", "medium", "large"] as const).map((size) => ({
    size,
    open: cap.fits[size],
  }));

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
  searchParams: Promise<{ spot?: string; reach?: string; card?: string }>;
}) {
  const { zone } = await params;
  const sp = await searchParams;
  const initialSize = ["small", "medium", "large"].includes(sp.spot ?? "")
    ? (sp.spot as "small" | "medium" | "large")
    : undefined;
  const z = zoneBySlug(zone);
  if (!z) notFound();

  // A zone can have several cards filling at once, so the card is chosen
  // explicitly rather than assumed from the zone.
  const openCards = (await getZoneMailings(zone)).filter(
    (m) => m.status !== "waitlist",
  );
  const chosen =
    openCards.find((m) => m.cardId && m.cardId === sp.card) ??
    (openCards.length === 1 ? openCards[0] : undefined);
  const mailing = chosen;
  const takenCategories = chosen?.cardId
    ? await getTakenCategoriesForCard(chosen.cardId)
    : [];
  const orientation = chosen?.cardId
    ? await getCardOrientation(chosen.cardId)
    : "horizontal";
  const capacity = cardCapacity({
    orientation,
    totalSpots: chosen?.spotsTotal,
    spotsFilled: chosen?.spotsTaken,
  });
  if (!mailing && openCards.length > 1) {
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
              <b className="text-white font-semibold">Choose a mailing</b>
            </nav>
            <h1 className="mt-4 text-[24px] md:text-[34px] font-bold tracking-[-0.03em]">
              Which {z.name} card?
            </h1>
            <p className="text-[#93A5B8] text-[14.5px] mt-2 max-w-[54ch]">
              {openCards.length} {z.name} cards are filling right now. Category
              exclusivity applies per card, so pick the mailing you want to be
              on.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[720px] px-6 py-10 grid gap-3.5">
          {openCards.map((m) => {
            const left = Math.max(0, m.spotsTotal - m.spotsTaken);
            const pct = Math.min(
              100,
              Math.round((m.spotsTaken / Math.max(1, m.spotsTotal)) * 100),
            );
            const query = new URLSearchParams({
              ...(m.cardId ? { card: m.cardId } : {}),
              ...(sp.spot ? { spot: sp.spot } : {}),
              ...(sp.reach ? { reach: sp.reach } : {}),
            });
            return (
              <Link
                key={m.cardId ?? m.mailMonth}
                href={`/postcards/${zone}/checkout?${query}`}
                className="block bg-white border border-line rounded-(--radius-card) p-5 hover:border-faint transition-colors"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <b className="text-[16px] font-bold tracking-tight">
                      Mails {m.mailMonth}
                    </b>
                    <p className="text-[13px] text-muted mt-0.5 num">
                      {m.households} households · artwork deadline{" "}
                      {m.artworkDeadline}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border ${
                      left <= 3
                        ? "bg-cta-tint border-[#f3ddbb] text-[#a05e00]"
                        : "bg-brand-tint border-[#c2e4fb] text-brand-deep"
                    }`}
                  >
                    {left <= 3 ? `${left} left` : "Open"}
                  </span>
                </div>
                <div className="mt-3.5 h-1.5 rounded-full bg-line overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct >= 80 ? "bg-cta" : "bg-brand"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-[12.5px] text-muted num">
                  {m.spotsTaken} of {m.spotsTotal} spots taken
                </p>
              </Link>
            );
          })}
        </div>
      </>
    );
  }

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
          <p className="text-[#67768A] text-[13px] mt-1.5 num">
            {capacity.orientation === "vertical" ? "Vertical" : "Horizontal"}{" "}
            card · {capacity.remainingSqIn} of {capacity.totalSqIn} square
            inches still open
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
          cardId={mailing.cardId}
          availability={availabilityFrom(capacity)}
          takenCategories={takenCategories}
          categories={CATEGORIES}
        />
      </div>
    </>
  );
}
