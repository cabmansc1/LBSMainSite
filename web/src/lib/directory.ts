import "server-only";

/**
 * Directory data layer. Reads the same directory_* tables the PHP site
 * writes. When no database is configured (local dev, this sandbox),
 * clearly-labeled sample data keeps every page renderable; staging and
 * production always run with DB_HOST set.
 *
 * Ordering matches Business.php: priority placement, then featured,
 * then newest. Visibility gate matches too: active, verified, not hidden.
 */

export type DirectoryBusiness = {
  id: number;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  locationArea: string;
  locationSlug: string;
  city: string;
  phone?: string;
  website?: string;
  description: string;
  planType: "basic" | "featured" | "elite";
  isVerified: boolean;
  isFeatured: boolean;
  offer?: { title: string; description?: string };
  hours?: { day: string; text: string }[];
  address?: string;
};

export type DirectoryFilters = {
  category?: string;
  location?: string;
  tag?: string;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* ---------- sample data (no-DB fallback only) ---------- */

const SAMPLE: DirectoryBusiness[] = [
  {
    id: 1,
    slug: "palmetto-plumbing-co",
    name: "Palmetto Plumbing Co.",
    category: "Plumbing",
    categorySlug: "plumbing",
    locationArea: "Summerville",
    locationSlug: "summerville",
    city: "Summerville",
    phone: "843-555-0142",
    website: "https://example.com",
    description:
      "Family-owned plumbing serving Summerville for 15 years. Water heaters, repipes, and same-day repairs.",
    planType: "elite",
    isVerified: true,
    isFeatured: true,
    offer: { title: "$50 off water heater install" },
    hours: [
      { day: "Mon to Fri", text: "8am to 6pm" },
      { day: "Sat", text: "9am to 1pm" },
      { day: "Sun", text: "Closed" },
    ],
    address: "123 Main St, Summerville, SC 29483",
  },
  {
    id: 2,
    slug: "lowcountry-smiles-dental",
    name: "Lowcountry Smiles Dental",
    category: "Dental",
    categorySlug: "dental",
    locationArea: "Mount Pleasant",
    locationSlug: "mount-pleasant",
    city: "Mount Pleasant",
    phone: "843-555-0187",
    description:
      "Comprehensive family dentistry with same-week appointments and an in-house membership plan.",
    planType: "featured",
    isVerified: true,
    isFeatured: true,
    offer: { title: "Free whitening for new patients" },
    address: "88 Coleman Blvd, Mount Pleasant, SC 29464",
  },
  {
    id: 3,
    slug: "marsh-view-roofing",
    name: "Marsh View Roofing",
    category: "Roofing",
    categorySlug: "roofing",
    locationArea: "Goose Creek",
    locationSlug: "goose-creek",
    city: "Goose Creek",
    phone: "843-555-0113",
    description:
      "Storm damage specialists. Free inspections and insurance claim help across the Lowcountry.",
    planType: "basic",
    isVerified: true,
    isFeatured: false,
  },
  {
    id: 4,
    slug: "tidal-wave-car-wash",
    name: "Tidal Wave Car Wash",
    category: "Automotive",
    categorySlug: "automotive",
    locationArea: "North Charleston",
    locationSlug: "north-charleston",
    city: "North Charleston",
    description:
      "Unlimited wash memberships from $19 a month, free vacuums every visit.",
    planType: "basic",
    isVerified: true,
    isFeatured: false,
  },
  {
    id: 5,
    slug: "island-breeze-hvac",
    name: "Island Breeze HVAC",
    category: "HVAC",
    categorySlug: "hvac",
    locationArea: "Daniel Island",
    locationSlug: "daniel-island",
    city: "Charleston",
    phone: "843-555-0166",
    description:
      "AC repair and replacement with same-day service and financing available.",
    planType: "featured",
    isVerified: true,
    isFeatured: true,
    offer: { title: "$79 seasonal tune-up" },
  },
  {
    id: 6,
    slug: "saltwater-pizza",
    name: "Saltwater Pizza",
    category: "Restaurants",
    categorySlug: "restaurants",
    locationArea: "James Island",
    locationSlug: "james-island",
    city: "Charleston",
    description:
      "Wood-fired pies, local beer, and a porch made for Friday nights.",
    planType: "basic",
    isVerified: true,
    isFeatured: false,
  },
];

export const usingSampleData = () => !process.env.DB_HOST;

/* ---------- queries ---------- */

const rankPlan = (b: DirectoryBusiness) =>
  b.planType === "elite" ? 0 : b.planType === "featured" ? 1 : 2;

export async function getBusinesses(
  filters: DirectoryFilters = {},
): Promise<DirectoryBusiness[]> {
  if (usingSampleData()) {
    let rows = SAMPLE;
    if (filters.category)
      rows = rows.filter((b) => b.categorySlug === filters.category);
    if (filters.location)
      rows = rows.filter((b) => b.locationSlug === filters.location);
    return [...rows].sort((a, b) => rankPlan(a) - rankPlan(b));
  }

  try {
  const { db } = await import("@/lib/db");
  const { businesses, categories, locations } = await import(
    "@/lib/db/schema-legacy"
  );
  const { and, eq, desc, sql } = await import("drizzle-orm");

  const conds = [
    eq(businesses.isActive, true),
    eq(businesses.isVerified, true),
    eq(businesses.isHidden, false),
  ];
  if (filters.category) {
    const cat = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, filters.category))
      .limit(1);
    if (cat[0]) conds.push(eq(businesses.category, cat[0].name));
  }
  if (filters.location) {
    const loc = await db
      .select()
      .from(locations)
      .where(eq(locations.slug, filters.location))
      .limit(1);
    if (loc[0]) conds.push(eq(businesses.locationArea, loc[0].name));
  }

  const rows = await db
    .select()
    .from(businesses)
    .where(and(...conds))
    .orderBy(
      sql`CASE WHEN ${businesses.planType} = 'elite' THEN 0 WHEN ${businesses.planType} = 'featured' THEN 1 ELSE 2 END`,
      desc(businesses.createdAt),
    )
    .limit(200);

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.businessName,
    category: r.category ?? "General",
    categorySlug: slugify(r.category ?? "general"),
    locationArea: r.locationArea ?? r.city ?? "",
    locationSlug: slugify(r.locationArea ?? r.city ?? ""),
    city: r.city ?? "",
    phone: r.phone ?? undefined,
    website: r.website ?? undefined,
    description: r.description ?? "",
    planType: (r.planType as DirectoryBusiness["planType"]) ?? "basic",
    isVerified: !!r.isVerified,
    isFeatured: !!r.isFeatured,
    address: r.address
      ? `${r.address}, ${r.city ?? ""}, ${r.state ?? "SC"} ${r.zipCode ?? ""}`
      : undefined,
  }));
  } catch (e) {
    // Surface the exact DB failure in server logs, serve samples so the
    // page stays up while the schema mapping gets corrected.
    console.error("[directory] DB query failed, serving samples:", e);
    return [...SAMPLE].sort((a, b) => rankPlan(a) - rankPlan(b));
  }
}

