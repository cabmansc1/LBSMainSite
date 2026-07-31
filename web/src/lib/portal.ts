import "server-only";
import { sql } from "drizzle-orm";
import { getAdvertiserCards, type AdvertiserCard } from "@/lib/mission-control";
import { dealsForBusiness, type LowcoDeal } from "@/lib/lowco-deals";
import type { SessionUser } from "@/lib/auth";

/**
 * Portal data, scoped to the signed-in account.
 *
 * Identity resolution, in order:
 *   1. Listings whose user_id is this login (the reliable link).
 *   2. Listings whose email matches the login's email (legacy imports
 *      that were never linked). These are offered as claimable.
 * Mission Control campaigns then match on the login's email first and
 * the business name second, the same rule the public site already uses.
 */

export type PortalListing = {
  id: number;
  slug: string;
  name: string;
  category: string | null;
  locationArea: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  planType: string | null;
  isFeatured: boolean;
  isVerified: boolean;
  /** True when matched by email rather than an explicit user_id link. */
  claimable: boolean;
};

export type PortalInquiry = {
  id: number;
  businessId: number;
  businessName: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string | null;
};

export type PortalContext = {
  user: SessionUser;
  listings: PortalListing[];
  cards: AdvertiserCard[];
  currentCards: AdvertiserCard[];
  pastCards: AdvertiserCard[];
  deals: LowcoDeal[];
  inquiries: PortalInquiry[];
  /** Set when a data source could not be reached, so pages can say so. */
  warnings: string[];
};

/**
 * Exported because callers have to tell "you are not on that card" apart
 * from "we could not ask". Matching on the string in two places is the
 * kind of thing that silently drifts, so there is only one copy of it.
 */
export const MC_UNAVAILABLE = "Campaign details are unavailable right now.";

const bool = (v: unknown) => v === 1 || v === true || v === "1";
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

async function loadListings(user: SessionUser): Promise<PortalListing[]> {
  const { db } = await import("@/lib/db");
  const rows = (await db.execute(
    sql`SELECT id, slug, business_name, category, location_area, city, phone,
               email, website, description, plan_type, is_featured, is_verified,
               user_id
        FROM directory_businesses
        WHERE user_id = ${user.id}
           OR (user_id IS NULL AND email = ${user.email})
        ORDER BY business_name
        LIMIT 25`,
  )) as unknown as [Record<string, unknown>[]];

  return (rows[0] ?? []).map((r) => ({
    id: Number(r.id),
    slug: str(r.slug),
    name: str(r.business_name),
    category: (r.category as string) ?? null,
    locationArea: (r.location_area as string) ?? null,
    city: (r.city as string) ?? null,
    phone: (r.phone as string) ?? null,
    email: (r.email as string) ?? null,
    website: (r.website as string) ?? null,
    description: (r.description as string) ?? null,
    planType: (r.plan_type as string) ?? null,
    isFeatured: bool(r.is_featured),
    isVerified: bool(r.is_verified),
    claimable: r.user_id === null || r.user_id === undefined,
  }));
}

async function loadInquiries(businessIds: number[]): Promise<PortalInquiry[]> {
  if (businessIds.length === 0) return [];
  const { db } = await import("@/lib/db");
  const { inArray } = await import("drizzle-orm");
  const { businessInquiries, businesses } = await import("@/lib/db/schema-legacy");
  const { desc, eq } = await import("drizzle-orm");

  const rows = await db
    .select({
      id: businessInquiries.id,
      businessId: businessInquiries.businessId,
      businessName: businesses.businessName,
      name: businessInquiries.name,
      email: businessInquiries.email,
      phone: businessInquiries.phone,
      message: businessInquiries.message,
      createdAt: businessInquiries.createdAt,
    })
    .from(businessInquiries)
    .leftJoin(businesses, eq(businesses.id, businessInquiries.businessId))
    // Scoped to this account's own listings, never anyone else's.
    .where(inArray(businessInquiries.businessId, businessIds))
    .orderBy(desc(businessInquiries.id))
    .limit(100);

  return rows.map((r) => ({
    id: r.id,
    businessId: r.businessId,
    businessName: r.businessName ?? "",
    name: r.name,
    email: r.email,
    phone: r.phone ?? "",
    message: r.message,
    createdAt: r.createdAt ? String(r.createdAt) : null,
  }));
}

export async function getPortalContext(user: SessionUser): Promise<PortalContext> {
  const warnings: string[] = [];

  let listings: PortalListing[] = [];
  try {
    listings = await loadListings(user);
  } catch (e) {
    console.error("[portal] listings lookup failed:", e);
    warnings.push("We could not load your listing just now.");
  }

  const primary = listings[0];

  const [cards, deals, inquiries] = await Promise.all([
    getAdvertiserCards({ email: user.email, name: primary?.name }).catch((e) => {
      console.error("[portal] Mission Control lookup failed:", e);
      warnings.push(MC_UNAVAILABLE);
      return [] as AdvertiserCard[];
    }),
    primary
      ? dealsForBusiness(primary.name).catch(() => [] as LowcoDeal[])
      : Promise.resolve([] as LowcoDeal[]),
    loadInquiries(listings.map((l) => l.id)).catch((e) => {
      console.error("[portal] inquiries lookup failed:", e);
      return [] as PortalInquiry[];
    }),
  ]);

  return {
    user,
    listings,
    cards,
    currentCards: cards.filter((c) => !c.isPast),
    pastCards: cards.filter((c) => c.isPast),
    deals,
    inquiries,
    warnings,
  };
}
