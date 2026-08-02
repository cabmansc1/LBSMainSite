import "server-only";
import { artworkDeadlineFrom, artworkDueFor } from "@/lib/mailings";

/**
 * The artwork deadline an advertiser is actually held to, per card.
 *
 * A card has one deadline. The person on it may not share it. Somebody
 * who buys a spot after the card's own date has passed was never able to
 * miss it, so artworkDueFor gives them a short window from the day they
 * paid instead, and the receipt tells them that date.
 *
 * This lived inside getPortalTodos, which meant the dashboard knew about
 * the late buyer and the cards page did not: the same advertiser was
 * told "we need this as soon as you can" on one screen and shown a bold
 * amber deadline that had passed before they paid on the other. The
 * cards page is the one they believe, because a date looks specific.
 *
 * So the resolution lives here and both screens read it. Two screens
 * deriving the same answer separately is how they came to disagree, and
 * duplicating the query rather than sharing it would only reset the
 * clock on that.
 */

export type OwnDeadline = {
  /** The date this advertiser is held to, if any. */
  due?: Date;
  /**
   * Bought after the card's own deadline had already passed.
   *
   * Their real date is a few days from purchase and moves with it, so no
   * fixed deadline is quoted at them. "As soon as you can" is both
   * friendlier and more accurate than a date they had no chance to hit.
   */
  boughtLate: boolean;
  /** Past their own date, not the card's. */
  overdue: boolean;
};

const NONE: OwnDeadline = { boughtLate: false, overdue: false };

/**
 * Resolves every card in one pass.
 *
 * One orders query for the whole set rather than one per card, and a
 * failure to read them falls back to the card's own deadline, which is
 * the behaviour that existed before any of this. Being unable to look up
 * a purchase date is not a reason to show nothing.
 */
export async function ownDeadlines(
  email: string,
  cards: { cardId: string; mailDateIso: string }[],
  now: number = Date.now(),
): Promise<Map<string, OwnDeadline>> {
  const boughtOn = new Map<string, string>();
  try {
    const { getOrdersForEmail } = await import("@/lib/orders");
    for (const o of await getOrdersForEmail(email)) {
      if (o.cardId && o.createdAt && !boughtOn.has(o.cardId)) {
        boughtOn.set(o.cardId, o.createdAt);
      }
    }
  } catch (e) {
    console.error("[artwork-due] could not read order dates:", e);
  }

  const out = new Map<string, OwnDeadline>();
  for (const c of cards) {
    const due = artworkDueFor(c.mailDateIso, boughtOn.get(c.cardId));
    if (!due) {
      out.set(c.cardId, NONE);
      continue;
    }
    const cardDue = artworkDeadlineFrom(c.mailDateIso);
    out.set(c.cardId, {
      due,
      // Their date differs from the card's, which only happens when they
      // bought after it had gone by.
      boughtLate: cardDue !== undefined && due.getTime() !== cardDue.getTime(),
      overdue: due.getTime() < now,
    });
  }
  return out;
}

/** Same format the card deadlines already print in. */
export const formatDue = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/**
 * What to show where a deadline goes.
 *
 * Undefined means print nothing rather than print a date we do not
 * believe. A late buyer gets words instead of a date, matching what the
 * dashboard has always told them.
 */
export function deadlineLabel(d: OwnDeadline | undefined): string | undefined {
  if (!d?.due) return undefined;
  return d.boughtLate ? "As soon as you can" : formatDue(d.due);
}
