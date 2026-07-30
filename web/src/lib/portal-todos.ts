import "server-only";
import type { PortalContext } from "@/lib/portal";
import { getArtworkFor } from "@/lib/artwork";
import { artworkDeadlineFrom } from "@/lib/mailings";

/**
 * What this advertiser still has to do, derived rather than declared.
 *
 * Every item has to be something we can see the state of and something
 * they can finish. That rules out two obvious-sounding entries:
 *
 *   Approve your proof. Mission Control tracks proofApproved, but we
 *   have no proof file to show them and MC_READ_ONLY blocks writing the
 *   approval back, so the button would be a lie. It needs proofs
 *   uploaded on our side first.
 *
 *   Reply to an inquiry. There is no read or replied flag on
 *   directory_business_inquiries, so the item could never clear itself.
 *   A to-do that never goes away teaches people to ignore the list, and
 *   then the artwork deadline gets ignored with it.
 *
 * Order is by consequence. A missed print deadline cannot be undone
 * after the card goes to press; an unfinished listing can be fixed any
 * time.
 */

export type Todo = {
  id: string;
  title: string;
  detail: string;
  href: string;
  action: string;
  /** Something has a date on it and the date has gone by. */
  overdue?: boolean;
  /** Ranked, lowest first. Print deadlines beat profile tidying. */
  weight: number;
};

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Mission Control states that mean we already have their artwork. */
const ART_SETTLED = new Set(["approved", "received"]);

export async function getPortalTodos(
  ctx: PortalContext,
  missingPhone: boolean,
): Promise<Todo[]> {
  const todos: Todo[] = [];
  const now = Date.now();

  // One query for every card, then matched in memory, rather than a
  // round trip per card.
  const uploads = await getArtworkFor(ctx.user.email);
  const uploadedFor = new Set(uploads.map((a) => a.cardId));

  for (const c of ctx.currentCards) {
    const due = artworkDeadlineFrom(c.mailDateIso);
    const overdue = due !== undefined && due.getTime() < now;

    if (!ART_SETTLED.has(c.artStatus) && !uploadedFor.has(c.cardId)) {
      todos.push({
        id: `artwork-${c.cardId}`,
        title: `Send artwork for your ${c.zoneName} ad`,
        detail: c.artworkDeadline
          ? overdue
            ? `This was due ${c.artworkDeadline} and the card mails ${c.mailMonth}. Send it now or we will design one for you.`
            : `Due ${c.artworkDeadline}, mailing ${c.mailMonth}. Send your own or let us design it free.`
          : `Mailing ${c.mailMonth}. Send your own or let us design it free.`,
        href: "/account/cards",
        action: "Upload artwork",
        overdue,
        weight: overdue ? 0 : 10,
      });
    }

    // Only when we know both numbers. A card with no amount recorded is
    // a gap in our data, not a debt, and dunning somebody over our own
    // missing field is the worst thing this list could do.
    const owed = c.amountCents ?? 0;
    const paid = c.amountPaidCents ?? 0;
    if (owed > 0 && paid < owed) {
      todos.push({
        id: `balance-${c.cardId}`,
        title: `${money(owed - paid)} due on your ${c.zoneName} ad`,
        detail: `${c.mailMonth} card, ${c.adSize} spot.${
          paid > 0 ? ` ${money(paid)} of ${money(owed)} received.` : ""
        } Your spot is held either way, but it has to be settled before the card prints.`,
        href: "/account/billing",
        action: "See billing",
        overdue,
        weight: overdue ? 1 : 20,
      });
    }
  }

  for (const l of ctx.listings) {
    if (l.claimable) {
      todos.push({
        id: `claim-${l.id}`,
        title: `Claim your listing for ${l.name}`,
        detail:
          "We matched this listing to your email but it is not linked to this login yet. Claiming it lets you edit it.",
        // Anchored at the listing itself. An account with two listings
        // landing at the top of the page has to work out which one this
        // item meant.
        href: `/account/listings#listing-${l.id}`,
        action: "Claim it",
        weight: 30,
      });
    } else if (!l.description?.trim()) {
      todos.push({
        id: `describe-${l.id}`,
        title: `Add a description to ${l.name}`,
        detail:
          "Your directory listing has no description, which is the part people read before they call.",
        href: `/account/listings#listing-${l.id}`,
        action: "Edit listing",
        weight: 40,
      });
    }
  }

  if (missingPhone) {
    todos.push({
      id: "phone",
      title: "Add a phone number",
      detail:
        "Checkout let you skip it. It is how we reach you about a proof or a deadline when email does not land.",
      href: "/account/profile",
      action: "Add it",
      weight: 50,
    });
  }

  return todos.sort((a, b) => a.weight - b.weight);
}
