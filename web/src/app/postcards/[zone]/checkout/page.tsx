import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostcardCheckout } from "@/components/postcard-checkout";
import { ALL_SIZES, type SpotSize } from "@/lib/pricing";
import { cardCoverage } from "@/lib/card-coverage";
import {
  mailMonthLabel,
  tentativelyMails,
  type UpcomingMailing,
} from "@/lib/mailings";
import { getCardDescriptions } from "@/lib/card-details";
import { getPricingWithList } from "@/lib/advertiser-rates";
import { getSession } from "@/lib/auth";
import { zoneBySlug } from "@/lib/zones";
import {
  getZoneMailings,
  getTakenCategoriesForCard,
  getMcCategories,
} from "@/lib/mission-control";
import {
  cardCapacity,
  getCardOrientation,
  type CardCapacity,
} from "@/lib/card-capacity";
import { CONTACT_PHONE, CONTACT_PHONE_TEL, SITE_URL } from "@/lib/seo";

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
  ALL_SIZES.map((size) => ({ size, open: cap.fits[size] }));

/**
 * The reach and deadline line, built only from facts we hold.
 *
 * A deadline still ahead is one of the better reasons to act today
 * rather than next week, so it stays. A deadline already behind us is
 * the opposite: Downtown Summerville sat here on the second of August
 * with three spots left and "artwork deadline Jul 24" underneath it,
 * which reads as "you are too late" on a card that was still selling.
 * Removing the line outright fixed that one card and cost the other two
 * their urgency, which was the wrong trade.
 *
 * So the date shows while it means something, and turns into a prompt
 * to call once it does not. A late buyer is genuinely still welcome,
 * they are simply not on the self-serve timeline any more: artworkDueFor
 * gives them a short window from the day they pay, and that date cannot
 * be known until the sale exists.
 *
 * No date at all leaves the line off rather than guessing. A planned
 * card has no committed month, so it has no deadline to miss.
 */
