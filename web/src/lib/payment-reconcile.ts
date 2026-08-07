import "server-only";

/**
 * Money we have taken that Mission Control does not know about.
 *
 * The advertiser's card page reads Mission Control, and Mission Control
 * only learns a card was paid for when our Stripe webhook tells it. A
 * delivery that fails is silent on both sides: Stripe considers the
 * payment done, we record the order as paid, and Mission Control carries
 * on showing an advertiser as unpaid, or missing from the card entirely.
 *
 * Nothing surfaced that. The chip on the advertiser's own page now
 * covers for it, so the customer sees the truth, which means the only
 * remaining sign of a broken push was a phone call from somebody
 * confused about their invoice.
 *
 * Two shapes of the same failure, and the second is the worse one:
 *
 *   unpaid   they are on the card, and it says they have not paid
 *   missing  they are not on the card at all, having paid for it
 *
 * Deliberately defined as what the advertiser's own page would show, by
 * asking the same function that page asks. A reconciliation that used
 * its own idea of matching could call something fine that the customer
 * is looking at, or raise one nobody can see.
 */

export type PaymentGap = {
  reference: string;
  businessName: string;
  email: string;
  cardId: string;
  amountCents: number;
  paidAt: string | null;
  problem: "unpaid" | "missing";
  /** What Mission Control says, when it says anything. */
  mcStatus?: string;
};

/**
 * Recent paid orders whose card Mission Control disagrees about.
 *
 * Bounded by how far back it looks rather than by a row count, because
 * the useful question is "did anything break lately", and a cap on rows
 * would quietly stop reporting the moment several broke at once.
 */
export async function findPaymentGaps(days = 60): Promise<PaymentGap[]> {
  try {
    const { getPaidOrdersWithCards } = await import("@/lib/orders");
    const orders = await getPaidOrdersWithCards(days);
    if (orders.length === 0) return [];

    const { getAdvertiserCards } = await import("@/lib/mission-control");

    // One lookup per advertiser rather than per order. Mission Control's
    // snapshot is cached for a minute, so the cost is the matching, and
    // an advertiser on four cards would otherwise be matched four times.
    const byBuyer = new Map<string, typeof orders>();
    for (const o of orders) {
      const key = `${o.email.toLowerCase()}|${o.businessName.toLowerCase()}`;
      const list = byBuyer.get(key) ?? [];
      list.push(o);
      byBuyer.set(key, list);
    }

    const gaps: PaymentGap[] = [];
    for (const [, group] of byBuyer) {
      const first = group[0];
      const theirCards = await getAdvertiserCards({
        email: first.email,
        name: first.businessName,
      }).catch(() => null);
      // Unreachable is not a mismatch. Reporting every paid order as
      // missing because Mission Control is quiet would bury the real
      // ones the next time this is read.
      if (!theirCards) continue;

      const status = new Map(
        theirCards.map((c) => [c.cardId, (c.paymentStatus ?? "").toLowerCase()]),
      );

      for (const o of group) {
        if (!status.has(o.cardId)) {
          gaps.push({ ...o, problem: "missing" });
          continue;
        }
        const s = status.get(o.cardId) ?? "";
        // Anything other than settled counts, including blank: a row MC
        // has no payment state for is a row our push never reached.
        if (s !== "paid") {
          gaps.push({ ...o, problem: "unpaid", mcStatus: s || undefined });
        }
      }
    }

    // Newest first: a break today matters more than one six weeks old
    // that somebody has probably already sorted out by hand.
    return gaps.sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));
  } catch (e) {
    console.error("[reconcile] could not compare payments:", e);
    return [];
  }
}
