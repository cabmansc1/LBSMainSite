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
   * Deliverable mailboxes in the zone, counted off real postal routes.
   *
   * Not the same question as the reach figures above, which are the
   * product tiers: 5,000 and 10,000 per mailing. This is how much zone
   * there is to mail, which decides two different things. Below a tier
   * it is a correction, because a page cannot offer more mailboxes than
   * the place contains. Above one it is the headroom: how many mailings
   * it takes to cover the zone.
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
  /**
   * The zone this one always shares a card with.
   *
   * A zone too small to fill a run does not mail alone, so the map, the
   * calendar and the upcoming-cards list have to show the pair as one
   * thing. Set it on both sides; MAILING_AREAS below reads it and
   * collapses them.
   */
  mailsWith?: string;
};

export const ZONES: Zone[] = [
  { slug: "summerville", name: "Summerville", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29483", "29485", "29486"], population: 160_000 /* 29483, 29485 and 29486 reach across Dorchester,
      Berkeley and Charleston counties, which is wider than the 52,000+
      households our zone page counts */ },
  { slug: "mount-pleasant", name: "Mount Pleasant", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29464", "29466"], population: 92_600 /* published on the zone page */ },
  { slug: "daniel-island", name: "Daniel Island & Clements Ferry", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29492"], population: 37_500 /* 15,000+ homes on our page, at 2.5 each */ },
  { slug: "north-charleston", name: "North Charleston", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29405", "29406", "29418", "29420"], population: 115_000 /* published on the zone page */ },
  { slug: "moncks-corner", name: "Moncks Corner", households5k: "5,000+", households10k: "10,000+", mailboxes: 21_614, zipCodes: ["29461"], population: 12_000 /* the town; 29461 reaches well past it into Berkeley County */ },
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
    mailsWith: "isle-of-palms",
    reachArea: "Sullivan's Island and Isle of Palms",
    reachNote:
      "Sullivan's Island and Isle of Palms mail together as one card, {cardMailboxes} mailboxes across the two. A larger run adds Mount Pleasant.",
    zipCodes: ["29482"],
    population: 2_000 /* published on the zone page */,
  },
  {
    slug: "isle-of-palms",
    name: "Isle of Palms",
    households5k: "4,900+",
    households10k: "10,000+",
    mailboxes: 3_590,
    mailsWith: "sullivans-island",
    reachArea: "Isle of Palms and Sullivan's Island",
    reachNote:
      "Isle of Palms and Sullivan's Island mail together as one card, {cardMailboxes} mailboxes across the two. A larger run adds Mount Pleasant.",
    zipCodes: ["29451"],
    population: 4_300 /* census; our page quotes only income */,
  },
  { slug: "james-island", name: "James Island", households5k: "5,000+", households10k: "10,000+", mailboxes: 20_307, zipCodes: ["29412"], population: 12_000 /* the incorporated town; 29412 covers more */ },
  { slug: "johns-island", name: "Johns Island", households5k: "5,000+", households10k: "10,000+", zipCodes: ["29455"], population: 21_000 /* published on the zone page */ },
];

export const zoneBySlug = (slug: string) => ZONES.find((z) => z.slug === slug);

/**
 * A card, rather than a place.
 *
 * Every zone has its own page, its own ZIP codes and its own history,
 * and that stays true. But a card is what gets printed and mailed, and
 * two zones small enough to share one are a single thing to anybody
 * choosing where to advertise. Drawing them as two bubbles on the map,
 * or listing them as two rows on the calendar, quietly doubled a reach
 * that only exists once.
 */
export type MailingArea = {
  /** The zone a click lands on: the larger half of a pair. */
  slug: string;
  name: string;
  /** Every zone on this card, the lead one first. */
  zoneSlugs: string[];
  households5k: string;
  households10k: string;
  zipCodes: string[];
  population: number;
  /** Deliverable mailboxes across the card, where all of them are counted. */
  mailboxes?: number;
  /** Said wherever the reach is quoted, for a card that covers two zones. */
  note?: string;
};

export function mailingAreasFrom(zones: Zone[]): MailingArea[] {
  const placed = new Set<string>();
  const areas: MailingArea[] = [];

  for (const zone of zones) {
    if (placed.has(zone.slug)) continue;
    const partner = zone.mailsWith
      ? zones.find((z) => z.slug === zone.mailsWith)
      : undefined;
    placed.add(zone.slug);

    // A zone of one. Named and sized exactly as it always was.
    if (!partner) {
      areas.push({
        slug: zone.slug,
        name: zone.name,
        zoneSlugs: [zone.slug],
        households5k: zone.households5k,
        households10k: zone.households10k,
        zipCodes: zone.zipCodes,
        population: zone.population,
        mailboxes: zone.mailboxes,
        note: zone.reachNote,
      });
      continue;
    }

    placed.add(partner.slug);
    // The bigger half leads, so the name and the link land on the zone
    // that carries most of the mailboxes.
    const [lead, other] =
      (partner.mailboxes ?? 0) > (zone.mailboxes ?? 0)
        ? [partner, zone]
        : [zone, partner];

    areas.push({
      slug: lead.slug,
      name: `${lead.name} & ${other.name}`,
      zoneSlugs: [lead.slug, other.slug],
      households5k: lead.households5k,
      households10k: lead.households10k,
      zipCodes: [...lead.zipCodes, ...other.zipCodes],
      population: lead.population + other.population,
      mailboxes:
        lead.mailboxes != null && other.mailboxes != null
          ? lead.mailboxes + other.mailboxes
          : undefined,
      note: lead.reachNote,
    });
  }

  return areas;
}

/**
 * What the map draws and the calendar lists: one entry per card.
 *
 * The code default. Anything reading live figures wants
 * getLiveMailingAreas from lib/zone-store, which layers the admin's
 * saved counts on top; this is what it falls back to.
 */
export const MAILING_AREAS: MailingArea[] = mailingAreasFrom(ZONES);

/** The card a zone mails on, which for most zones is itself. */
export const mailingAreaFor = (slug: string) =>
  MAILING_AREAS.find((a) => a.zoneSlugs.includes(slug));

/**
 * The facts an admin can set per zone, saved as one settings row.
 *
 * Deliberately only the countable ones. Prose stays in code, because a
 * sentence is written rather than measured; the numbers a sentence
 * quotes come from here through the {mailboxes} token.
 */
export type ZoneFacts = {
  mailboxes?: number | null;
  population?: number;
  mailsWith?: string | null;
};

export type ZoneFactOverrides = Record<string, ZoneFacts>;

/**
 * Code defaults with the admin's saved facts on top.
 *
 * A missing or malformed override changes nothing, which is the whole
 * point: an empty settings table has to leave the site exactly as it
 * ships. Pairings are applied from both sides, so setting "mails with"
 * on one zone is enough.
 */
export function zonesWith(overrides: ZoneFactOverrides | null): Zone[] {
  if (!overrides) return ZONES;

  // Always a copy, never the ZONES entry itself: the pairing pass below
  // writes to these, and writing through to the module constant would
  // leak one request's override into every later request.
  const merged = ZONES.map((zone) => {
    const next = { ...zone };
    const patch = overrides[zone.slug];
    if (!patch) return next;

    // null clears a count back to "we have not counted this one".
    if (patch.mailboxes === null) delete next.mailboxes;
    else if (typeof patch.mailboxes === "number" && patch.mailboxes > 0) {
      next.mailboxes = Math.round(patch.mailboxes);
    }

    // Population only sizes a map bubble, so a zero would draw nothing.
    if (typeof patch.population === "number" && patch.population > 0) {
      next.population = Math.round(patch.population);
    }

    if (patch.mailsWith === null) delete next.mailsWith;
    else if (typeof patch.mailsWith === "string" && patch.mailsWith) {
      next.mailsWith = patch.mailsWith;
    }
    return next;
  });

  // A one-sided pairing would put a zone on a card that does not know
  // about it, and mailingAreasFrom would then place both separately.
  const bySlug = new Map(merged.map((z) => [z.slug, z]));
  for (const zone of merged) {
    const partner = zone.mailsWith ? bySlug.get(zone.mailsWith) : undefined;
    if (partner && partner.mailsWith !== zone.slug) {
      partner.mailsWith = zone.slug;
    }
  }
  return merged;
}
