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
  zoneSlug: string;
  zoneName: string;
  mailMonth: string;
  /**
   * Undefined when Mission Control has not set one. It used to default
   * to the string "Ask us", which then printed on customer-facing pages
   * as "artwork deadline Ask us".
   */
  artworkDeadline?: string;
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
  status: "open" | "almost-full" | "full" | "waitlist";
};

export const UPCOMING_MAILINGS: UpcomingMailing[] = [
  { zoneSlug: "summerville", zoneName: "Summerville", mailMonth: "September 2026", artworkDeadline: "Aug 28", households: "5,000+", spotsTotal: 11, spotsTaken: 9, status: "almost-full" },
  { zoneSlug: "daniel-island", zoneName: "Daniel Island & Clements Ferry", mailMonth: "September 2026", artworkDeadline: "Aug 28", households: "5,000+", spotsTotal: 11, spotsTaken: 10, status: "almost-full" },
  { zoneSlug: "goose-creek", zoneName: "Goose Creek", mailMonth: "October 2026", artworkDeadline: "Sept 25", households: "5,000+", spotsTotal: 11, spotsTaken: 4, status: "open" },
  { zoneSlug: "mount-pleasant", zoneName: "Mount Pleasant", mailMonth: "October 2026", artworkDeadline: "Sept 25", households: "10,000+", spotsTotal: 11, spotsTaken: 6, status: "open" },
  { zoneSlug: "moncks-corner", zoneName: "Moncks Corner", mailMonth: "October 2026", artworkDeadline: "Sept 25", households: "5,000+", spotsTotal: 11, spotsTaken: 2, status: "open" },
  { zoneSlug: "north-charleston", zoneName: "North Charleston", mailMonth: "November 2026", artworkDeadline: "Oct 23", households: "10,000+", spotsTotal: 11, spotsTaken: 3, status: "open" },
  { zoneSlug: "charleston", zoneName: "Charleston", mailMonth: "November 2026", artworkDeadline: "Oct 23", households: "10,000+", spotsTotal: 11, spotsTaken: 5, status: "open" },
  { zoneSlug: "james-island", zoneName: "James Island", mailMonth: "December 2026", artworkDeadline: "Nov 20", households: "5,000+", spotsTotal: 11, spotsTaken: 1, status: "open" },
  { zoneSlug: "johns-island", zoneName: "Johns Island", mailMonth: "December 2026", artworkDeadline: "Nov 20", households: "5,000+", spotsTotal: 11, spotsTaken: 0, status: "open" },
  // The two islands are one mailing: 3,590 mailboxes on Isle of Palms and
  // 1,325 on Sullivans, 4,915 across the two. Listing them separately at
  // 5,000+ each promised roughly twice the reach that exists.
  { zoneSlug: "isle-of-palms", zoneName: "Isle of Palms & Sullivans Island", mailMonth: "Winter 2026", artworkDeadline: "TBD", households: "4,900+", spotsTotal: 11, spotsTaken: 0, status: "waitlist" },
  { zoneSlug: "sullivans-island", zoneName: "Sullivans Island & Isle of Palms", mailMonth: "Winter 2026", artworkDeadline: "TBD", households: "4,900+", spotsTotal: 11, spotsTaken: 0, status: "waitlist" },
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
  `Tentatively mails ${mailMonth}`;

/** Column heading or stat label form. */
export const TENTATIVE_MAIL_LABEL = "Tentative mail date";

/**
 * Days before the tentative mail date that artwork is due.
 *
 * Matches what the advertise page has always told people ("typically
 * two weeks before the mail date"). Derived rather than stored, so a
 * card whose date moves brings its deadline with it.
 */
export const ARTWORK_LEAD_DAYS = 14;

/** The artwork deadline implied by a card's current tentative date. */
export function artworkDeadlineFrom(mailDateIso: string): Date | undefined {
  const d = new Date(mailDateIso);
  if (isNaN(d.getTime())) return undefined;
  d.setDate(d.getDate() - ARTWORK_LEAD_DAYS);
  return d;
}
