import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getUpcomingMailings } from "@/lib/mission-control";
import { cardCapacity, getCardOrientations } from "@/lib/card-capacity";
import { cardCoverage } from "@/lib/card-coverage";
import { AdminCards } from "@/components/admin-cards";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Cards",
  robots: { index: false, follow: false },
};

/**
 * Card layout settings. Mission Control owns the cards themselves; this
 * holds the orientation, which decides how much ad space a card has and
 * therefore what the site can still sell on it.
 */
export default async function AdminCardsPage() {
  await requireAdmin();
  const [mailings, orientations] = await Promise.all([
    getUpcomingMailings(),
    getCardOrientations(),
  ]);

  const cards = mailings
    .filter((m) => m.cardId)
    .map((m) => {
      const orientation = orientations[m.cardId!] ?? "horizontal";
      const cap = cardCapacity({
        orientation,
        totalSpots: m.spotsTotal,
        spotsFilled: m.spotsTaken,
      });
      const coverage = cardCoverage(m);
      return {
        cardId: m.cardId!,
        zoneName: m.zoneName,
        cardName: coverage.name,
        zips: coverage.zips,
        routeCount: coverage.routeCount,
        routeHouseholds: coverage.households,
        mailMonth: m.mailMonth,
        orientation,
        totalSpots: m.spotsTotal,
        spotsTaken: m.spotsTaken,
        remainingSqIn: cap.remainingSqIn,
        totalSqIn: cap.totalSqIn,
      };
    });

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Cards</h1>
        <p className="text-sm text-muted mt-1">
          Set each card's orientation. Switching a card to vertical gives it
          more usable ad space, and the site immediately offers what fits.
          Coverage comes from the route table in each card's Mission Control
          notes: paste the USPS route rows there and the site tells buyers
          which part of town the card mails to.
        </p>
      </div>
      <AdminCards cards={cards} />
    </div>
  );
}
