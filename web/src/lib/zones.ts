/**
 * The 11 service zones, ported from pricing_config.php ($location_data).
 * Seed data for the mailing_zones table and the coverage map.
 */
export type Zone = {
  slug: string;
  name: string;
  households5k: string;
  households10k: string;
  zipCodes: string[];
  /**
   * People living in the zone, used to size the coverage map bubbles.
   *
   * Figures are the ones our own zone pages publish. Where a page quotes
   * homes rather than people, the number is converted at 2.5 per
   * household, which is the average those same pages quote (2.48 to
   * 2.78). Isle of Palms has no published figure and uses the census
   * count. These drive nothing but bubble size, so an approximate number
   * is fine; a wrong one only makes a circle the wrong size.
   */
  population: number;
  /**
   * Deliverable mailboxes counted off a real mailing, where we have one.
   *
   * Only set for zones too small to fill a run on their own, which is
   * the case the reach figures above get wrong: they are the product
   * tiers, 5,000 and 10,000, and reading them as a promise about one
   * small zone is how a page ends up offering more mailboxes than the
   * place contains.
   */
  mailboxes?: number;
  /**
   * Said on the page wherever the reach is quoted, for a zone that never
   * mails alone.
   */
  reachNote?: string;
  /**
   * What the reach figure actually covers, when it is more than this
   * zone. Used in the copy in place of the zone name, so a description
   * does not claim a number of households for a place that does not
   * have them.
   */
  reachArea?: string;
};

export const ZONES: Zone[] = [
  { slug: "summerville", name: "Summerville", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29483", "29485", "29486"], population: 160_000 /* 29483, 29485 and 29486 reach across Dorchester,
      Berkeley and Charleston counties, which is wider than the 52,000+
      households our zone page counts */ },
  { slug: "mount-pleasant", name: "Mount Pleasant", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29464", "29466"], population: 92_600 /* published on the zone page */ },
  { slug: "daniel-island", name: "Daniel Island & Clements Ferry", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29492"], population: 37_500 /* 15,000+ homes on our page, at 2.5 each */ },
  { slug: "north-charleston", name: "North Charleston", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29405", "29406", "29418", "29420"], population: 115_000 /* published on the zone page */ },
  { slug: "moncks-corner", name: "Moncks Corner", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29461"], population: 12_000 /* published on the zone page */ },
  { slug: "charleston", name: "Charleston", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29401", "29403", "29407", "29412", "29414", "29439", "29455"], population: 150_000 /* published on the zone page */ },
  { slug: "hanahan", name: "Hanahan", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29410"], population: 25_000 /* 2020 census; no zone page figure to draw on yet */ },
  { slug: "goose-creek", name: "Goose Creek", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29445"], population: 45_000 /* published on the zone page */ },
  {
    slug: "sullivans-island",
    name: "Sullivans Island",
    // 1,325 mailboxes on Sullivan's and 3,590 on Isle of Palms, counted
    // off a real mailing. The islands always go out together, so the
    // combined 4,915 is the honest figure for either page; neither can
    // offer 5,000 on its own.
    households5k: "4,900+",
    households10k: "10,000+",
    mailboxes: 1_325,
    reachArea: "Sullivan's Island and Isle of Palms",
    reachNote:
      "Sullivan's Island and Isle of Palms mail together as one card, 4,915 mailboxes across the two. A larger run adds Mount Pleasant.",
    zipCodes: ["29482"],
    population: 2_000 /* published on the zone page */,
  },
  {
    slug: "isle-of-palms",
    name: "Isle of Palms",
    households5k: "4,900+",
    households10k: "10,000+",
    mailboxes: 3_590,
    reachArea: "Isle of Palms and Sullivan's Island",
    reachNote:
      "Isle of Palms and Sullivan's Island mail together as one card, 4,915 mailboxes across the two. A larger run adds Mount Pleasant.",
    zipCodes: ["29451"],
    population: 4_300 /* census; our page quotes only income */,
  },
  { slug: "james-island", name: "James Island", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29412"], population: 12_000 /* published on the zone page */ },
  { slug: "johns-island", name: "Johns Island", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29455"], population: 21_000 /* published on the zone page */ },
];

export const zoneBySlug = (slug: string) => ZONES.find((z) => z.slug === slug);
