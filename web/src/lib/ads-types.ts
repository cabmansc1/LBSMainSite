/**
 * Ad shapes, shared by the server library and the admin screen.
 *
 * Split out for the same reason proofs-types.ts is: the admin screen is a
 * client component, and importing a value from a "server-only" module
 * breaks the build rather than failing at runtime.
 */

/**
 * The four places an advertisement can go on a listing page.
 *
 * Standard IAB sizes, deliberately. A sponsor can hand over the same
 * creative they already run elsewhere, and Google's unit for the slot
 * needs no special configuration.
 */
export type AdSlotId =
  | "sidebar_tower"
  | "in_content"
  | "sidebar_rect"
  | "footer_leader";

export type AdSlotSpec = {
  id: AdSlotId;
  label: string;
  width: number;
  height: number;
  /** What runs instead where 728px will not fit. */
  mobile?: { width: number; height: number };
  /** Plain English, for whoever is filling the slot. */
  where: string;
};

export const AD_SLOTS: AdSlotSpec[] = [
  {
    id: "sidebar_tower",
    label: "Sidebar tower",
    width: 300,
    height: 600,
    mobile: { width: 300, height: 250 },
    where:
      "Top of the sidebar, sticky. It stays on screen for the whole read, so it is the one worth charging most for.",
  },
  {
    id: "in_content",
    label: "In content",
    width: 728,
    height: 90,
    mobile: { width: 320, height: 50 },
    where: "Between the description and the photos, in the main column.",
  },
  {
    id: "sidebar_rect",
    label: "Sidebar rectangle",
    width: 300,
    height: 250,
    where: "Below the category browser, near the bottom of the sidebar.",
  },
  {
    id: "footer_leader",
    label: "Footer leaderboard",
    width: 970,
    height: 90,
    mobile: { width: 320, height: 50 },
    where: "Full width, above the site footer.",
  },
];

export const AD_SLOT_BY_ID = new Map(AD_SLOTS.map((s) => [s.id, s]));

export const isAdSlot = (v: unknown): v is AdSlotId =>
  typeof v === "string" && AD_SLOT_BY_ID.has(v as AdSlotId);

/** One creative. Never carries its bytes; those come from the image route. */
export type Ad = {
  id: number;
  slot: AdSlotId;
  /** For your own reference in the admin, never shown to a visitor. */
  name: string;
  clickUrl: string;
  /** Category slugs this may run on. Empty means everywhere. */
  categories: string[];
  /** Location slugs this may run on. Empty means everywhere. */
  locations: string[];
  /** ISO dates, or null for "no start" / "no end". */
  startsOn: string | null;
  endsOn: string | null;
  active: boolean;
  width: number;
  height: number;
  /** Alt text, so a screen reader is not told "image". */
  alt: string;
};

/** An ad with its running totals, for the admin table. */
export type AdWithStats = Ad & {
  impressions: number;
  clicks: number;
  /** Whether it is running right now, and why not when it is not. */
  state: "running" | "paused" | "scheduled" | "finished";
};

/**
 * Google AdSense, used to fill a slot nobody has bought.
 *
 * Kept as one publisher id plus a unit id per slot, which is exactly what
 * AdSense hands out. Blank unit means "leave this slot empty rather than
 * run Google in it".
 */
export type AdsenseConfig = {
  enabled: boolean;
  /** ca-pub-0000000000000000 */
  client: string;
  units: Partial<Record<AdSlotId, string>>;
};

export const EMPTY_ADSENSE: AdsenseConfig = {
  enabled: false,
  client: "",
  units: {},
};

export function adState(ad: Ad, todayIso: string): AdWithStats["state"] {
  if (!ad.active) return "paused";
  if (ad.startsOn && ad.startsOn > todayIso) return "scheduled";
  if (ad.endsOn && ad.endsOn < todayIso) return "finished";
  return "running";
}
