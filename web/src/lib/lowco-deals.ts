import "server-only";

/**
 * LowCoDeals.com bridge (sister site). Reads the public deals API and
 * exposes matching helpers so directory listings can deep-link to a
 * business's live deals. Read-only by design; deals are managed on
 * LowCoDeals itself.
 */

const API = () => process.env.LOWCODEALS_API ?? "https://lowcodeals.com/api/deals";
const SITE = () => (process.env.LOWCODEALS_SITE ?? "https://lowcodeals.com").replace(/\/$/, "");

/** LowCoDeals brand, sampled from their logo. */
export const LOWCODEALS_BRAND = {
  green: "#8CBB39",
  greenDeep: "#6F9A28",
  greenTint: "#F0F7E4",
  greenLine: "#D3E7B4",
  navy: "#0A2348",
  logo: "/brand/lowcodeals.png",
  site: "https://lowcodeals.com",
} as const;

export type LowcoDeal = {
  id: number;
  title: string;
  slug: string;
  url: string;
  businessName: string;
  businessSlug?: string;
  dealPrice?: number;
  originalPrice?: number;
  imageUrl?: string;
  expiresAt?: string;
  category?: string;
};

type RawDeal = {
  id: number;
  title: string;
  slug: string;
  status?: string;
  dealPrice?: number | string;
  originalPrice?: number | string;
  expiresAt?: string | null;
  category?: string;
  business?: { name?: string; slug?: string; logoUrl?: string | null };
  images?: { url?: string }[] | string[];
};

/** Lowercase alphanumeric, for fuzzy business-name matching. */
export const normalizeBizName = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

export async function getLowCoDeals(): Promise<LowcoDeal[]> {
  try {
    const res = await fetch(API(), { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const j = await res.json();
    const list: RawDeal[] = Array.isArray(j) ? j : (j.deals ?? j.data ?? []);
    return list
      .filter((d) => (d.status ?? "active") === "active" && d.title && d.slug)
      .map((d) => {
        const img = Array.isArray(d.images) ? d.images[0] : undefined;
        return {
          id: d.id,
          title: d.title,
          slug: d.slug,
          url: `${SITE()}/deals/${d.slug}`,
          businessName: d.business?.name ?? "",
          businessSlug: d.business?.slug,
          dealPrice: d.dealPrice !== undefined ? Number(d.dealPrice) : undefined,
          originalPrice:
            d.originalPrice !== undefined ? Number(d.originalPrice) : undefined,
          imageUrl: typeof img === "string" ? img : img?.url,
          expiresAt: d.expiresAt ?? undefined,
          category: d.category,
        };
      });
  } catch (e) {
    console.error("[lowco-deals] feed unavailable:", e);
    return [];
  }
}

/** Map of normalized business name -> that business's deals. */
export async function getDealsByBusiness(): Promise<Record<string, LowcoDeal[]>> {
  const deals = await getLowCoDeals();
  const map: Record<string, LowcoDeal[]> = {};
  for (const d of deals) {
    if (!d.businessName) continue;
    const key = normalizeBizName(d.businessName);
    (map[key] ??= []).push(d);
  }
  return map;
}

export async function dealsForBusiness(name: string): Promise<LowcoDeal[]> {
  const map = await getDealsByBusiness();
  return map[normalizeBizName(name)] ?? [];
}
