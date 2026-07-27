/**
 * Matching a business name in Mission Control to one in the directory.
 *
 * The two systems are typed by different people at different times, so
 * exact matching fails on real data more often than it works. From one
 * real card: "Brothers Gutters" against "The Brothers That Just Do
 * Gutters", "Colucci's" against "Colucci's Jewelers", "Alexander Heating
 * & Air" against "Alexander Heating & Cooling". All three are the same
 * business; none match on a string compare.
 *
 * The cost of a miss is a listing that loses its phone and its link. The
 * cost of a false match is showing the wrong business's phone number,
 * which is worse, so the rule is deliberately conservative: names have to
 * share a distinctive word, not just a town or a trade.
 */

/** Words that carry no identity: legal suffixes and filler. */
const NOISE = new Set([
  "the", "that", "just", "do", "and", "of", "a", "at", "for",
  "llc", "inc", "co", "company", "corp", "ltd", "pllc", "pa",
]);

/**
 * Words too common locally to identify anyone on their own. Two
 * businesses sharing only "mount pleasant" are not the same business.
 */
const GENERIC = new Set([
  "mount", "pleasant", "charleston", "summerville", "lowcountry", "island",
  "islands", "james", "johns", "daniel", "goose", "creek", "moncks", "corner",
  "isle", "palms", "sullivans", "nexton", "ladson", "hanahan", "carolina",
  "north", "south", "east", "west", "greater", "area", "local",
  "services", "service", "group", "solutions", "professional", "quality",
  "best", "premier", "custom", "home", "homes",
]);

export const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokens = (s: string) =>
  normalizeName(s)
    .split(" ")
    .filter((t) => t && !NOISE.has(t));

const squash = (s: string) => normalizeName(s).replace(/ /g, "");

/**
 * True when two names almost certainly mean the same business.
 *
 * Accepts on an exact match, on one name containing the other, or on a
 * strong token overlap that includes at least one distinctive word.
 */
export function sameBusiness(a: string, b: string): boolean {
  if (!a || !b) return false;

  const sa = squash(a);
  const sb = squash(b);
  if (sa === sb) return true;
  // "Colucci's" inside "Colucci's Jewelers".
  if (sa.length >= 6 && sb.length >= 6 && (sa.includes(sb) || sb.includes(sa))) {
    return true;
  }

  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return false;

  const setB = new Set(tb);
  const shared = ta.filter((t) => setB.has(t));
  if (shared.length === 0) return false;

  // A shared town or trade word is not identity. Something specific has
  // to match: "alexander", "brothers", "colucci".
  if (!shared.some((t) => !GENERIC.has(t))) return false;

  const overlap = shared.length / Math.min(ta.length, tb.length);
  return overlap >= 0.6;
}

/** The best match for `name` among `candidates`, or undefined. */
export function findBusiness<T extends { name: string }>(
  name: string,
  candidates: T[],
): T | undefined {
  const exact = candidates.find((c) => squash(c.name) === squash(name));
  if (exact) return exact;
  return candidates.find((c) => sameBusiness(name, c.name));
}
