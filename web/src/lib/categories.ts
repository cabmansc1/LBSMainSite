/**
 * The common advertiser categories, in one place.
 *
 * This list existed twice — identically — in the postcard checkout and
 * the neighborhood card page, which is two places to forget when a
 * category is added. Mission Control is the real vocabulary and both
 * pages prefer it; this is what they fall back to, and what the
 * category filter seeds itself from so a trade nobody has bought yet
 * still has a chip.
 *
 * Deliberately short. It is not meant to be every category we would
 * sell — it is the handful common enough that somebody browsing the
 * schedule expects to see their own.
 *
 * No "Other": it is Mission Control's placeholder for a category nobody
 * has filled in, not a category, and locking it would take every
 * unclassified advertiser's spot at once.
 */
export const COMMON_CATEGORIES = [
  "Plumbing",
  "HVAC",
  "Roofing",
  "Dental",
  "Restaurants",
  "Landscaping",
  "Automotive",
  "Real Estate",
  "Insurance",
  "Fitness",
  "Med Spa",
  "Pest Control",
] as const;

/**
 * Case- and punctuation-insensitive key for comparing two category
 * names.
 *
 * Mission Control's categories are typed by hand in several places —
 * an account, an advertiser row, a hold — so "Real Estate", "real
 * estate" and "Real-Estate" all turn up meaning one thing. Comparing
 * the raw strings is how a card ends up offering a category it has
 * already sold.
 */
export const categoryKey = (c: string) =>
  c.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
