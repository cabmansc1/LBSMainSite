/**
 * Spotlight Postcard pricing, ported from pricing_config.php.
 * One place to change prices, exactly like the PHP config it replaces.
 */
export type SpotSize = "small" | "medium" | "large" | "triple" | "quad";
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
export const BIG_SIZES: SpotSize[] = ["triple", "quad"];

export const POSTCARD_PRICING: Record<Reach, Record<SpotSize, SpotTier>> = {
  "5k": {
    small: { size: "3×2", priceCents: 24900, description: "Business card size" },
    medium: { size: "3×4", priceCents: 34900, description: "~3 inches x 4 inches" },
    large: { size: "4×6", priceCents: 59900, description: "~4 inches x 6 inches" },
    triple: { size: "3 mediums", priceCents: 89900, description: "Three medium spots together" },
    quad: { size: "2 larges", priceCents: 119900, description: "Two larges or four mediums" },
  },
  "10k": {
    small: { size: "3×2", priceCents: 29900, description: "Business card size" },
    medium: { size: "3×4", priceCents: 54900, description: "~3 inches x 4 inches" },
    large: { size: "4×6", priceCents: 94900, description: "~4 inches x 6 inches" },
    // Not priced at 10k yet: set these in the admin to offer them.
    triple: { size: "3 mediums", priceCents: 0, description: "Three medium spots together" },
    quad: { size: "2 larges", priceCents: 0, description: "Two larges or four mediums" },
  },
};

/** A size is only sellable at a reach once it has a price. */
export const isOffered = (tier?: SpotTier) => !!tier && tier.priceCents > 0;

export const HOUSEHOLDS: Record<Reach, number> = { "5k": 5000, "10k": 10000 };

export const formatPrice = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const centsPerHome = (cents: number, reach: Reach) =>
  `${(cents / HOUSEHOLDS[reach]).toFixed(1)}¢ per home`;
