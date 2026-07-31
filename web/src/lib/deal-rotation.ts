/**
 * Which deals the /deals page shows when LowCoDeals has more than fit.
 *
 * The feed hands back everything LowCoDeals has. Rendering all of it
 * turns this into a thousand-card page the day the sister site takes
 * off, but hard-slicing the newest 25 means deal number 26 never gets
 * seen here at all, which is a raw deal for the business that bought it.
 *
 * So: pin the newest few, then rotate the rest through the remaining
 * slots. Every deal gets its turn on the page, and a business that
 * posted three months ago still shows up sometimes.
 *
 * The rotation is a function of the clock, not of Math.random(). Random
 * per render would hand a different page to every visitor and to every
 * crawl, which makes the ItemList schema meaningless and the page feel
 * broken on a back button. Keying it to a fixed window instead means
 * everyone in the same five minutes sees the same page, and the page
 * changes on a schedule we can reason about.
 */

/** One rotation step. Matches the feed's revalidate, so the page only
 *  changes when the underlying data could have changed anyway. */
export const ROTATION_WINDOW_MS = 300_000;

/** Total cards on the page. */
export const MAX_DEALS = 25;

/** Newest deals held out of the rotation so a fresh deal shows up now. */
export const PINNED_DEALS = 7;

export type RotationOptions = {
  limit?: number;
  pinned?: number;
  /** Injectable for tests. */
  nowMs?: number;
};

/**
 * The slice to render, newest-pinned first then the rotating remainder.
 *
 * Assumes the feed is ordered newest first, which is how LowCoDeals
 * returns it. Rotation is a round robin rather than a shuffle, so every
 * deal is guaranteed a turn within `ceil(rest / slots)` windows instead
 * of merely being likely to get one.
 */
export function rotateDeals<T>(deals: T[], opts: RotationOptions = {}): T[] {
  const limit = opts.limit ?? MAX_DEALS;
  const pinned = Math.min(opts.pinned ?? PINNED_DEALS, Math.max(0, limit - 1));
  if (limit <= 0) return [];
  if (deals.length <= limit) return deals;

  const pin = deals.slice(0, pinned);
  const rest = deals.slice(pinned);
  const slots = limit - pin.length;
  // deals.length > limit guarantees rest.length > slots, so the round
  // robin below never wraps onto a deal it already picked.
  const now = opts.nowMs ?? Date.now();
  const window = Math.floor(now / ROTATION_WINDOW_MS);
  const start = ((window * slots) % rest.length + rest.length) % rest.length;

  const picked: T[] = [];
  for (let i = 0; i < slots; i++) picked.push(rest[(start + i) % rest.length]);
  return [...pin, ...picked];
}

/** How long it takes every deal to have appeared at least once. */
export function rotationCycleMs(total: number, opts: RotationOptions = {}): number {
  const limit = opts.limit ?? MAX_DEALS;
  const pinned = Math.min(opts.pinned ?? PINNED_DEALS, Math.max(0, limit - 1));
  if (total <= limit) return 0;
  const slots = limit - pinned;
  return Math.ceil((total - pinned) / slots) * ROTATION_WINDOW_MS;
}
