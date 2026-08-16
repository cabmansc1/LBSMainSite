/**
 * Upcoming mailing schedule. Sample data until Phase 4 wires this to the
 * postcard_mailings table; the shapes match the Drizzle schema so the
 * swap is a query change only.
 */
/**
 * One USPS carrier route on a card, from the route table Mission Control
 * keeps in the card's notes.
 *
 * Only the delivery counts cross over. Mission Control's route table also
 * carries our cost per route and the demographic columns, and none of
 * that is business the site has: not on a public page, not in the admin,
 * not in the payload. It is parsed out and dropped rather than carried
 * and hidden, because anything carried can leak.
 */
export type CardRoute = {
  /** e.g. 29483-R039 */
  code: string;
  zip: string;
  residential: number;
  business: number;
  total: number;
};

export type UpcomingMailing = {
  /** Mission Control card id. A zone can have several cards filling at once. */
  cardId?: string;
  /**
   * What MC calls this card, e.g. "Downtown Summerville" or
   * "Nexton/Cane Bay". A zone can be filling two cards at once, and the
   * month alone does not tell a buyer which part of town they are
   * buying into.
   */
  cardName?: string;
  /** Carrier routes the card mails to, when MC has the route table. */
  routes?: CardRoute[];
  /**
   * Categories already locked on this card — sold to an advertiser or
   * held by an admin mid-conversation. One business per category per
   * card is the product, so this is the list of trades that can no
   * longer buy onto it.
   *
   * Undefined means unknown, which is not the same as empty. An empty
   * array is Mission Control telling us the card is wide open;
   * undefined is us not having been able to ask, and the difference
   * matters because "nothing is taken" is exactly the wrong thing to
   * tell somebody during an outage. Surfaces that filter on this show
   * the control only when at least one card knows its answer.
   */
  takenCategories?: string[];
  zoneSlug: string;
  zoneName: string;
  mailMonth: string;
  /**
   * The tentative mail date, when Mission Control has fixed one.
   *
   * mailMonth is a display string — "September 2026", sometimes
   * "Winter 2026" — so it cannot be compared to anything or placed on a
   * calendar. This is the same date the deadline is derived from, kept
   * as a date so a surface can ask "is this within three months".
   *
   * Undefined for a planned card whose month nobody has committed to.
   * Undefined means "cannot say", not "far away".
   */
  mailDateIso?: string;
  /**
   * Undefined when Mission Control has not set one. It used to default
   * to the string "Ask us", which then printed on customer-facing pages
   * as "artwork deadline Ask us".
   */
  artworkDeadline?: string;
  /**
   * The same deadline as a date, so a page can tell whether it has
   * passed. artworkDeadline is a display string like "Jul 24" and
   * cannot be compared to anything.
   *
   * Derived from the mail date rather than parsed back out of the
   * display string, for two reasons. "Jul 24" carries no year, so
   * parsing it in January reads as this year when the card means next.
   * And the derived date is what artworkDueFor already uses to work out
   * a late buyer's grace window, so judging by anything else would let
   * a card call itself open while the grace maths called it late.
   *
   * Undefined for a planned card, whose month nobody has committed to,
   * and undefined when Mission Control supplied a deadline we cannot
   * place on a calendar. Undefined means "do not judge", not "passed".
   */
  artworkDeadlineIso?: string;
  /**
   * Deliverable addresses for this card, from Mission Control or summed
   * from the USPS route table. Undefined when neither is known.
   *
   * This used to default to "5,000+", which put an invented reach figure
   * next to the real route count: the Summerville card page said "2,680
   * addresses" and "5,000+ households" one line apart.
   */
  households?: string;
  spotsTotal: number;
  spotsTaken: number;
  /**
   * "planned" is a card we intend to mail rather than one we are
   * actively filling: the month is an intention, not a commitment.
   *
   * It is still bookable, because reserving ahead of print is the
   * product. What it changes is what the site claims about it. Before
   * this existed, an unknown Mission Control status fell through to
   * "open", so a card pencilled in for December was advertised with an
   * artwork deadline derived from a date nobody had fixed.
   */
  status: "open" | "almost-full" | "full" | "waitlist" | "planned";
};

