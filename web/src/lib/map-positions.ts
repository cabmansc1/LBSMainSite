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

export const MAP_POSITIONS: MapPosition[] = [
  { slug: "summerville", x: 497, y: 282, r: 64 },
  { slug: "moncks-corner", x: 795, y: 131, r: 46 },
  { slug: "goose-creek", x: 762, y: 302, r: 42, label: "Goose Creek" },
  { slug: "north-charleston", x: 795, y: 430, r: 50 },
  { slug: "daniel-island", x: 938, y: 500, r: 36, label: "Daniel Island", labelAbove: true },
  { slug: "mount-pleasant", x: 1032, y: 560, r: 50 },
  { slug: "isle-of-palms", x: 1172, y: 558, r: 24 },
  { slug: "sullivans-island", x: 1124, y: 614, r: 22 },
  { slug: "charleston", x: 905, y: 632, r: 48 },
  { slug: "james-island", x: 985, y: 700, r: 32 },
  { slug: "johns-island", x: 790, y: 768, r: 40 },
];
