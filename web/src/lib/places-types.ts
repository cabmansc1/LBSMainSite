/**
 * Place shapes and the kind list, without the database.
 *
 * The admin screen is a client component and needs PLACE_KINDS to build
 * its dropdown. Importing a value out of places.ts would pull "server-only"
 * across the boundary with it and fail the build, so the parts both sides
 * need live here and places.ts re-exports them.
 */

export type PlaceKind = "region" | "market" | "zone" | "neighborhood";

export const PLACE_KINDS: { value: PlaceKind; label: string; hint: string }[] = [
  { value: "region", label: "Region", hint: "The whole footprint" },
  { value: "market", label: "Market", hint: "How the area is sold" },
  { value: "zone", label: "Zone", hint: "A card that mails" },
  {
    value: "neighborhood",
    label: "Neighborhood",
    hint: "Somewhere people search for, not sold on its own",
  },
];

export type Place = {
  id: number;
  /** Its address on the site. Fixed once created. */
  slug: string;
  name: string;
  kind: PlaceKind;
  /** Slug of the place above it, or null for the region. */
  parentSlug: string | null;
  blurb: string;
  order: number;
  active: boolean;
  /**
   * The card that reaches here, as a slug in zones.ts.
   *
   * Null means nothing mails here yet, which is a real and useful state:
   * a market can exist for discovery long before it is sellable. Set on
   * a neighbourhood, it means "advertising here buys that zone's card",
   * which is how Ladson routes to Summerville without pretending Ladson
   * is part of Summerville.
   */
  mailingZoneSlug: string | null;
  /** The directory_locations slug whose listings belong to this place. */
  directorySlug: string | null;
};

export const slugifyPlace = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
