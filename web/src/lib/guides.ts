/**
 * Long-form guides: the content half of the SEO plan.
 *
 * Each guide is its own route under /guides, written to be the best
 * answer to one commercial question a Lowcountry business actually
 * types into Google. This module is the index they share — the hub page
 * lists them, the guides cross-link through it, and the sitemap reads
 * it — so adding a guide means adding a route and one entry here.
 *
 * Not stored in the database like stories are. A guide is a structured
 * page with its own tables, comparisons and FAQ schema rather than a
 * body of prose, and squeezing that through the block editor would cost
 * more than it saves. The trade is that changing one needs a deploy.
 */

export type Guide = {
  slug: string;
  /** The <h1> and the link text. */
  title: string;
  /** Meta description, and the blurb on the hub. */
  description: string;
  /** One line on listing cards — shorter than the description. */
  blurb: string;
  /**
   * What this page is trying to rank for. Kept in the code because a
   * guide that forgets its target drifts into a general article that
   * ranks for nothing.
   */
  targets: string[];
  /** ISO date, for dateModified in schema and "updated" on the page. */
  updated: string;
  /** Roughly how long it takes to read, for the listing. */
  minutes: number;
};

export const GUIDES: Guide[] = [
  {
    slug: "eddm-cost-charleston",
    title: "What EDDM Actually Costs in Charleston",
    description:
      "The real all-in cost of an Every Door Direct Mail campaign in the Charleston area — postage, printing, design and the parts nobody mentions — compared honestly against a shared postcard.",
    blurb:
      "Every line item in a DIY EDDM campaign, and when it beats a shared card.",
    targets: ["eddm cost per piece", "eddm charleston sc", "every door direct mail charleston"],
    updated: "2026-08-13",
    minutes: 9,
  },
  {
    slug: "direct-mail-cost-per-household",
    title: "Direct Mail Cost Per Household: A Real Breakdown",
    description:
      "What direct mail actually costs per home in the Charleston Lowcountry, across shared mail, EDDM and solo campaigns — with the variables that move the number most.",
    blurb: "The per-home number, and everything that changes it.",
    targets: [
      "direct mail cost per household",
      "how much does direct mail advertising cost",
      "direct mail marketing cost small business",
    ],
    updated: "2026-08-13",
    minutes: 8,
  },
  {
    slug: "is-direct-mail-worth-it",
    title: "Is Direct Mail Worth It for a Small Business?",
    description:
      "An honest answer, including the businesses it does not work for. What a realistic response looks like, what it costs to test, and how to tell before you spend.",
    blurb: "Including the cases where the answer is no.",
    targets: [
      "is direct mail worth it for small business",
      "does direct mail still work",
    ],
    updated: "2026-08-13",
    minutes: 7,
  },
  {
    slug: "charleston-direct-mail-companies",
    title: "Charleston Direct Mail Companies Compared",
    description:
      "Valpak, Money Mailer, Clipper, solo EDDM, national printers and shared postcards — what each is genuinely best at, and how to pick for your business and budget.",
    blurb: "Six ways to reach Lowcountry mailboxes, compared fairly.",
    targets: [
      "postcard marketing companies",
      "valpak alternative charleston",
      "direct mail companies charleston sc",
    ],
    updated: "2026-08-13",
    minutes: 10,
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

/** Everything except the one being read, for the cross-links at the foot. */
export const otherGuides = (slug: string) => GUIDES.filter((g) => g.slug !== slug);
