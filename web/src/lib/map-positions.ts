import { ZONES } from "@/lib/zones";

/**
 * Bubble positions for the Tri-County base map
 * (public/map/tri-county-base.webp, 1536x1024). Coordinates are pixels
 * on that image, pinned to its printed town markers. Goose Creek and
 * Daniel Island have no printed label on the base map, so the site
 * draws labels for those two only.
 */
export const MAP_IMG = {
  src: "/map/tri-county-base.webp",
  w: 1536,
  h: 1024,
};

export type MapPosition = {
  slug: string;
  x: number;
  y: number;
  r: number;
  /** Label drawn by us because the base map lacks one. */
  label?: string;
  /** Draw that label above the bubble instead of below. */
  labelAbove?: boolean;
};

/** Smallest bubble stays comfortably tappable; largest stays on the map. */
const MIN_R = 20;
const MAX_R = 76;

/**
 * Bubble size follows population, scaled by the square root.
 *
 * The eye reads a circle by its area, not its radius, so scaling the
 * radius directly makes a big zone look several times bigger than it is.
 * Taking the square root makes area proportional to population, which is
 * the honest version: Summerville and Charleston dominate because they
 * genuinely do, and Sullivan's Island stays small without disappearing.
 *
 * Radii were hand-tuned per zone before this, which meant Summerville
 * and Charleston were drawn smaller than towns a fraction of their size.
 * Edit the population in zones.ts and the map follows.
 */
export function radiusFor(population: number): number {
  const pops = ZONES.map((z) => z.population);
  const lo = Math.sqrt(Math.min(...pops));
  const hi = Math.sqrt(Math.max(...pops));
  if (hi === lo) return (MIN_R + MAX_R) / 2;
  const t = (Math.sqrt(population) - lo) / (hi - lo);
  return Math.round(MIN_R + (MAX_R - MIN_R) * Math.min(1, Math.max(0, t)));
}

/** Where each bubble sits, and any label the base map does not print. */
const PLACEMENT: Omit<MapPosition, "r">[] = [
  { slug: "summerville", x: 497, y: 282 },
  { slug: "moncks-corner", x: 795, y: 131 },
  { slug: "goose-creek", x: 762, y: 302, label: "Goose Creek" },
  { slug: "north-charleston", x: 795, y: 430 },
  { slug: "daniel-island", x: 938, y: 500, label: "Daniel Island", labelAbove: true },
  { slug: "mount-pleasant", x: 1032, y: 560 },
  { slug: "isle-of-palms", x: 1172, y: 558 },
  { slug: "sullivans-island", x: 1124, y: 614 },
  { slug: "charleston", x: 905, y: 632 },
  { slug: "james-island", x: 985, y: 700 },
  { slug: "johns-island", x: 790, y: 768 },
];

export const MAP_POSITIONS: MapPosition[] = PLACEMENT.map((p) => ({
  ...p,
  r: radiusFor(ZONES.find((z) => z.slug === p.slug)?.population ?? 10_000),
}));
