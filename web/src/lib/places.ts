import "server-only";
import { sql } from "drizzle-orm";
import {
  PLACE_KINDS as KIND_LIST,
  type Place,
  type PlaceKind,
  slugifyPlace,
} from "@/lib/places-types";

/**
 * Where things are, for the consumer side of the site.
 *
 * The site already had two ideas of place and they never met. The twelve
 * mailing zones live in zones.ts and drive postcards, pricing and the
 * coverage map. The directory areas live in directory_locations and
 * drive listing filters. Neither had a market tier, and neither had
 * anywhere to put West Ashley or Ladson: places people search for and
 * identify with, which are not products you can buy.
 *
 * So this is a third thing, deliberately. It is a presentation layer.
 * Nothing here prices a card, holds a spot or decides what mails. A
 * place points AT the mailing zone that covers it, and points AT the
 * directory area that files listings under it, and owns neither. The
 * revenue path keeps reading zones.ts exactly as it did.
 *
 * That separation is what lets a neighbourhood exist. Ladson is its own
 * community with its own residents searching for it, and it is reached
 * by the Summerville card. Both of those are true at once, and only a
 * place with a nullable bridge to a zone can say so.
 */

export type { PlaceKind, Place } from "@/lib/places-types";
export { PLACE_KINDS, slugifyPlace } from "@/lib/places-types";

/**
 * The starting shape of the Lowcountry, as agreed with Andrew.
 *
 * Two things here look inconsistent and are not. First, some markets
 * carry a mailing zone and some do not: Summerville and Moncks Corner
 * are each one card and one market, so the market IS the card, while
 * East Cooper and North Area are groupings of several cards and sell
 * nothing themselves. Kind describes where a place sits in the tree;
 * mailingZoneSlug describes whether you can buy it. They were made
 * separate columns precisely so a place can be one without the other.
 *
 * Second, the Charleston card's ZIPs overlap the James Island and Johns
 * Island cards, because 29412 and 29455 appear on all three. That is how
 * the zones were drawn years ago and it is not this table's job to
 * relitigate it. Charleston is the parent here because that is how the
 * area is sold, not because the postal geography nests cleanly.
 *
 * directorySlug is left unset throughout. The directory areas are a list
 * Andrew maintains himself and guessing at its slugs would file listings
 * under the wrong towns; the admin screen picks them from the real list.
 */
type Seed = Omit<Place, "id" | "order"> & { order?: number };

