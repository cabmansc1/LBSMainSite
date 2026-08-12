import { ZONES } from "@/lib/zones";

/**
 * Limited-run offers on postcard advertising.
 *
 * Deliberately data rather than a page of hand-written copy. A special
 * is a zone list, a run of months, how many of them are paid for, and a
 * date it stops being offered — which is enough to render the page, work
 * out the saving from live pricing, and take itself down when it expires.
 * The next one is a new entry here, not a new page.
 *
 * Nothing about this is self-serve. Checkout sells one mailing at a time
 * (an order carries a single card id), so a multi-month run cannot be
 * bought through it without teaching orders to span mailings. Until that
 * is worth building, these land as leads and get invoiced by hand — which
 * also means an offer can be tried out without shipping a payment flow
 * for something that might not sell.
 */

export type Special = {
  /** URL-safe, and what a lead quotes back. */
  id: string;
  /** Short name, for a heading. */
  name: string;
  /** The offer in one line. */
  headline: string;
  /** Month names in mailing order, e.g. ["October", "November"]. */
  months: string[];
  year: number;
  /** How many of those months are actually paid for. */
  monthsPaid: number;
  /**
   * Where the offer is good, as the labels a buyer picks from.
   *
   * Plain labels rather than zone slugs, because the areas worth
   * promoting are not always the areas we mail. West Ashley sits inside
   * the Charleston zone and Nexton and Cane Bay inside Summerville;
   * both are what somebody buying there would call the place, and
   * neither has a slug to point at. The field is only ever a label on a
   * lead, so a name is the honest type for it.
   *
   * Empty means everywhere we mail, and the zone names are used.
   */
  areas: string[];
  blurb: string;
  /** The small print, each line a bullet. */
  terms: string[];
  /** Last day it is offered, YYYY-MM-DD. After this it stops rendering. */
  sellUntil: string;
};

export const SPECIALS: Special[] = [
  {
    id: "q4-2026",
    name: "Fourth-quarter run",
    headline: "Three mailings for the price of two",
    months: ["October", "November", "December"],
    year: 2026,
    monthsPaid: 2,
    // The four growth areas this is being pitched into, not every zone.
    // Two of them are not zones at all — West Ashley is part of the
    // Charleston card and Nexton and Cane Bay part of Summerville's —
    // which is exactly why this list is labels rather than slugs.
    areas: [
      "Nexton/Cane Bay (Summerville)",
      "Mount Pleasant",
      "Daniel Island",
      "West Ashley",
    ],
    blurb:
      "The three months your customers are already spending. Book the " +
      "October, November and December mailings together and the third " +
      "one is on us — same spot, same zone, same card, three times in " +
      "front of the same homes.",
    terms: [
      "All three mailings in the same area, in the same spot size.",
      "The free month is December, and it is the third of the three.",
      "Artwork can change between mailings at no charge.",
      "Invoiced once, up front, for the two paid months.",
      "Subject to space on all three cards at the time of booking.",
    ],
    sellUntil: "2026-09-30",
  },
];

/** How many months come free. */
export const freeMonths = (s: Special) => s.months.length - s.monthsPaid;

/**
 * The areas a special is good in, as labels.
 *
 * These are what the claim form offers, so an offer that only runs in
 * four places cannot be claimed for a fifth by picking it off a list
 * of everywhere we mail.
 */
export const areasFor = (s: Special): string[] =>
  s.areas.length === 0 ? ZONES.map((z) => z.name) : s.areas;

/** "October, November and December" — the run, said out loud. */
export function monthsSentence(s: Special): string {
  const m = s.months;
  if (m.length <= 1) return m[0] ?? "";
  return `${m.slice(0, -1).join(", ")} and ${m[m.length - 1]}`;
}

/**
 * Still on offer today.
 *
 * String comparison, because both sides are YYYY-MM-DD and that sorts
 * correctly without constructing a Date and inheriting a timezone
 * argument about what "today" means on the last day of a special.
 */
export function activeSpecials(today = new Date()): Special[] {
  const iso = today.toISOString().slice(0, 10);
  return SPECIALS.filter((s) => s.sellUntil >= iso);
}

export const specialById = (id: string) => SPECIALS.find((s) => s.id === id);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * The closing date, written out.
 *
 * Split rather than parsed into a Date on purpose: "2026-09-30" becomes
 * midnight UTC, and formatting that anywhere west of Greenwich renders
 * the 29th — a deadline a day earlier than the one being honoured.
 */
export function sellUntilLabel(s: Special): string {
  const [year, month, day] = s.sellUntil.split("-").map(Number);
  const name = MONTH_NAMES[month - 1];
  return name ? `${name} ${day}, ${year}` : s.sellUntil;
}

/**
 * The message the claim form arrives pre-filled with.
 *
 * Written as the advertiser, because it is their message. It says which
 * offer and which months so the invoice can be raised without a reply
 * asking what they meant, and it leaves the zone and spot size to the
 * fields that already ask for them.
 */
export const leadMessage = (s: Special) =>
  `I would like to claim the ${s.name.toLowerCase()} special — ` +
  `${monthsSentence(s)} ${s.year}, ${s.months.length} mailings for the ` +
  `price of ${s.monthsPaid}.`;
