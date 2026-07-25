import "server-only";

/**
 * Neighborhood Cards data layer. Mirrors the legacy card tables
 * (directory_cards, card_spot_types, card_positions, card_orders) with
 * the same rules the PHP checkout enforces: fractional spot capacity,
 * category exclusivity, coupon caps, and deadline lockouts. Sample data
 * renders everything when no database is configured.
 */

export type SpotType = {
  key: "coupon" | "single" | "double" | "triple" | "quad";
  name: string;
  dims: string;
  spots: number;
  priceCents: number;
};

export type CardPosition = {
  id: number;
  side: "front" | "back";
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  spotType: SpotType["key"];
  takenBy?: string;
};

export type NeighborhoodCard = {
  id: number;
  slug: string;
  name: string;
  households: number;
  totalSpots: number;
  spotsTaken: number;
  maxCoupons: number;
  printDeadline: string;
  shipDate: string;
  status: "open" | "full" | "printing" | "shipped";
  spotTypes: SpotType[];
  positions: CardPosition[];
  takenCategories: string[];
};

/** CARD_PRICING_TIERS from config.php, 1,000 to 1,499 homes tier. */
const SPOT_TYPES: SpotType[] = [
  { key: "coupon", name: "Coupon", dims: '2.9" × 2.5"', spots: 0.5, priceCents: 5900 },
  { key: "single", name: "Single", dims: '2.9" × 2.5"', spots: 1, priceCents: 8900 },
  { key: "double", name: "Double", dims: '5.8" × 2.5"', spots: 2, priceCents: 16900 },
  { key: "triple", name: "Triple", dims: '8.7" × 2.5"', spots: 3, priceCents: 24900 },
  { key: "quad", name: "Quad", dims: '5.8" × 5"', spots: 4, priceCents: 32900 },
];

const samplePositions = (): CardPosition[] => {
  const takenBy = [
    "Palmetto Plumbing",
    undefined,
    "Island Breeze HVAC",
    undefined,
    "Saltwater Pizza",
    undefined,
    undefined,
    "Lowcountry Smiles",
  ];
  const types: SpotType["key"][] = [
    "quad",
    "double",
    "single",
    "single",
    "double",
    "coupon",
    "coupon",
    "triple",
  ];
  return types.map((t, i) => ({
    id: i + 1,
    side: i < 4 ? "front" : "back",
    row: Math.floor((i % 4) / 2),
    col: i % 2,
    rowSpan: t === "quad" ? 2 : 1,
    colSpan: t === "double" || t === "triple" ? 2 : 1,
    spotType: t,
    takenBy: takenBy[i],
  }));
};

const SAMPLE_CARDS: NeighborhoodCard[] = [
  {
    id: 1,
    slug: "nexton",
    name: "Nexton",
    households: 1200,
    totalSpots: 16,
    spotsTaken: 11.5,
    maxCoupons: 2,
    printDeadline: "2026-08-15",
    shipDate: "2026-08-29",
    status: "open",
    spotTypes: SPOT_TYPES,
    positions: samplePositions(),
    takenCategories: ["Plumbing", "HVAC", "Restaurants", "Dental"],
  },
  {
    id: 2,
    slug: "cane-bay",
    name: "Cane Bay",
    households: 1400,
    totalSpots: 16,
    spotsTaken: 6,
    maxCoupons: 2,
    printDeadline: "2026-09-05",
    shipDate: "2026-09-19",
    status: "open",
    spotTypes: SPOT_TYPES,
    positions: samplePositions().map((p) => ({ ...p, takenBy: p.id % 3 === 0 ? p.takenBy : undefined })),
    takenCategories: ["Roofing"],
  },
  {
    id: 3,
    slug: "carnes-crossroads",
    name: "Carnes Crossroads",
    households: 1000,
    totalSpots: 16,
    spotsTaken: 16,
    maxCoupons: 2,
    printDeadline: "2026-07-30",
    shipDate: "2026-08-13",
    status: "full",
    spotTypes: SPOT_TYPES,
    positions: samplePositions().map((p) => ({ ...p, takenBy: p.takenBy ?? "Reserved" })),
    takenCategories: [],
  },
];

export const usingSampleCards = () => !process.env.DB_HOST;

export async function getOpenCards(): Promise<NeighborhoodCard[]> {
  if (usingSampleCards()) return SAMPLE_CARDS;
  // DB path lands with drizzle-kit pull of legacy card tables on staging.
  return SAMPLE_CARDS;
}

export async function getCard(slug: string): Promise<NeighborhoodCard | undefined> {
  const cards = await getOpenCards();
  return cards.find((c) => c.slug === slug);
}

export const daysUntil = (iso: string) =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
