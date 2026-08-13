/**
 * What we print, for the quote page.
 *
 * Data rather than markup so the list, the prices and the turnaround can
 * change without touching the page — and so the same list can feed a
 * quote form later if this ever stops being handled by email.
 *
 * Two fields are deliberately left unset: `fromCents` and
 * `leadTimeDays`. Both depend on the trade printer's actual quotes and
 * schedule, and a made-up number on a public page is worse than no
 * number. The page renders correctly without them and starts showing
 * them the moment they are filled in.
 */

/**
 * Whether /printing is advertised.
 *
 * False while the page is being reworked. The route still renders at
 * its URL, so it can be opened and previewed — what this turns off is
 * every link into it and the sitemap entry, and it asks search engines
 * not to index it in the meantime.
 *
 * Unlinking without the noindex would be the worse half of the job:
 * Google keeps serving a page it has already seen, so the version being
 * rewritten stays in results while nobody on the site can reach it.
 *
 * One flag rather than four deletions, so putting it back is this line
 * rather than remembering every place a link used to be.
 */
export const PRINTING_LIVE = false;

export type PrintProduct = {
  slug: string;
  name: string;
  /** The spec a printer would recognise. */
  spec: string;
  blurb: string;
  /** Quantities worth quoting, smallest first. */
  quantities: number[];
  /**
   * Whether we already hold artwork that works for this.
   *
   * "onFile" is the whole advantage over a national printer: for an
   * advertiser we have designed for, there is nothing to supply and
   * nothing to pay for. "rebuild" means new design work, which is
   * quoted separately rather than absorbed.
   */
  artwork: "onFile" | "rebuild";
  /** Lowest price, in cents. Unset until the rate sheet is filled in. */
  fromCents?: number;
  /** Production days after proof approval. Unset until confirmed. */
  leadTimeDays?: number;
  /** Shown under the name when there is something worth saying. */
  note?: string;
};

export const PRINT_PRODUCTS: PrintProduct[] = [
  {
    slug: "business-cards",
    name: "Business cards",
    spec: '3.5" × 2", 16pt matte or gloss',
    blurb:
      "The most asked-for thing on this page. If we have designed anything for you already, there is nothing for you to send and no design charge.",
    quantities: [250, 500, 1000, 2500],
    artwork: "onFile",
  },
  {
    slug: "flyers",
    name: "Flyers",
    spec: '8.5" × 11", 100lb gloss text',
    blurb:
      "Handouts, counter stacks, event drops. If it is going in the mail rather than a hand, it is priced as a mailing instead — usually cheaper per home.",
    quantities: [250, 500, 1000, 2500],
    artwork: "onFile",
    note: "Send the wording you want on it and we will lay it out.",
  },
  {
    slug: "postcards",
    name: "Postcards",
    spec: '4" × 6" or 5" × 7", 16pt',
    blurb:
      "Not for mailing — leave-behinds after a service call, something in the bag at the counter, a handout at an event.",
    quantities: [250, 500, 1000, 2500],
    artwork: "onFile",
  },
  {
    slug: "magnets",
    name: "Business card magnets",
    spec: '3.5" × 2", 20mil',
    blurb:
      "Worth it for anyone people call in a hurry. A magnet lives on the fridge; a business card lives in a drawer, and the fridge is what somebody looks at when the water heater goes.",
    quantities: [100, 250, 500, 1000],
    artwork: "onFile",
  },
  {
    slug: "brochures",
    name: "Brochures",
    spec: '8.5" × 11" tri-fold, 100lb',
    blurb:
      "Six panels, which is a lot of words. Straightforward if you have the copy; if you do not, we will quote writing it as its own line rather than surprising you with it.",
    quantities: [250, 500, 1000],
    artwork: "rebuild",
  },
  {
    slug: "vehicle-magnets",
    name: "Vehicle magnets",
    spec: '12" × 18" or 18" × 24", sold in pairs',
    blurb:
      "For an unbranded van or truck. The artwork has to be rebuilt to read at forty miles an hour — a shrunk-down ad is unreadable on a door — so design is quoted separately.",
    quantities: [1, 2],
    artwork: "rebuild",
  },
];

export const printProductBySlug = (slug: string) =>
  PRINT_PRODUCTS.find((p) => p.slug === slug);

/** Anything with a price set, so the page can show a "from" line honestly. */
export const anyPriced = () => PRINT_PRODUCTS.some((p) => p.fromCents);
