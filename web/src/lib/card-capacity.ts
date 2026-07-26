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
 * A card has two printed sides. A horizontal card carries four mediums
 * along the top and four along the bottom of each side, so eight per
 * side and sixteen across the card, with the branding and postage band
 * between the rows on the address side.
 *
 * Orientation changes only the capacity, which is why switching a card
 * from horizontal to vertical buys room for more ads.
 */

export type Orientation = "horizontal" | "vertical";

export type AdSizeKey =
  | "small"
  | "medium"
  | "large"
  | "triple"
  | "quad"
  | "full";

export type AdSizeSpec = {
  key: AdSizeKey;
  label: string;
  dimensions: string;
  /** Usable area consumed on the card. */
  sqIn: number;
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
  small: { key: "small", label: "Small", dimensions: "3x2", sqIn: 6, orientations: BOTH },
  medium: { key: "medium", label: "Medium", dimensions: "4x3", sqIn: 12, orientations: BOTH },
  large: { key: "large", label: "Large", dimensions: "4x6", sqIn: 24, orientations: BOTH },
  // Larger formats. All lay out on either orientation, with a different
  // arrangement on each. Whether a size is sellable is decided by its
  // price, so there is no separate self-serve flag to fall out of sync.
  triple: { key: "triple", label: "Triple", dimensions: "3 mediums", sqIn: 36, orientations: BOTH },
  quad: { key: "quad", label: "Quad", dimensions: "2 larges or 4 mediums", sqIn: 48, orientations: BOTH },
  // A full page is every spot on one side. It has to be the non-postage
  // side, because the other side carries the branding and the postage
  // indicia, so a card can only ever hold one. Its area is half the card,
  // and cardCapacity recomputes it from the card's real total rather than
  // trusting this nominal figure.
  full: { key: "full", label: "Full page", dimensions: "one whole side", sqIn: 96, orientations: BOTH },
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

/** Printed sides per card, each carrying half the capacity. */
export const SIDES_PER_CARD = 2;

/** Ad area on one side, which is what a full page buys. */
export const SIDE_CAPACITY: Record<Orientation, number> = {
  horizontal: ORIENTATION_CAPACITY.horizontal / SIDES_PER_CARD,
  vertical: ORIENTATION_CAPACITY.vertical / SIDES_PER_CARD,
};

/** Medium slots on one side, at the standard four across, two rows. */
export const SLOTS_PER_SIDE: Record<Orientation, number> = {
  horizontal: 8,
  vertical: 8.5,
};

export const spotsToSqIn = (spots: number) => spots * SQ_IN_PER_SPOT;
export const sqInToSpots = (sqIn: number) => sqIn / SQ_IN_PER_SPOT;

export type CardCapacity = {
  orientation: Orientation;
  totalSqIn: number;
  usedSqIn: number;
  remainingSqIn: number;
  /** Area on one printed side, which is what a full page costs in space. */
  sideSqIn: number;
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

  const sideSqIn = totalSqIn / SIDES_PER_CARD;

  const fits = Object.fromEntries(
    (Object.keys(AD_SIZES) as AdSizeKey[]).map((k) => {
      const spec = AD_SIZES[k];
      // A size that cannot be laid out on this orientation never fits,
      // however much area is left.
      if (!spec.orientations.includes(orientation)) return [k, 0];
      // A full page needs a whole side to itself, and only the
      // non-postage side can be given away, so there is at most one. It
      // is available while everything already sold would still fit on the
      // postage side, which is exactly one side's worth of space left.
      // Placement is not fixed until production, so that is a real test
      // and not an approximation.
      if (k === "full") return [k, remainingSqIn >= sideSqIn ? 1 : 0];
      return [k, Math.floor(remainingSqIn / spec.sqIn)];
    }),
  ) as Record<AdSizeKey, number>;

  return {
    orientation,
    totalSqIn,
    usedSqIn,
    remainingSqIn,
    sideSqIn,
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
