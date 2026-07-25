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
};

export const ZONES: Zone[] = [
  { slug: "summerville", name: "Summerville", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29483", "29485", "29486"] },
  { slug: "mount-pleasant", name: "Mount Pleasant", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29464", "29466"] },
  { slug: "daniel-island", name: "Daniel Island & Clements Ferry", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29492"] },
  { slug: "north-charleston", name: "North Charleston", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29405", "29406", "29418", "29420"] },
  { slug: "moncks-corner", name: "Moncks Corner", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29461"] },
  { slug: "charleston", name: "Charleston", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29401", "29403", "29407", "29412", "29414", "29439", "29455"] },
  { slug: "goose-creek", name: "Goose Creek", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29445"] },
  { slug: "sullivans-island", name: "Sullivans Island", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29482"] },
  { slug: "isle-of-palms", name: "Isle of Palms", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29451"] },
  { slug: "james-island", name: "James Island", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29412"] },
  { slug: "johns-island", name: "Johns Island", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29455"] },
];

export const zoneBySlug = (slug: string) => ZONES.find((z) => z.slug === slug);
