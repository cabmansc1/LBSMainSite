import { MAILING_AREAS, type MailingArea } from "@/lib/zones";

/**
 * Marker positions for the coverage base map
 * (public/map/coverage-base.webp, 1536x1024). Coordinates are pixels on
 * that image, pinned to its printed town markers.
 *
 * The base map names nine of the twelve zones, so the site draws its own
 * labels for Goose Creek, Hanahan and Daniel Island and nothing else.
 * Doubling a label the map already prints is how the old base ended up
 * saying "Isle of Palms" twice.
 *
 * The county key that came with this artwork is painted out in the
 * asset, not hidden here. It explained the colours of three counties,
 * which is not a thing anybody buying a mailing needs, and it was the
 * loudest element on the page.
 */
export const MAP_IMG = {
  src: "/map/coverage-base.webp",
  w: 1536,
  h: 1024,
  /**
   * The part of the artwork worth showing, as an SVG viewBox.
   *
   * The full image carries a lot of nothing: empty Dorchester beige down
   * the left, open Atlantic bottom-right, and Berkeley green across the
   * top. Measured against the artwork itself, every printed label pill
   * and every marker falls inside x 431-1351, y 122-931, so this is that
   * box with 34 units of air around it.
   *
   * Cropping the view rather than enlarging the labels is what fixes the
   * mismatch. Text drawn at 19 units was smaller than the labels the map
   * prints beside it, and setting it to 48 made it larger; neither
   * matched. Zooming scales the printed labels and ours by the same
   * 1.55x, so they can be the same size and stay that way.
   *
   * The frame goes from 1.50 to 1.13, which is squarer. That suits a
   * phone, where width is the scarce dimension, and costs a taller card
   * on desktop.
   */
  view: { x: 397, y: 88, w: 988, h: 877 },
};

export type MapPosition = {
  /** The mailing area, which for most bubbles is a zone of one. */
  slug: string;
  x: number;
  y: number;
  r: number;
  /** Label drawn by us because the base map lacks one. */
  label?: string;
  /** Draw that label above the bubble instead of below. */
  labelAbove?: boolean;
  /**
   * Every other marker this card covers: zones it shares the mailing
   * with, and places the base map names that sit inside it.
   *
   * Two islands 60 pixels apart cannot honestly become one marker, and
   * a card that covers West Ashley should light West Ashley up. They
   * select, highlight and price as the single card they mail on.
   */
  also?: { x: number; y: number; r: number }[];
};

/**
 * Every marker is the same size.
 *
 * They used to scale by population, which is not what a buyer is
 * choosing between. Reach is set by the card, not by how many people
 * live in the town: Summerville and Sullivan's Island sell the same
 * product at different reaches, and Sullivan's shares a card that
 * covers 4,915. The legend had to carry a sentence explaining that
 * marker size did NOT mean what everyone assumes it means, which is the
 * clearest possible sign the encoding was wrong.
 *
 * On this base map it was also destructive. Summerville drew at r=76
 * and swallowed its own printed label; Charleston at r=74 covered the
 * peninsula; Goose Creek through Mount Pleasant merged into one blue
 * mass. Uniform markers sit alongside the map's own pins instead of on
 * top of them, and the colour now carries availability, which is
 * something a buyer can actually act on.
 */
export const MARKER_R = 13;

/**
 * Where each zone sits, and any label the base map does not print.
 *
 * Nine of these sit exactly on a dot the base map prints, read straight
 * off the artwork. The three it does not name were solved by fitting an
 * affine transform from the old base using those nine as control points,
 * then corrected by eye against the coastline: the fit put Goose Creek
 * too far north-west and drifted Hanahan toward the river.
 */
const PLACEMENT: Omit<MapPosition, "r" | "also">[] = [
  { slug: "summerville", x: 536, y: 290 },
  { slug: "moncks-corner", x: 824, y: 122 },
  { slug: "goose-creek", x: 818, y: 298, label: "Goose Creek", labelAbove: true },
  // West bank of the Cooper, north-east of North Charleston. Label above
  // and the marker nudged clear of the base map's printed "North
  // Charleston" pill, which the fitted position sat on top of.
  { slug: "hanahan", x: 868, y: 372, label: "Hanahan", labelAbove: true },
  { slug: "north-charleston", x: 810, y: 432 },
  { slug: "daniel-island", x: 956, y: 505, label: "Daniel Island", labelAbove: true },
  { slug: "mount-pleasant", x: 1038, y: 555 },
  { slug: "isle-of-palms", x: 1206, y: 564 },
  { slug: "sullivans-island", x: 1133, y: 623 },
  { slug: "charleston", x: 910, y: 634 },
  { slug: "james-island", x: 1014, y: 717 },
  { slug: "johns-island", x: 760, y: 800 },
];

/**
 * Places the base map names that are not zones of their own, pointed at
 * the zone that actually covers them.
 *
 * West Ashley is 29407 and 29414, both inside the Charleston zone.
 * Kiawah is 29455, inside Johns Island. Left alone they are the worst
 * thing a coverage map can have: a neighbourhood printed in your own
 * artwork with nothing to click, read by somebody who lives there as
 * "they do not mail here". Wired up they do the opposite job and tell
 * that person they are covered.
 *
 * They render and select exactly like the zone's own marker, because
 * that is what they are.
 */
const PROXIES: Record<string, { x: number; y: number }[]> = {
  charleston: [{ x: 750, y: 586 }],
  "johns-island": [{ x: 827, y: 919 }],
};

/**
 * One entry per card, carrying every circle that card covers.
 *
 * Keyed by mailing area rather than by zone, so a click anywhere on a
 * shared card selects the card. Zones the map has no placement for are
 * dropped rather than drawn at a default position.
 *
 * Takes its areas rather than reading the module constant, so the map
 * follows whatever pairings the admin has saved. Placements stay in
 * code: a pixel on a base image is not a fact about a place.
 */
export function mapPositionsFrom(
  areas: MailingArea[] = MAILING_AREAS,
): MapPosition[] {
  const circleFor = (slug: string) => {
    const p = PLACEMENT.find((q) => q.slug === slug);
    return p ? { x: p.x, y: p.y, r: MARKER_R } : undefined;
  };

  return areas.flatMap((area) => {
    const lead = PLACEMENT.find((p) => p.slug === area.slug);
    if (!lead) return [];
    const also = [
      // Zones sharing this card, which light up and sell together.
      ...area.zoneSlugs
        .filter((s) => s !== area.slug)
        .map(circleFor)
        .filter((c) => c !== undefined),
      // Places inside this zone that the base map names separately.
      ...(PROXIES[area.slug] ?? []).map((p) => ({ ...p, r: MARKER_R })),
    ];
    return [
      {
        ...lead,
        r: MARKER_R,
        ...(also.length > 0 ? { also } : {}),
      },
    ];
  });
}

/** The code-default map, for anything not reading live facts. */
export const MAP_POSITIONS: MapPosition[] = mapPositionsFrom();
