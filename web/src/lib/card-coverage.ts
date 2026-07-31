import type { CardRoute, UpcomingMailing } from "@/lib/mailings";

/**
 * What a card actually covers, in the terms a buyer asks about.
 *
 * A zone is not a card. Summerville can be filling "Downtown Summerville"
 * and "Nexton/Cane Bay" at the same time, and the mail month alone does
 * not tell anyone which part of town their ad lands in. Mission Control
 * knows: the card carries a name and a USPS route table. This turns that
 * into the two or three facts worth putting on a page.
 */

export type CardCoverage = {
  /** "Downtown Summerville", with the boilerplate trimmed off. */
  name?: string;
  /** Distinct ZIPs the routes fall in, ascending. */
  zips: string[];
  routeCount: number;
  /** Deliverable addresses across all routes. */
  households: number;
};

/** MC card names repeat words the page already says. */
const TRIM = /\s*[-–]\s*(neighborhood\s+card|community\s+card|spotlight\s+card|card)\s*$/i;

export const cardDisplayName = (m: {
  cardName?: string;
  zoneName?: string;
}): string | undefined => {
  const raw = (m.cardName ?? "").trim();
  if (!raw) return undefined;
  const trimmed = raw.replace(TRIM, "").trim();
  // A card simply named after its zone adds nothing.
  if (!trimmed || trimmed.toLowerCase() === (m.zoneName ?? "").toLowerCase()) {
    return undefined;
  }
  return trimmed;
};

export function cardCoverage(m: UpcomingMailing): CardCoverage {
  const routes: CardRoute[] = m.routes ?? [];
  const zips = [...new Set(routes.map((r) => r.zip))].sort();

  return {
    name: cardDisplayName(m),
    zips,
    routeCount: routes.length,
    households: routes.reduce((n, r) => n + r.total, 0),
  };
}

/** One line for a picker: "Nexton/Cane Bay · 29486 · mails September 2026". */
export function cardLabel(m: UpcomingMailing, opts: { withMonth?: boolean } = {}) {
  const { name, zips } = cardCoverage(m);
  const parts = [name ?? m.zoneName];
  if (zips.length) parts.push(zips.length > 2 ? `${zips.length} ZIPs` : zips.join(", "));
  if (opts.withMonth) parts.push(`mails ${m.mailMonth}`);
  return parts.join(" · ");
}
