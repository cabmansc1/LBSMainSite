import type { PastCard } from "@/lib/past-cards";

/**
 * Grouping for the card archive.
 *
 * Nineteen cards a year is not nineteen unrelated things. It is a
 * handful of recurring coverage areas, each mailed several times:
 * Nexton/Cane Bay, Downtown Summerville & More, West Ashley. So the
 * archive is a magazine rather than a pile, and the shape that holds up
 * as the count grows is zone, then edition, then issue.
 *
 * Volume then arrives as new issues under editions that already exist,
 * instead of lengthening a flat list nobody can read. It also says
 * something a grid cannot: an edition that has mailed six times is proof
 * of cadence, which is the thing a prospect is actually trying to work
 * out.
 */

export type Edition = {
  /** Normalized, used for grouping and in URLs. */
  key: string;
  /** Shown to people: the most common spelling actually used. */
  name: string;
  zoneSlug: string;
  zoneName: string;
  /** Newest first, same order the cards arrive in. */
  issues: PastCard[];
};

/**
 * Editions are grouped by the card name Mission Control carries, and
 * those names are typed by hand. The live data already contains
 * "Daniel Island/Clements Ferry Rd" and "Daniel Island/ Clements Ferry
 * Rd", one space apart, which would silently split a year of history
 * into two editions.
 *
 * So grouping normalizes rather than matching exactly: case folded,
 * whitespace collapsed, spacing around separators removed, and trailing
 * punctuation dropped. This is a safety net, not a fix. The names should
 * be corrected in Mission Control, which is why collisions are surfaced
 * in the admin instead of being quietly absorbed.
 */
export function editionKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*([/&,-])\s*/g, "$1")
    .replace(/[.\s]+$/, "")
    .trim();
}

/** A card with no coverage name is the zone-wide edition. */
const nameOf = (c: PastCard) => (c.cardName || "").trim() || c.zoneName;

/**
 * The year a card mailed.
 *
 * mailDate is the reliable field, but it is optional, so mailMonth
 * ("August 2026") is the fallback. Returns undefined rather than a guess
 * when neither says anything: an archive filter that quietly files
 * undated cards under the current year is worse than one that leaves
 * them out of the year view.
 */
export function cardYear(c: PastCard): number | undefined {
  if (c.mailDate) {
    const y = Number(c.mailDate.slice(0, 4));
    if (Number.isInteger(y) && y > 1990) return y;
  }
  const m = c.mailMonth?.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : undefined;
}

/**
 * Groups cards into editions.
 *
 * Input order is preserved inside each edition, and callers pass cards
 * already sorted newest first, so issues come out newest first too.
 * Editions themselves are ordered by how recently they mailed, because
 * a series that is still running matters more than one that stopped.
 */
export function groupIntoEditions(cards: PastCard[]): Edition[] {
  const byKey = new Map<string, Edition & { names: string[] }>();

  for (const c of cards) {
    const raw = nameOf(c);
    const key = `${c.zoneSlug}::${editionKey(raw)}`;
    const found = byKey.get(key);
    if (found) {
      found.issues.push(c);
      found.names.push(raw);
      continue;
    }
    byKey.set(key, {
      key,
      name: raw,
      zoneSlug: c.zoneSlug,
      zoneName: c.zoneName,
      issues: [c],
      names: [raw],
    });
  }

  return [...byKey.values()].map((e) => ({
    key: e.key,
    // The spelling used most often wins, so one typo in six issues does
    // not become the heading for the whole series.
    name: mostCommon(e.names),
    zoneSlug: e.zoneSlug,
    zoneName: e.zoneName,
    issues: e.issues,
  }));
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

export type EditionCollision = {
  zoneName: string;
  /** The distinct spellings that collapsed to one edition. */
  spellings: string[];
  cards: number;
};

/**
 * Names that differ only by spacing, case or punctuation.
 *
 * Grouping already survives these, so this is not about the site
 * breaking. It is about the source data being wrong: Mission Control is
 * the authority, and a name typed two ways there will keep producing
 * mismatches in places that are not this forgiving.
 */
export function findEditionCollisions(cards: PastCard[]): EditionCollision[] {
  const byKey = new Map<string, { zoneName: string; spellings: Set<string>; cards: number }>();
  for (const c of cards) {
    const raw = nameOf(c);
    const key = `${c.zoneSlug}::${editionKey(raw)}`;
    const found = byKey.get(key);
    if (found) {
      found.spellings.add(raw);
      found.cards += 1;
    } else {
      byKey.set(key, { zoneName: c.zoneName, spellings: new Set([raw]), cards: 1 });
    }
  }
  return [...byKey.values()]
    .filter((v) => v.spellings.size > 1)
    .map((v) => ({
      zoneName: v.zoneName,
      spellings: [...v.spellings],
      cards: v.cards,
    }));
}

export type GalleryStats = {
  total: number;
  thisYear: number;
  zones: number;
  editions: number;
  years: number[];
};

/**
 * Counted, never typed. The homepage learned this lesson already: a
 * figure somebody has to remember to update is a figure that goes stale
 * and then gets quoted at a customer.
 */
export function galleryStats(cards: PastCard[], nowYear: number): GalleryStats {
  const years = [...new Set(cards.map(cardYear).filter((y): y is number => !!y))]
    .sort((a, b) => b - a);
  return {
    total: cards.length,
    thisYear: cards.filter((c) => cardYear(c) === nowYear).length,
    zones: new Set(cards.map((c) => c.zoneSlug)).size,
    editions: groupIntoEditions(cards).length,
    years,
  };
}

/**
 * The previous and next issue of the same edition.
 *
 * Someone looking at one card most often wants the one before it, and
 * until now there was no way to get there without going back to the
 * zone. Cards arrive newest first, so the next issue is the earlier
 * index.
 */
export function editionNeighbours(
  cards: PastCard[],
  card: PastCard,
): { edition?: Edition; newer?: PastCard; older?: PastCard } {
  const edition = groupIntoEditions(cards).find((e) =>
    e.issues.some((i) => i.slug === card.slug),
  );
  if (!edition) return {};
  const i = edition.issues.findIndex((x) => x.slug === card.slug);
  return {
    edition,
    newer: i > 0 ? edition.issues[i - 1] : undefined,
    older: i >= 0 ? edition.issues[i + 1] : undefined,
  };
}