/** Bookable now, whatever else it is. Waitlist and full are not. */
export const isBookable = (status: UpcomingMailing["status"]) =>
  status === "open" || status === "almost-full" || status === "planned";

export const UPCOMING_MAILINGS: UpcomingMailing[] = [
  { zoneSlug: "summerville", zoneName: "Summerville", mailMonth: "September 2026", mailDateIso: "2026-09-04", artworkDeadline: "Aug 28", households: "5,000+", spotsTotal: 11, spotsTaken: 9, status: "almost-full", takenCategories: ["Plumbing", "HVAC", "Roofing", "Dental", "Restaurants", "Landscaping", "Automotive", "Insurance", "Fitness"] },
  { zoneSlug: "daniel-island", zoneName: "Daniel Island & Clements Ferry", mailMonth: "September 2026", mailDateIso: "2026-09-04", artworkDeadline: "Aug 28", households: "5,000+", spotsTotal: 11, spotsTaken: 10, status: "almost-full", takenCategories: ["Plumbing", "HVAC", "Roofing", "Dental", "Restaurants", "Landscaping", "Real Estate", "Insurance", "Fitness", "Med Spa"] },
  { zoneSlug: "goose-creek", zoneName: "Goose Creek", mailMonth: "October 2026", mailDateIso: "2026-10-02", artworkDeadline: "Sept 25", households: "5,000+", spotsTotal: 11, spotsTaken: 4, status: "open", takenCategories: ["Plumbing", "Roofing", "Automotive", "Pest Control"] },
  { zoneSlug: "mount-pleasant", zoneName: "Mount Pleasant", mailMonth: "October 2026", mailDateIso: "2026-10-02", artworkDeadline: "Sept 25", households: "10,000+", spotsTotal: 11, spotsTaken: 6, status: "open", takenCategories: ["HVAC", "Dental", "Restaurants", "Real Estate", "Med Spa", "Fitness"] },
  { zoneSlug: "moncks-corner", zoneName: "Moncks Corner", mailMonth: "October 2026", mailDateIso: "2026-10-02", artworkDeadline: "Sept 25", households: "5,000+", spotsTotal: 11, spotsTaken: 2, status: "open", takenCategories: ["Plumbing", "Landscaping"] },
  { zoneSlug: "north-charleston", zoneName: "North Charleston", mailMonth: "November 2026", mailDateIso: "2026-11-06", artworkDeadline: "Oct 30", households: "10,000+", spotsTotal: 11, spotsTaken: 3, status: "open", takenCategories: ["HVAC", "Roofing", "Automotive"] },
  { zoneSlug: "charleston", zoneName: "Charleston", mailMonth: "November 2026", mailDateIso: "2026-11-06", artworkDeadline: "Oct 30", households: "10,000+", spotsTotal: 11, spotsTaken: 5, status: "open", takenCategories: ["Dental", "Restaurants", "Real Estate", "Med Spa", "Fitness"] },
  { zoneSlug: "james-island", zoneName: "James Island", mailMonth: "December 2026", mailDateIso: "2026-12-04", artworkDeadline: "Nov 27", households: "5,000+", spotsTotal: 11, spotsTaken: 1, status: "open", takenCategories: ["Plumbing"] },
  { zoneSlug: "johns-island", zoneName: "Johns Island", mailMonth: "December 2026", mailDateIso: "2026-12-04", artworkDeadline: "Nov 27", households: "5,000+", spotsTotal: 11, spotsTaken: 0, status: "open", takenCategories: [] },
  // One row, because it is one card: 3,590 mailboxes on Isle of Palms and
  // 1,325 on Sullivan's, 4,915 across the two. Two rows at 5,000+ each
  // offered a choice that does not exist and about twice the reach that
  // does. getZoneMailings resolves either island to this row.
  { zoneSlug: "isle-of-palms", zoneName: "Isle of Palms & Sullivans Island", mailMonth: "Winter 2026", artworkDeadline: "TBD", households: "4,900+", spotsTotal: 11, spotsTaken: 0, status: "waitlist", takenCategories: [] },
];

