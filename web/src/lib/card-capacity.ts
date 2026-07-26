import "server-only";

/**
 * Card capacity, in usable ad area.
 *
 * A card's capacity is square inches of sellable space. Every ad size
 * consumes its own area, so any mix that fits, fits. Mission Control
 * counts the same thing in "spots", where one spot is one medium: a card
 * showing 12.5 of 16 spots filled has a small in it, which is half a
 * spot. Keeping both views in sync means area / 12 = spots.
 *
 * Orientation changes only the capacity, which is why switching a card
 * from horizontal to vertical buys room for more ads.
 */

export type Orientation = "horizontal" | "vertical";

export type AdSizeKey = "small" | "medium" | "large" | "triple" | "quad";

export type AdSizeSpec = {
  key: AdSizeKey;
  label: string;
  dimensions: string;
  /** Usable area consumed on the card. */
  sqIn: number;
  /** Whether it can be bought without talking to us. */
  selfServe: boolean;
  /**
   * Orientations this size can be laid out on. Every size works on both
   * today; the field exists because layout, not just area, decides what
   * can be placed, and that may not always hold.
   */
  orientations: Orientation[];
};

const BOTH: Orientation[] = ["horizontal", "vertical"];

/** One medium is the unit Mission Control counts as a "spot". */
export const SQ_IN_PER_SPOT = 12;

export const AD_SIZES: Record<AdSizeKey, AdSizeSpec> = {
  small: { key: "small", label: "Small", dimensions: "3x2", sqIn: 6, selfServe: true, orientations: BOTH },
  medium: { key: "medium", label: "Medium", dimensions: "4x3", sqIn: 12, selfServe: true, orientations: BOTH },
  large: { key: "large", label: "Large", dimensions: "4x6", sqIn: 24, selfServe: true, orientations: BOTH },
  // Custom formats. Both lay out on either orientation, with a different
  // arrangement on each.
  triple: { key: "triple", label: "Triple", dimensions: "3 mediums", sqIn: 36, selfServe: false, orientations: BOTH },
  quad: { key: "quad", label: "Quad", dimensions: "2 larges or 4 mediums", sqIn: 48, selfServe: false, orientations: BOTH },
};

/**
 * Usable ad area per orientation. Horizontal is the standard card: 192
 * square inches, which is 16 mediums, 8 larges, or 32 smalls. Vertical
 * carries a little more, enough for 6 larges plus 5 mediums.
 */
export const ORIENTATION_CAPACITY: Record<Orientation, number> = {
  horizontal: 192,
  vertical: 204,
};

export const spotsToSqIn = (spots: number) => spots * SQ_IN_PER_SPOT;
export const sqInToSpots = (sqIn: number) => sqIn / SQ_IN_PER_SPOT;

export type CardCapacity = {
  orientation: Orientation;
  totalSqIn: number;
  usedSqIn: number;
  remainingSqIn: number;
  totalSpots: number;
  usedSpots: number;
  remainingSpots: number;
  /** How many of each size still fit in the space left. */
  fits: Record<AdSizeKey, number>;
};

/**
 * Real availability from what Mission Control reports as filled.
 *
 * MC is the authority on how full a card is, so capacity is derived from
 * its spot counts rather than from anything we hold. When MC reports a
 * different total than the orientation implies (a one-off layout, say),
 * MC wins: it describes the actual card.
 */
export function cardCapacity(opts: {
  orientation?: Orientation;
  /** From Mission Control: totalSpots and spotsFilled, in mediums. */
  totalSpots?: number;
  spotsFilled?: number;
}): CardCapacity {
  const orientation = opts.orientation ?? "horizontal";

  const totalSqIn =
    opts.totalSpots && opts.totalSpots > 0
      ? spotsToSqIn(opts.totalSpots)
      : ORIENTATION_CAPACITY[orientation];

  const usedSqIn = Math.max(0, spotsToSqIn(opts.spotsFilled ?? 0));
  const remainingSqIn = Math.max(0, totalSqIn - usedSqIn);

  const fits = Object.fromEntries(
    (Object.keys(AD_SIZES) as AdSizeKey[]).map((k) => {
      const spec = AD_SIZES[k];
      // A size that cannot be laid out on this orientation never fits,
      // however much area is left.
      if (!spec.orientations.includes(orientation)) return [k, 0];
      return [k, Math.floor(remainingSqIn / spec.sqIn)];
    }),
  ) as Record<AdSizeKey, number>;

  return {
    orientation,
    totalSqIn,
    usedSqIn,
    remainingSqIn,
    totalSpots: sqInToSpots(totalSqIn),
    usedSpots: sqInToSpots(usedSqIn),
    remainingSpots: sqInToSpots(remainingSqIn),
    fits,
  };
}

/* ---------- per-card orientation ---------- */

const ORIENTATION_KEY = "card_orientations";

/**
 * Orientation is a property of the printed card, so it belongs in
 * Mission Control long term. Until MC carries it, it is stored here per
 * MC card id and editable from the admin, because a card can be flipped
 * to vertical to fit more ads.
 */
export async function getCardOrientations(): Promise<Record<string, Orientation>> {
  const { getSetting } = await import("@/lib/admin-data");
  return (await getSetting<Record<string, Orientation>>(ORIENTATION_KEY)) ?? {};
}

export async function getCardOrientation(cardId: string): Promise<Orientation> {
  const all = await getCardOrientations();
  return all[cardId] ?? "horizontal";
}

export async function setCardOrientation(
  cardId: string,
  orientation: Orientation,
) {
  const { getSetting, saveSetting } = await import("@/lib/admin-data");
  const all =
    (await getSetting<Record<string, Orientation>>(ORIENTATION_KEY)) ?? {};
  all[cardId] = orientation;
  await saveSetting(ORIENTATION_KEY, all);
}
