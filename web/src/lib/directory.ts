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
  /** Primary photo (logo), absolute URL served by the uploads host. */
  logoUrl?: string;
  /** Gallery photos (excludes banner type), primary first. */
  photos?: { url: string; alt: string }[];
  socials?: { facebook?: string; instagram?: string; tiktok?: string; youtube?: string };
};

/**
 * Photo files live on the PHP host's disk; both apps share the DB but
 * only that host has /uploads. Point at production by default,
 * overridable at cutover when uploads move or get a CDN.
 */
const uploadsBase = () =>
  (process.env.UPLOADS_BASE_URL ?? "https://www.lowcountrybusinessspotlight.com/uploads").replace(/\/$/, "") +
  "/business_photos/";

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

  // Matches legacy Business.php exactly: businesses.category and
  // businesses.location_area STORE SLUGS, and filters compare slugs
  // directly. Display labels come from the taxonomy tables afterward.
  const conds = [
    eq(businesses.isActive, true),
    eq(businesses.isVerified, true),
    eq(businesses.isHidden, false),
  ];
  if (filters.category) conds.push(eq(businesses.category, filters.category));
  if (filters.location)
    conds.push(eq(businesses.locationArea, filters.location));

  // Slug -> pretty label maps (legacy fallback: ucwords on the slug).
  const [catRows, locRows] = await Promise.all([
    db.select().from(categories),
    db.select().from(locations),
  ]);
  const prettify = (slug: string) =>
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const catLabel = new Map(catRows.map((c) => [c.slug, c.displayName]));
  const locLabel = new Map(locRows.map((l) => [l.slug, l.displayName]));

  const rows = await db
    .select()
    .from(businesses)
    .where(and(...conds))
    .orderBy(
      sql`CASE WHEN ${businesses.planType} = 'elite' THEN 0 WHEN ${businesses.planType} = 'featured' THEN 1 ELSE 2 END`,
      desc(businesses.createdAt),
    )
    .limit(200);

  // Photos for all listed businesses in one query, ordered like the
  // legacy site: primary first, then sort order, then upload date.
  const { inArray, asc } = await import("drizzle-orm");
  const { businessPhotos } = await import("@/lib/db/schema-legacy");
  const photosByBiz = new Map<number, { url: string; alt: string; type: string }[]>();
  if (rows.length > 0) {
    const photoRows = await db
      .select()
      .from(businessPhotos)
      .where(inArray(businessPhotos.businessId, rows.map((r) => r.id)))
      .orderBy(
        desc(businessPhotos.isPrimary),
        asc(businessPhotos.sortOrder),
        asc(businessPhotos.uploadedAt),
      );
    for (const p of photoRows) {
      if (!p.filename) continue;
      const list = photosByBiz.get(p.businessId) ?? [];
      list.push({
        url: uploadsBase() + p.filename,
        alt: p.altText ?? "",
        type: p.photoType ?? "",
      });
      photosByBiz.set(p.businessId, list);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.businessName,
    category: r.category
      ? (catLabel.get(r.category) ?? prettify(r.category))
      : "General",
    categorySlug: r.category ?? "general",
    locationArea: r.locationArea
      ? (locLabel.get(r.locationArea) ?? prettify(r.locationArea))
      : (r.city ?? ""),
    locationSlug: r.locationArea ?? slugify(r.city ?? ""),
    city: r.city ?? "",
    phone: r.phone ?? undefined,
    website: r.website ?? undefined,
    description: r.description ?? "",
    planType: (r.planType as DirectoryBusiness["planType"]) ?? "basic",
    isVerified: !!r.isVerified,
    // Legacy directory.php features on is_featured OR paid placement;
    // plan_type mirrors the paid tiers the admin assigns.
    isFeatured:
      !!r.isFeatured || r.planType === "featured" || r.planType === "elite",
    socials:
      r.facebookUrl || r.instagramUrl || r.tiktokUrl || r.youtubeUrl
        ? {
            facebook: r.facebookUrl ?? undefined,
            instagram: r.instagramUrl ?? undefined,
            tiktok: r.tiktokUrl ?? undefined,
            youtube: r.youtubeUrl ?? undefined,
          }
        : undefined,
    address: r.address
      ? `${r.address}, ${r.city ?? ""}, ${r.state ?? "SC"} ${r.zipCode ?? ""}`
      : undefined,
    logoUrl: photosByBiz.get(r.id)?.[0]?.url,
    photos: photosByBiz
      .get(r.id)
      ?.filter((p) => p.type !== "banner")
      .map(({ url, alt }) => ({ url, alt: alt || r.businessName })),
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
    const { asc, eq } = await import("drizzle-orm");
    const [cats, locs] = await Promise.all([
      db
        .select()
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(asc(categories.displayOrder)),
      db
        .select()
        .from(locations)
        .where(eq(locations.isActive, true))
        .orderBy(asc(locations.displayOrder)),
    ]);
    return {
      categories: cats.map((c) => ({ name: c.displayName, slug: c.slug })),
      locations: locs.map((l) => ({ name: l.displayName, slug: l.slug })),
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