const mailingFacts = (
  m: UpcomingMailing,
  // Injectable for tests; the page is force-dynamic, so the default is
  // evaluated per request rather than frozen at build time.
  now: number = Date.now(),
): string[] => {
  const due = m.artworkDeadlineIso ? Date.parse(m.artworkDeadlineIso) : NaN;
  const deadline = Number.isNaN(due)
    ? // Undefined means "do not judge", not "passed": a planned card, or
      // one whose deadline Mission Control gave us in a form we cannot
      // place on a calendar. Show what we were given, if anything.
      m.artworkDeadline
      ? `artwork deadline ${m.artworkDeadline}`
      : null
    : due > now
      ? `artwork deadline ${m.artworkDeadline}`
      : "closing soon, call to confirm";

  return [
    m.households ? `${m.households} households` : null,
    deadline,
  ].filter((f): f is string => f !== null);
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
  searchParams: Promise<{ spot?: string; reach?: string; card?: string }>;
}) {
  const { zone } = await params;
  const sp = await searchParams;
  const initialSize = ALL_SIZES.includes(sp.spot as SpotSize)
    ? (sp.spot as SpotSize)
    : undefined;
  const z = zoneBySlug(zone);
  if (!z) notFound();

  // The same function the checkout API charges from, so an account on an
  // agreed rate is quoted what it will actually pay. Quoting list and
  // charging less is a pleasant surprise; the reverse is the reason this
  // goes through one place.
  const viewer = await getSession().catch(() => null);
  const [rates, prefill] = await Promise.all([
    getPricingWithList(viewer?.email),
    // Signing in used to change the price and nothing else, so an
    // advertiser retyped a business name and an email we already held,
    // and a typo in either started a second record.
    viewer
      ? import("@/lib/portal").then((m) => m.getBuyerPrefill(viewer))
      : Promise.resolve(null),
  ]);

  // A zone can have several cards filling at once, so the card is chosen
  // explicitly rather than assumed from the zone.
  const openCards = (await getZoneMailings(zone)).filter(
    (m) => m.status !== "waitlist",
  );
  // Written per card in the admin: the sentence that tells a buyer what
  // this card is, which the zone name alone never does.
  const descriptions = await getCardDescriptions();
  const chosen =
    openCards.find((m) => m.cardId && m.cardId === sp.card) ??
    (openCards.length === 1 ? openCards[0] : undefined);
  const mailing = chosen;
  // Sold, plus anything somebody is part way through paying for. Shown
  // as taken rather than as held, because to a buyer there is no
  // difference: either way they cannot have it, and saying "someone is
  // buying this right now" only invites them to sit and refresh.
  const takenCategories = chosen?.cardId
    ? await (async () => {
        const { heldCategories } = await import("@/lib/spot-holds");
        const [sold, held] = await Promise.all([
          getTakenCategoriesForCard(chosen.cardId!),
          heldCategories({ kind: "card", cardId: chosen.cardId! }).catch(() => []),
        ]);
        return [...new Set([...sold, ...held])];
      })()
    : [];
  // Mission Control owns the category vocabulary; exclusivity is checked
  // against its names, so the picker has to offer the same ones.
  const mcCategories = await getMcCategories();
  const categoryOptions = mcCategories.length > 0 ? mcCategories : CATEGORIES;

  // The directory stores a slug ("home-services"); Mission Control owns
  // the display names ("Home Services"). Matched by squashing both, so a
  // prefilled category is one this card genuinely offers rather than a
  // string the picker will not recognise. No match means no prefill,
  // which is the honest outcome: they pick.
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const prefillCategory =
    (prefill?.categorySlug &&
      categoryOptions.find((c) => squash(c) === squash(prefill.categorySlug))) ||
    "";
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
                      {cardCoverage(m).name ?? tentativelyMails(m.mailMonth)}
                    </b>
                    {cardCoverage(m).name && (
                      <p className="text-[13px] text-body mt-0.5">
                        {tentativelyMails(m.mailMonth)}
                      </p>
                    )}
                    {m.cardId && descriptions[m.cardId] && (
                      <p className="text-[13px] text-body mt-1.5 max-w-[52ch]">
                        {descriptions[m.cardId]}
                      </p>
                    )}
                    {cardCoverage(m).zips.length > 0 && (
                      <p className="text-[12.5px] text-muted mt-0.5 num">
                        ZIP {cardCoverage(m).zips.join(", ")} ·{" "}
                        {cardCoverage(m).routeCount} carrier routes
                      </p>
                    )}
                    {mailingFacts(m).length > 0 && (
                      <p className="text-[13px] text-muted mt-0.5 num">
                        {mailingFacts(m).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border ${
                      m.status === "planned"
                        ? "bg-surface border-line-strong text-muted"
                        : left <= 3
                          ? "bg-cta-tint border-[#f3ddbb] text-[#a05e00]"
                          : "bg-brand-tint border-[#c2e4fb] text-brand-deep"
                    }`}
                  >
                    {/* Which card is planned matters most here, where a
                        zone has more than one and somebody is choosing
                        between them. */}
                    {m.status === "planned"
                      ? "Planned"
                      : left <= 3
                        ? `${left} left`
                        : "Open"}
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
              href={`tel:${CONTACT_PHONE_TEL}`}
              className="bg-white border border-line-strong font-semibold text-[15px] px-5 py-3 rounded-(--radius-btn) hover:border-faint"
            >
              Call {CONTACT_PHONE}
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

  const headerFacts = mailingFacts(mailing);

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
            Reserve your spot: {cardCoverage(mailing).name ?? z.name},{" "}
            {mailMonthLabel(mailing.mailMonth)}
          </h1>
          {headerFacts.length > 0 && (
            <p className="text-[#93A5B8] text-[14.5px] mt-2 num">
              {headerFacts.join(" · ")}
            </p>
          )}
          {/* Said before the form, not after the payment. A planned card
              is genuinely bookable, and the month is genuinely not
              fixed; somebody spending $249 is entitled to both halves of
              that before they decide. */}
          {mailing.status === "planned" && (
            <p className="text-[#93A5B8] text-[14px] mt-2.5 max-w-[60ch]">
              This card is planned rather than filling. Reserving now holds
              your category on it, and the month can still move. We confirm
              the mail date and your artwork deadline before anything goes
              to print.
            </p>
          )}
          {mailing.cardId && descriptions[mailing.cardId] && (
            <p className="text-[#93A5B8] text-[14px] mt-2.5 max-w-[60ch]">
              {descriptions[mailing.cardId]}
            </p>
          )}
          {cardCoverage(mailing).zips.length > 0 && (
            <p className="text-[#67768A] text-[13px] mt-1.5 num">
              {/* Route counts, not the address sum. Routes move right up
                  to the print deadline, so the sum is provisional and
                  quoting it reads as a promise. Reach comes from the
                  distribution figure above. */}
              Mails to ZIP {cardCoverage(mailing).zips.join(", ")} ·{" "}
              {cardCoverage(mailing).routeCount} full USPS carrier routes
            </p>
          )}
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
          orientation={capacity.orientation}
          reach={sp.reach === "10k" ? "10k" : "5k"}
          initialSize={initialSize}
          cardId={mailing.cardId}
          availability={availabilityFrom(capacity)}
          takenCategories={takenCategories}
          categories={categoryOptions}
          pricing={rates.pricing}
          listPricing={rates.hasRate ? rates.list : undefined}
          account={
            prefill
              ? {
                  email: prefill.email,
                  businessName: prefill.businessName,
                  phone: prefill.phone,
                  category: prefillCategory,
                  hasRate: rates.hasRate,
                }
              : undefined
          }
        />
      </div>
    </>
  );
}