export const PLACE_SEED: Seed[] = [
  {
    slug: "greater-charleston",
    name: "Greater Charleston",
    kind: "region",
    parentSlug: null,
    blurb:
      "The Lowcountry from the beaches to Berkeley County, and every local business in between.",
    active: true,
    mailingZoneSlug: null,
    directorySlug: null,
  },

  /* ---------- East Cooper ---------- */
  {
    slug: "east-cooper",
    name: "East Cooper",
    kind: "market",
    parentSlug: "greater-charleston",
    blurb:
      "Mount Pleasant, Daniel Island and the beach communities across the Cooper River.",
    active: true,
    mailingZoneSlug: null,
    directorySlug: null,
  },
  {
    slug: "mount-pleasant",
    name: "Mount Pleasant",
    kind: "zone",
    parentSlug: "east-cooper",
    blurb: "",
    active: true,
    mailingZoneSlug: "mount-pleasant",
    directorySlug: null,
  },
  {
    slug: "daniel-island",
    name: "Daniel Island & Clements Ferry",
    kind: "zone",
    parentSlug: "east-cooper",
    blurb: "",
    active: true,
    mailingZoneSlug: "daniel-island",
    directorySlug: null,
  },
  {
    slug: "sullivans-island",
    name: "Sullivans Island",
    kind: "zone",
    parentSlug: "east-cooper",
    blurb: "",
    active: true,
    mailingZoneSlug: "sullivans-island",
    directorySlug: null,
  },
  {
    slug: "isle-of-palms",
    name: "Isle of Palms",
    kind: "zone",
    parentSlug: "east-cooper",
    blurb: "",
    active: true,
    mailingZoneSlug: "isle-of-palms",
    directorySlug: null,
  },

  /* ---------- Charleston ---------- */
  {
    slug: "charleston",
    name: "Charleston",
    kind: "market",
    parentSlug: "greater-charleston",
    blurb:
      "Downtown, West Ashley, James Island, Johns Island and Folly Beach.",
    active: true,
    mailingZoneSlug: "charleston",
    directorySlug: null,
  },
  {
    slug: "james-island",
    name: "James Island",
    kind: "zone",
    parentSlug: "charleston",
    blurb: "",
    active: true,
    mailingZoneSlug: "james-island",
    directorySlug: null,
  },
  {
    slug: "johns-island",
    name: "Johns Island",
    kind: "zone",
    parentSlug: "charleston",
    blurb: "",
    active: true,
    mailingZoneSlug: "johns-island",
    directorySlug: null,
  },
  {
    slug: "west-ashley",
    name: "West Ashley",
    kind: "neighborhood",
    parentSlug: "charleston",
    blurb: "",
    active: true,
    mailingZoneSlug: "charleston",
    directorySlug: null,
  },
  {
    slug: "downtown-charleston",
    name: "Downtown Charleston",
    kind: "neighborhood",
    parentSlug: "charleston",
    blurb: "",
    active: true,
    mailingZoneSlug: "charleston",
    directorySlug: null,
  },
  {
    slug: "folly-beach",
    name: "Folly Beach",
    kind: "neighborhood",
    parentSlug: "charleston",
    blurb: "",
    active: true,
    mailingZoneSlug: "charleston",
    directorySlug: null,
  },

  /* ---------- North Area ---------- */
  {
    slug: "north-area",
    name: "North Area",
    kind: "market",
    parentSlug: "greater-charleston",
    blurb: "North Charleston, Hanahan, Goose Creek and Ladson.",
    active: true,
    mailingZoneSlug: null,
    directorySlug: null,
  },
  {
    slug: "north-charleston",
    name: "North Charleston",
    kind: "zone",
    parentSlug: "north-area",
    blurb: "",
    active: true,
    mailingZoneSlug: "north-charleston",
    directorySlug: null,
  },
  {
    slug: "hanahan",
    name: "Hanahan",
    kind: "zone",
    parentSlug: "north-area",
    blurb: "",
    active: true,
    mailingZoneSlug: "hanahan",
    directorySlug: null,
  },
  {
    slug: "goose-creek",
    name: "Goose Creek",
    kind: "zone",
    parentSlug: "north-area",
    blurb: "",
    active: true,
    mailingZoneSlug: "goose-creek",
    directorySlug: null,
  },
  {
    // An unincorporated community in its own right, bordered by
    // Summerville, North Charleston and Goose Creek and belonging to
    // none of them. It sits here because that is where residents place
    // it, and it points at the Summerville card because that is what
    // actually reaches those mailboxes today. A strong candidate to
    // become its own zone later, at which point only the kind and the
    // bridge change.
    slug: "ladson",
    name: "Ladson",
    kind: "neighborhood",
    parentSlug: "north-area",
    blurb: "",
    active: true,
    mailingZoneSlug: "summerville",
    directorySlug: null,
  },

  /* ---------- Summerville ---------- */
  {
    slug: "summerville",
    name: "Summerville",
    kind: "market",
    parentSlug: "greater-charleston",
    blurb: "Summerville, Knightsville, Lincolnville and the Nexton corridor.",
    active: true,
    mailingZoneSlug: "summerville",
    directorySlug: null,
  },
  {
    slug: "knightsville",
    name: "Knightsville",
    kind: "neighborhood",
    parentSlug: "summerville",
    blurb: "",
    active: true,
    mailingZoneSlug: "summerville",
    directorySlug: null,
  },
  {
    slug: "lincolnville",
    name: "Lincolnville",
    kind: "neighborhood",
    parentSlug: "summerville",
    blurb: "",
    active: true,
    mailingZoneSlug: "summerville",
    directorySlug: null,
  },
  {
    slug: "nexton-cane-bay",
    name: "Nexton & Cane Bay",
    kind: "neighborhood",
    parentSlug: "summerville",
    blurb: "",
    active: true,
    mailingZoneSlug: "summerville",
    directorySlug: null,
  },

  /* ---------- Moncks Corner ---------- */
  {
    slug: "moncks-corner",
    name: "Moncks Corner",
    kind: "market",
    parentSlug: "greater-charleston",
    blurb: "Berkeley County's seat, twenty minutes north of Summerville.",
    active: true,
    mailingZoneSlug: "moncks-corner",
    directorySlug: null,
  },
];