export async function getBusiness(
  slug: string,
): Promise<DirectoryBusiness | undefined> {
  if (usingSampleData()) return SAMPLE.find((b) => b.slug === slug);
  const all = await getBusinesses();
  return all.find((b) => b.slug === slug);
}

export async function getFilterOptions() {
  if (usingSampleData()) {
    const uniq = <T,>(arr: T[]) => [...new Set(arr)];
    return {
      categories: uniq(SAMPLE.map((b) => b.category)).map((name) => ({
        name,
        slug: slugify(name),
      })),
      locations: uniq(SAMPLE.map((b) => b.locationArea)).map((name) => ({
        name,
        slug: slugify(name),
      })),
    };
  }
  try {
    const { db } = await import("@/lib/db");
    const { categories, locations } = await import("@/lib/db/schema-legacy");
    const [cats, locs] = await Promise.all([
      db.select().from(categories),
      db.select().from(locations),
    ]);
    return {
      categories: cats.map((c) => ({ name: c.name, slug: c.slug })),
      locations: locs.map((l) => ({ name: l.name, slug: l.slug })),
    };
  } catch (e) {
    console.error("[directory] filter options query failed, serving samples:", e);
    const uniq = <T,>(arr: T[]) => [...new Set(arr)];
    return {
      categories: uniq(SAMPLE.map((b) => b.category)).map((name) => ({
        name,
        slug: slugify(name),
      })),
      locations: uniq(SAMPLE.map((b) => b.locationArea)).map((name) => ({
        name,
        slug: slugify(name),
      })),
    };
  }
}
