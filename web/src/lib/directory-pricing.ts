import "server-only";
import { getSetting } from "@/lib/admin-data";

/**
 * What a Premium directory listing costs.
 *
 * The same arrangement postcard pricing already uses: code values are
 * the fallback, an admin override lives in lbs_settings, and nothing
 * breaks if the settings row is missing. It was a string typed into the
 * signup page, which is exactly where postcard pricing started before
 * it moved out of pricing_config.php.
 *
 * Cents, because that is what Stripe takes and what the postcard prices
 * are already stored in. A price kept in dollars somewhere and cents
 * somewhere else is a rounding bug waiting for the first odd number.
 */

export const DIRECTORY_PRICING_KEY = "directory_pricing";

export type DirectoryPricing = {
  monthlyCents: number;
  annualCents: number;
};

/** Fallback, and the shape of the setting. */
export const DIRECTORY_PRICING: DirectoryPricing = {
  monthlyCents: 10_00,
  annualCents: 60_00,
};

/** Anything above this is a typo rather than a price. */
export const MAX_DIRECTORY_PRICE_CENTS = 1_000_00;

export async function getLiveDirectoryPricing(): Promise<DirectoryPricing> {
  const saved = await getSetting<Partial<DirectoryPricing>>(
    DIRECTORY_PRICING_KEY,
  );
  if (!saved) return DIRECTORY_PRICING;

  const pick = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;

  return {
    monthlyCents: pick(saved.monthlyCents, DIRECTORY_PRICING.monthlyCents),
    annualCents: pick(saved.annualCents, DIRECTORY_PRICING.annualCents),
  };
}

/** "$10", or "$10.50" when the price is not whole dollars. */
export function money(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * What paying yearly saves, or null when it saves nothing.
 *
 * Null rather than zero so callers have to decide what to say. An
 * annual price at or above twelve months is a pricing mistake, and
 * printing "save $0" next to it would be the site announcing it.
 */
export function annualSavingCents(p: DirectoryPricing): number | null {
  const saving = p.monthlyCents * 12 - p.annualCents;
  return saving > 0 ? saving : null;
}

/** "per month, or $60 per year". The one place that sentence is built. */
export function annualNote(p: DirectoryPricing): string {
  return `per month, or ${money(p.annualCents)} per year`;
}