/** The seed as Place rows, for when the table cannot be read. */
const seedAsPlaces = (): Place[] =>
  PLACE_SEED.map((p, i) => ({
    ...p,
    id: i + 1,
    order: p.order ?? (i + 1) * 10,
  }));

/* ------------------------------------------------------------------ */

/**
 * Created from admin writes only.
 *
 * DDL on a public request path is one of the things the migration set
 * out to stop doing: it turns every page view into a schema check, and
 * it means a read can fail in a way only a write should be able to. So
 * public reads below tolerate the table being absent and fall back to
 * the seed instead of creating it.
 */
async function ensurePlaceTable() {
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_places (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(80) NOT NULL UNIQUE,
      name VARCHAR(120) NOT NULL,
      kind VARCHAR(16) NOT NULL DEFAULT 'zone',
      parent_slug VARCHAR(80) NULL,
      blurb TEXT NULL,
      display_order INT NOT NULL DEFAULT 0,
      is_active TINYINT NOT NULL DEFAULT 1,
      mailing_zone_slug VARCHAR(80) NULL,
      directory_slug VARCHAR(80) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY parent_idx (parent_slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
}

/**
 * Puts the seed in, once.
 *
 * INSERT IGNORE against the unique slug, so running it again after
 * somebody has renamed East Cooper or written a blurb changes nothing.
 * The seed is a starting point, not a spec the table is held to.
 */
async function seedPlaces() {
  const { db } = await import("@/lib/db");
  for (const [i, p] of PLACE_SEED.entries()) {
    await db.execute(
      sql`INSERT IGNORE INTO lbs_places
            (slug, name, kind, parent_slug, blurb, display_order,
             is_active, mailing_zone_slug, directory_slug)
          VALUES (${p.slug}, ${p.name}, ${p.kind}, ${p.parentSlug},
                  ${p.blurb}, ${(i + 1) * 10}, ${p.active ? 1 : 0},
                  ${p.mailingZoneSlug}, ${p.directorySlug})`,
    );
  }
}

/** Creates the table if needed and makes sure the seed is in it. */
export async function ensurePlaces() {
  await ensurePlaceTable();
  await seedPlaces();
}

type Row = {
  id: number;
  slug: string;
  name: string;
  kind: string;
  parent_slug: string | null;
  blurb: string | null;
  display_order: number | null;
  is_active: number | null;
  mailing_zone_slug: string | null;
  directory_slug: string | null;
};

const KINDS = new Set<string>(KIND_LIST.map((k) => k.value));

const toPlace = (r: Row): Place => ({
  id: Number(r.id),
  slug: String(r.slug),
  name: String(r.name),
  // A kind the code does not know about would fall through every switch
  // in the templates and render as nothing at all. Treating it as a
  // neighbourhood keeps the place visible and harmless.
  kind: KINDS.has(r.kind) ? (r.kind as PlaceKind) : "neighborhood",
  parentSlug: r.parent_slug || null,
  blurb: r.blurb ?? "",
  order: Number(r.display_order ?? 0),
  // Written as 1 or 0 by every path here, but read the same way the
  // directory areas are: only a literal 1 is on, so a NULL arriving from
  // anywhere is off rather than accidentally live.
  active: Number(r.is_active) === 1,
  mailingZoneSlug: r.mailing_zone_slug || null,
  directorySlug: r.directory_slug || null,
});

/**
 * Every place, seeded shape included.
 *
 * Falls back to the seed whenever the table cannot answer: not created
 * yet, empty, or unreachable because this is running inside the Docker
 * build where there is no database at all. A page that renders the
 * Lowcountry from code is right; a page that renders no markets because
 * a build container could not connect is a deploy that ships a broken
 * site.
 */
export async function listPlaces(): Promise<Place[]> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT id, slug, name, kind, parent_slug, blurb, display_order,
                 is_active, mailing_zone_slug, directory_slug
            FROM lbs_places
           ORDER BY display_order, name`,
    )) as unknown as [Row[]];
    const found = (rows[0] ?? []).map(toPlace);
    return found.length ? found : seedAsPlaces();
  } catch {
    return seedAsPlaces();
  }
}

/** Just the ones that should appear on the site. */
export async function listActivePlaces(): Promise<Place[]> {
  return (await listPlaces()).filter((p) => p.active);
}

export async function placeBySlug(slug: string): Promise<Place | undefined> {
  return (await listPlaces()).find((p) => p.slug === slug);
}

export type PlaceNode = Place & { children: PlaceNode[] };

/**
 * The tree, for the admin screen and the market hubs.
 *
 * Built from a flat list rather than queried recursively, because there
 * are a few dozen rows and three levels. A place whose parent is missing
 * or inactive is attached to the root instead of being dropped, so a bad
 * parent_slug shows up on the screen as something to fix rather than
 * silently removing a market and everything under it.
 */
export function buildPlaceTree(places: Place[]): PlaceNode[] {
  const nodes = new Map<string, PlaceNode>(
    places.map((p) => [p.slug, { ...p, children: [] }]),
  );
  const roots: PlaceNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentSlug ? nodes.get(node.parentSlug) : undefined;
    if (parent && parent.slug !== node.slug) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (list: PlaceNode[]) => {
    list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export async function getPlaceTree(): Promise<PlaceNode[]> {
  return buildPlaceTree(await listPlaces());
}

/** The markets, in order, for nav chips and the explore grid. */
export async function listMarkets(): Promise<Place[]> {
  return (await listActivePlaces())
    .filter((p) => p.kind === "market")
    .sort((a, b) => a.order - b.order);
}

/**
 * Which card to sell someone standing on this place's page.
 *
 * Walks up the tree, because a neighbourhood without its own bridge is
 * still reachable through whatever covers its parent. Returns the zone
 * slug for zones.ts to resolve, or null when nothing mails here yet,
 * which the templates show as "not mailing here yet" rather than a
 * broken reserve button.
 */
export function mailingZoneFor(
  slug: string,
  places: Place[],
): string | null {
  const by = new Map(places.map((p) => [p.slug, p]));
  const seen = new Set<string>();
  let cur = by.get(slug);
  while (cur && !seen.has(cur.slug)) {
    if (cur.mailingZoneSlug) return cur.mailingZoneSlug;
    seen.add(cur.slug);
    cur = cur.parentSlug ? by.get(cur.parentSlug) : undefined;
  }
  return null;
}

/* ---------- writes ---------- */

export type PlaceResult = { ok: true } | { ok: false; error: string };

export type PlacePatch = {
  name: string;
  kind: PlaceKind;
  parentSlug: string | null;
  blurb: string;
  mailingZoneSlug: string | null;
  directorySlug: string | null;
  active: boolean;
};

/**
 * Adds a place.
 *
 * The slug comes from the name and never changes afterwards, the same
 * rule the directory areas follow and for the same reason: stories and
 * events will record a place by slug, and a rename that moved the slug
 * would orphan every one of them.
 */
export async function createPlace(
  name: string,
  patch: Partial<PlacePatch> = {},
): Promise<PlaceResult> {
  const display = name.trim();
  const slug = slugifyPlace(display);
  if (display.length < 2 || !slug) return { ok: false, error: "Give it a name." };
  try {
    await ensurePlaces();
    const { db } = await import("@/lib/db");
    const clash = (await db.execute(
      sql`SELECT name FROM lbs_places WHERE slug = ${slug} LIMIT 1`,
    )) as unknown as [{ name: string }[]];
    if (clash[0]?.[0]) {
      return { ok: false, error: `That is already here as "${clash[0][0].name}".` };
    }
    const next = (await db.execute(
      sql`SELECT COALESCE(MAX(display_order), 0) + 10 AS n FROM lbs_places`,
    )) as unknown as [{ n: number }[]];
    await db.execute(
      sql`INSERT INTO lbs_places
            (slug, name, kind, parent_slug, blurb, display_order,
             is_active, mailing_zone_slug, directory_slug)
          VALUES (${slug}, ${display}, ${patch.kind ?? "neighborhood"},
                  ${patch.parentSlug ?? null}, ${patch.blurb ?? ""},
                  ${Number(next[0]?.[0]?.n ?? 10)},
                  ${patch.active === false ? 0 : 1},
                  ${patch.mailingZoneSlug ?? null},
                  ${patch.directorySlug ?? null})`,
    );
    return { ok: true };
  } catch (e) {
    console.error("[places] create failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

/**
 * Edits a place. Everything except the slug.
 *
 * Guards against a place being made its own parent, which would drop it
 * and its children out of the tree builder's root pass and make them
 * invisible with no error anywhere.
 */
export async function updatePlace(
  id: number,
  patch: PlacePatch,
): Promise<PlaceResult> {
  const display = patch.name.trim();
  if (display.length < 2) return { ok: false, error: "Give it a name." };
  try {
    await ensurePlaces();
    const { db } = await import("@/lib/db");
    const self = (await db.execute(
      sql`SELECT slug FROM lbs_places WHERE id = ${id} LIMIT 1`,
    )) as unknown as [{ slug: string }[]];
    const slug = self[0]?.[0]?.slug;
    if (!slug) return { ok: false, error: "That place is not here any more." };
    if (patch.parentSlug === slug) {
      return { ok: false, error: "A place cannot sit inside itself." };
    }
    await db.execute(
      sql`UPDATE lbs_places
             SET name = ${display},
                 kind = ${patch.kind},
                 parent_slug = ${patch.parentSlug || null},
                 blurb = ${patch.blurb ?? ""},
                 is_active = ${patch.active ? 1 : 0},
                 mailing_zone_slug = ${patch.mailingZoneSlug || null},
                 directory_slug = ${patch.directorySlug || null}
           WHERE id = ${id}`,
    );
    return { ok: true };
  } catch (e) {
    console.error("[places] update failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

/**
 * Takes a place off the site, or puts it back.
 *
 * No delete, for the same reason the directory areas have none: stories
 * and events will point at a slug, and removing the row would leave them
 * pointing at nothing with no way to see what went. Hiding is reversible
 * and leaves the trail intact.
 */
export async function setPlaceActive(
  id: number,
  active: boolean,
): Promise<PlaceResult> {
  try {
    await ensurePlaces();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`UPDATE lbs_places SET is_active = ${active ? 1 : 0} WHERE id = ${id}`,
    );
    return { ok: true };
  } catch (e) {
    console.error("[places] activate failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

/** Moves a place up or down among its siblings. */
export async function movePlace(
  id: number,
  direction: "up" | "down",
): Promise<PlaceResult> {
  try {
    await ensurePlaces();
    const places = await listPlaces();
    const me = places.find((p) => p.id === id);
    if (!me) return { ok: false, error: "That place is not here any more." };
    const siblings = places
      .filter((p) => p.parentSlug === me.parentSlug)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const i = siblings.findIndex((p) => p.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= siblings.length) return { ok: true };
    [siblings[i], siblings[j]] = [siblings[j], siblings[i]];

    // Renumbering the whole sibling run rather than swapping two stored
    // numbers. A swap reads correctly and does nothing at all when the
    // two rows happen to hold the same display_order, which they will
    // the moment anyone adds several places in one sitting. There are
    // never more than a handful of siblings, so the extra writes cost
    // nothing and the order is always exactly what the screen showed.
    const { db } = await import("@/lib/db");
    for (const [n, p] of siblings.entries()) {
      await db.execute(
        sql`UPDATE lbs_places SET display_order = ${(n + 1) * 10} WHERE id = ${p.id}`,
      );
    }
    return { ok: true };
  } catch (e) {
    console.error("[places] move failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

/**
 * A place and everything under it.
 *
 * A market page has to answer "what is happening around here", and a
 * story filed against West Ashley is happening around Charleston. The
 * caller gets a flat list of slugs to hand to a query rather than
 * having to know the shape of the tree, and the place itself is always
 * first so a zone page still works through the same call.
 *
 * Depth is bounded rather than trusted. The tree is three deep by
 * design, but a row edited into its own ancestor would otherwise spin
 * here for ever.
 */
export async function placeAndDescendants(slug: string): Promise<string[]> {
  const all = await listActivePlaces().catch(() => []);
  const out = new Set<string>([slug]);
  for (let depth = 0; depth < 4; depth += 1) {
    let grew = false;
    for (const p of all) {
      if (p.parentSlug && out.has(p.parentSlug) && !out.has(p.slug)) {
        out.add(p.slug);
        grew = true;
      }
    }
    if (!grew) break;
  }
  return [...out];
}