/**
 * How the site talks about a mail date that has not happened yet.
 *
 * Mission Control's mail dates move. Routes get added, print slips, a
 * card waits for one more advertiser. Presenting a date that shifts as
 * though it were fixed is how an advertiser ends up feeling misled by a
 * change that was always normal, and it is also what the artwork
 * deadline is derived from, so the two need to say the same thing.
 *
 * Past cards are not tentative. A card that mailed has an actual date,
 * and these helpers are only for upcoming ones.
 */
export const tentativelyMails = (mailMonth: string) =>
  hasMailDate(mailMonth)
    ? `Tentatively mails ${mailMonth}`
    : "Mail date to be confirmed";

/**
 * Whether a card has a month worth printing.
 *
 * Mission Control leaves the date empty on a card that is planned but
 * not scheduled, which normalizes to the literal "TBD". Rendered
 * straight, that produced "Tentatively mails TBD" and a checkout
 * heading reading "Reserve your spot: James Island, TBD".
 */
export const hasMailDate = (mailMonth: string | undefined): boolean =>
  !!mailMonth && mailMonth.trim().toUpperCase() !== "TBD";

/** The date in a sentence, for a card that may not have one yet. */
export const mailMonthLabel = (mailMonth: string | undefined) =>
  hasMailDate(mailMonth) ? (mailMonth as string) : "date to be confirmed";

/** Column heading or stat label form. */
export const TENTATIVE_MAIL_LABEL = "Tentative mail date";

/**
 * Days before the tentative mail date that artwork is due.
 *
 * Seven, down from fourteen. Two weeks was generous to the print
 * schedule and expensive on the sales side: it closed the self-serve
 * window a fortnight before a card mailed, which is exactly the stretch
 * when a half-full card most needs to be sellable.
 *
 * Derived rather than stored, so a card whose date moves brings its
 * deadline with it, and every surface that quotes a number interpolates
 * this one. Change it here and the receipt, the advertise page FAQ and
 * the card picker all follow.
 */
export const ARTWORK_LEAD_DAYS = 7;

/**
 * How long somebody who bought late gets to send artwork.
 *
 * Short, because they are buying onto a card that is nearly closed and
 * the print date does not move for them. But not zero: a deadline that
 * had already passed when they paid was never theirs to miss.
 */
export const LATE_BUYER_GRACE_DAYS = 2;

/**
 * The artwork deadline this advertiser is actually held to.
 *
 * The card's own deadline, unless they bought after it, in which case
 * they get a short window from the day they paid, capped at the mail
 * date because nothing can arrive after the card prints.
 *
 * Without this, buying a spot on a card mailing in three weeks showed
 * "artwork past due, was due Jul 24" the moment the payment cleared.
 * The customer had done nothing wrong; we sold them a late spot and
 * then told them off for it.
 */
export function artworkDueFor(
  mailDateIso: string,
  purchasedAt?: Date | string | null,
): Date | undefined {
  const cardDue = artworkDeadlineFrom(mailDateIso);
  if (!cardDue || !purchasedAt) return cardDue;

  const bought = new Date(purchasedAt);
  if (isNaN(bought.getTime()) || bought.getTime() <= cardDue.getTime()) {
    return cardDue;
  }

  const grace = new Date(bought);
  grace.setDate(grace.getDate() + LATE_BUYER_GRACE_DAYS);

  const mailDate = new Date(mailDateIso);
  if (!isNaN(mailDate.getTime()) && grace.getTime() > mailDate.getTime()) {
    return mailDate;
  }
  return grace;
}

/** The artwork deadline implied by a card's current tentative date. */
export function artworkDeadlineFrom(mailDateIso: string): Date | undefined {
  const d = new Date(mailDateIso);
  if (isNaN(d.getTime())) return undefined;
  d.setDate(d.getDate() - ARTWORK_LEAD_DAYS);
  return d;
}
