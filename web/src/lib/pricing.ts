/**
 * Spotlight Postcard pricing, ported from pricing_config.php.
 * One place to change prices, exactly like the PHP config it replaces.
 */
export type SpotSize = "small" | "medium" | "large";
export type Reach = "5k" | "10k";

export type SpotTier = {
  size: string;
  priceCents: number;
  description: string;
};

export const POSTCARD_PRICING: Record<Reach, Record<SpotSize, SpotTier>> = {
  "5k": {
    small: { size: "3×2", priceCents: 24900, description: "Business card size" },
    medium: { size: "3×4", priceCents: 34900, description: "~3 inches x 4 inches" },
    large: { size: "4×6", priceCents: 59900, description: "~4 inches x 6 inches" },
  },
  "10k": {
    small: { size: "3×2", priceCents: 29900, description: "Business card size" },
    medium: { size: "3×4", priceCents: 54900, description: "~3 inches x 4 inches" },
    large: { size: "4×6", priceCents: 94900, description: "~4 inches x 6 inches" },
  },
};

export const HOUSEHOLDS: Record<Reach, number> = { "5k": 5000, "10k": 10000 };

export const formatPrice = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const centsPerHome = (cents: number, reach: Reach) =>
  `${(cents / HOUSEHOLDS[reach]).toFixed(1)}¢ per home`;
