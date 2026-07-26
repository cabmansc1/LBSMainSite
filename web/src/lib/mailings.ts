/**
 * Upcoming mailing schedule. Sample data until Phase 4 wires this to the
 * postcard_mailings table; the shapes match the Drizzle schema so the
 * swap is a query change only.
 */
export type UpcomingMailing = {
  /** Mission Control card id. A zone can have several cards filling at once. */
  cardId?: string;
  zoneSlug: string;
  zoneName: string;
  mailMonth: string;
  artworkDeadline: string;
  households: string;
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
  { zoneSlug: "isle-of-palms", zoneName: "Isle of Palms", mailMonth: "Winter 2026", artworkDeadline: "TBD", households: "5,000+", spotsTotal: 11, spotsTaken: 0, status: "waitlist" },
  { zoneSlug: "sullivans-island", zoneName: "Sullivans Island", mailMonth: "Winter 2026", artworkDeadline: "TBD", households: "5,000+", spotsTotal: 11, spotsTaken: 0, status: "waitlist" },
];
