import "server-only";
import { getSetting } from "@/lib/admin-data";
import { POSTCARD_PRICING, type Reach, type SpotSize } from "@/lib/pricing";

/**
 * Live postcard pricing. Prices came from pricing_config.php, which was
 * only editable by deploying code. They are now overridable from the
 * admin; the code values remain the fallback so nothing breaks if the
 * settings row is missing.
 */
export const PRICING_KEY = "postcard_pricing";

export type PriceOverrides = Partial<
  Record<Reach, Partial<Record<SpotSize, number>>>
>;

export async function getLivePricing(): Promise<typeof POSTCARD_PRICING> {
  const overrides = await getSetting<PriceOverrides>(PRICING_KEY);
  if (!overrides) return POSTCARD_PRICING;

  const merged = structuredClone(POSTCARD_PRICING);
  for (const reach of Object.keys(merged) as Reach[]) {
    for (const size of Object.keys(merged[reach]) as SpotSize[]) {
      const cents = overrides[reach]?.[size];
      if (typeof cents === "number" && cents > 0) {
        merged[reach][size] = { ...merged[reach][size], priceCents: cents };
      }
    }
  }
  return merged;
}
