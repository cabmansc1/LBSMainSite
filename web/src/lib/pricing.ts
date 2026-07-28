/**
 * Spotlight Postcard pricing, ported from pricing_config.php.
 * One place to change prices, exactly like the PHP config it replaces.
 */
export type SpotSize =
  | "small"
  | "medium"
  | "large"
  | "triple"
  | "quad"
  | "full";
export type Reach = "5k" | "10k";

export type SpotTier = {
  size: string;
  /** 0 means the size is not offered at this reach yet. */
  priceCents: number;
  description: string;
};

/** The three sizes sold on their own cards in the pricing grid. */
export const CORE_SIZES: SpotSize[] = ["small", "medium", "large"];
/** Larger formats: same buying flow, listed separately. */
export const BIG_SIZES: SpotSize[] = ["triple", "quad", "full"];

/** Every size, biggest last. Anything iterating sizes should use this. */
export const ALL_SIZES: SpotSize[] = [...CORE_SIZES, ...BIG_SIZES];

export const POSTCARD_PRICING: Record<Reach, Record<SpotSize, SpotTier>> = {
  "5k": {
    small: { size: "3×2", priceCents: 24900, description: "Business card size" },
    medium: { size: "3×4", priceCents: 34900, description: "~3 inches x 4 inches" },
    large: { size: "4×6", priceCents: 59900, description: "~4 inches x 6 inches" },
    triple: { size: "3 mediums", priceCents: 89900, description: "Three medium spots together" },
    quad: { size: "2 larges", priceCents: 119900, description: "Two larges or four mediums" },
    full: { size: "one whole side", priceCents: 220000, description: "Every spot on one side of the card" },
  },
  "10k": {
    small: { size: "3×2", priceCents: 29900, description: "Business card size" },
    medium: { size: "3×4", priceCents: 54900, description: "~3 inches x 4 inches" },
    large: { size: "4×6", priceCents: 94900, description: "~4 inches x 6 inches" },
    // Not priced at 10k yet: set these in the admin to offer them.
    triple: { size: "3 mediums", priceCents: 0, description: "Three medium spots together" },
    quad: { size: "2 larges", priceCents: 0, description: "Two larges or four mediums" },
    full: { size: "one whole side", priceCents: 0, description: "Every spot on one side of the card" },
  },
};

/** A size is only sellable at a reach once it has a price. */
export const isOffered = (tier?: SpotTier) => !!tier && tier.priceCents > 0;

export const HOUSEHOLDS: Record<Reach, number> = { "5k": 5000, "10k": 10000 };

/**
 * The card we sell by default. 10,000 is the step up and 2,500 is the
 * step down, but 5,000 is the product.
 *
 * It used to win only by being the initial state, which a buyer cannot
 * see. Naming it here lets the pricing toggle say so out loud, and means
 * a future third option does not quietly become an equal.
 */
export const FLAGSHIP_REACH: Reach = "5k";

/**
 * Reach we intend to offer but cannot price yet.
 *
 * A smaller run for businesses whose service area does not justify
 * 5,000 homes. Deliberately not a button on the pricing toggle: an
 * option with no price gives a hesitant buyer a reason to wait for a
 * number nobody can quote them. It captures interest instead, which is
 * also the demand data needed to price it.
 */
export const PLANNED_REACH = {
  households: 2500,
  /** Standing alone: "2,500 households". */
  label: "2,500 households",
  /** In front of a noun: "a 2,500 household card", not "households card". */
  attributive: "2,500 household",
};

export const formatPrice = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const centsPerHome = (cents: number, reach: Reach) =>
  `${(cents / HOUSEHOLDS[reach]).toFixed(1)}¢ per home`;
