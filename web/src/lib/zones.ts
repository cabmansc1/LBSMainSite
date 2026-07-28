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
};

export const ZONES: Zone[] = [
  { slug: "summerville", name: "Summerville", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29483", "29485", "29486"], population: 130_000 /* 52,000+ households on our page, at 2.5 each */ },
  { slug: "mount-pleasant", name: "Mount Pleasant", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29464", "29466"], population: 92_600 /* published on the zone page */ },
  { slug: "daniel-island", name: "Daniel Island & Clements Ferry", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29492"], population: 37_500 /* 15,000+ homes on our page, at 2.5 each */ },
  { slug: "north-charleston", name: "North Charleston", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29405", "29406", "29418", "29420"], population: 115_000 /* published on the zone page */ },
  { slug: "moncks-corner", name: "Moncks Corner", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29461"], population: 12_000 /* published on the zone page */ },
  { slug: "charleston", name: "Charleston", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29401", "29403", "29407", "29412", "29414", "29439", "29455"], population: 150_000 /* published on the zone page */ },
  { slug: "goose-creek", name: "Goose Creek", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29445"], population: 45_000 /* published on the zone page */ },
  { slug: "sullivans-island", name: "Sullivans Island", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29482"], population: 2_000 /* published on the zone page */ },
  { slug: "isle-of-palms", name: "Isle of Palms", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29451"], population: 4_300 /* census; our page quotes only income */ },
  { slug: "james-island", name: "James Island", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29412"], population: 12_000 /* published on the zone page */ },
  { slug: "johns-island", name: "Johns Island", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29455"], population: 21_000 /* published on the zone page */ },
];

export const zoneBySlug = (slug: string) => ZONES.find((z) => z.slug === slug);
