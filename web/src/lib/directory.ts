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
  /** Linked to a login. Decides whether to offer "claim this listing". */
  claimed: boolean;
  offer?: { title: string; description?: string };
  hours?: { day: string; text: string }[];
  address?: string;
  /** Primary photo (logo), absolute URL served by the uploads host. */
  logoUrl?: string;
  /** Gallery photos (excludes banner type), primary first. */
  photos?: { url: string; alt: string }[];
  socials?: { facebook?: string; instagram?: string; tiktok?: string; youtube?: string };
  /** Taxonomy tags ("Locally Owned", "Licensed & Insured", ...). */
  tags?: { name: string; slug: string }[];
  /** Coordinates from the legacy geocoder, for the directory map view. */
  lat?: number;
  lng?: number;
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
    lat: 33.0185,
    lng: -80.1756,
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
    claimed: false,
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
    lat: 32.8323,
    lng: -79.8284,
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
    claimed: false,
    offer: { title: "Free whitening for new patients" },
    address: "88 Coleman Blvd, Mount Pleasant, SC 29464",
  },
  {
    id: 3,
    slug: "marsh-view-roofing",
    lat: 32.981,
    lng: -80.0326,
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
    claimed: false,
  },
  {
    id: 4,
    slug: "tidal-wave-car-wash",
    lat: 32.8546,
    lng: -79.9748,
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
    claimed: false,
  },
  {
    id: 5,
    slug: "island-breeze-hvac",
    lat: 32.8639,
    lng: -79.9099,
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
    claimed: false,
    offer: { title: "$79 seasonal tune-up" },
  },
  {
    id: 6,
    slug: "saltwater-pizza",
    lat: 32.722,
    lng: -79.945,
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
    claimed: false,
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
  const {
    businesses,
    businessPhotos,
    businessTags,
    categories,
    locations,
    tags,
  } = await import("@/lib/db/schema-legacy");
  const { and, asc, eq, desc, inArray, sql } = await import("drizzle-orm");

  // MySQL is not necessarily in the same datacenter as this app, so a
  // query kept in sequence behind another is a whole extra round trip
  // added to every page view. These two need nothing from the listing
  // query and the listing query needs nothing from them, so they go out
  // now and get collected at the bottom.
  //
  // Slug -> pretty label maps (legacy fallback: ucwords on the slug).
  const taxonomyQuery = Promise.all([
    db.select().from(categories),
    db.select().from(locations),
  ]);

  // Coordinates for the map view. The legacy geocoder populated columns
  // literally named lat/lng (directory.php reads $b['lat'] off SELECT
  // b.*), while newer write paths use latitude/longitude. Probe both so
  // pins show regardless of which pair this install carries.
  const coordsQuery = (async () => {
    const coords = new Map<number, { lat: number; lng: number }>();
    const candidates = [
      "SELECT id, COALESCE(lat, latitude) AS la, COALESCE(lng, longitude) AS ln FROM directory_businesses",
      "SELECT id, lat AS la, lng AS ln FROM directory_businesses",
      "SELECT id, latitude AS la, longitude AS ln FROM directory_businesses",
    ];
    for (const q of candidates) {
      try {
        const [coordRows] = (await db.execute(sql.raw(q))) as unknown as [
          { id: number; la: unknown; ln: unknown }[],
        ];
        for (const c of coordRows) {
          if (c.la != null && c.ln != null) {
            const lat = Number(c.la);
            const lng = Number(c.ln);
            if (!isNaN(lat) && !isNaN(lng)) coords.set(c.id, { lat, lng });
          }
        }
        break;
      } catch {
        // column pair not present on this install; try the next shape
      }
    }
    return coords;
  })();

  // Claim the rejections up front. An in-flight query whose failure has
  // no handler yet becomes an unhandled rejection if one of the awaits
  // below throws first, which would bury the error that actually
  // matters. The awaits still see the real failure.
  taxonomyQuery.catch(() => {});
  coordsQuery.catch(() => {});

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
  if (filters.tag) {
    // Genuinely sequential: the junction table is keyed by tag id, so
    // the slug has to resolve to one before it can be searched.
    const tagRow = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, filters.tag))
      .limit(1);
    if (tagRow[0]) {
      const links = await db
        .select()
        .from(businessTags)
        .where(eq(businessTags.tagId, tagRow[0].id));
      const ids = links.map((l) => l.businessId);
      if (ids.length === 0) return [];
      conds.push(inArray(businesses.id, ids));
    } else {
      return [];
    }
  }

  const rows = await db
    .select()
    .from(businesses)
    .where(and(...conds))
    .orderBy(
      sql`CASE WHEN ${businesses.planType} = 'elite' THEN 0 WHEN ${businesses.planType} = 'featured' THEN 1 ELSE 2 END`,
      desc(businesses.createdAt),
    )
    // This was 200, which the directory was on course to reach. The cap
    // is not just a page-length limit: getBusiness() finds a listing by
    // scanning this result, so a business past the cap would have had
    // its own page start returning 404, and the sitemap would have
    // stopped listing it. Browsing is paginated in the client, so the
    // number here is about how many listings exist, not how many are
    // drawn. Past a few hundred this whole approach wants replacing
    // with LIMIT/OFFSET and a slug lookup of its own.
    .limit(1000);

  const tagsByBiz = new Map<number, { name: string; slug: string }[]>();
  const photosByBiz = new Map<number, { url: string; alt: string; type: string }[]>();
  let hoursByBiz = new Map<number, { day: string; text: string }[]>();
  let offersByBiz = new Map<number, { title: string; description: string }>();
  if (rows.length > 0) {
    const bizIds = rows.map((r) => r.id);

    // All six are keyed off the listing ids and none reads another's
    // result, so they are one round trip together rather than six in
    // a row.
    const [tagLinks, photoRows, uploadedLogos, hourRows, offerRows, galleryRows] =
      await Promise.all([
      // Tags per business (junction join, batched).
      db
        .select({
          businessId: businessTags.businessId,
          name: tags.displayName,
          slug: tags.slug,
        })
        .from(businessTags)
        .innerJoin(tags, eq(businessTags.tagId, tags.id))
        .where(inArray(businessTags.businessId, bizIds)),
      // Photos for all listed businesses in one query, ordered like the
      // legacy site: primary first, then sort order, then upload date.
      db
        .select()
        .from(businessPhotos)
        .where(inArray(businessPhotos.businessId, bizIds))
        .orderBy(
          desc(businessPhotos.isPrimary),
          asc(businessPhotos.sortOrder),
          asc(businessPhotos.uploadedAt),
        ),
      // Logos uploaded through the admin live in the database, because
      // this app cannot write to the PHP host's disk.
      (async (): Promise<Map<number, number>> => {
        try {
          const { getBusinessImageIds } = await import("@/lib/business-images");
          return await getBusinessImageIds(bizIds);
        } catch (e) {
          console.error("[directory] uploaded logo lookup failed:", e);
          return new Map<number, number>();
        }
      })(),
      // Opening hours. The column has been written by the legacy admin
      // for years; nothing here ever read it, so every real listing
      // rendered without hours and without the schema.org markup that
      // goes with them.
      (async () => {
        const { getHoursFor } = await import("@/lib/business-hours");
        return getHoursFor(bizIds);
      })(),
      // Offers, which have the same history as hours: a legacy table the
      // PHP admin writes, a field on the model, and nothing that ever
      // loaded one.
      (async () => {
        const { getOffersFor } = await import("@/lib/business-offers");
        return getOffersFor(bizIds);
      })(),
      // Gallery photos uploaded through this app. The legacy gallery
      // lives on the PHP host's disk, which this app cannot write to,
      // so anything added from the portal is stored in the database and
      // served from it.
      (async () => {
        const { getGalleryImages } = await import("@/lib/business-images");
        return getGalleryImages(bizIds);
      })(),
    ]);

    for (const l of tagLinks) {
      const list = tagsByBiz.get(l.businessId) ?? [];
      list.push({ name: l.name, slug: l.slug });
      tagsByBiz.set(l.businessId, list);
    }

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

    offersByBiz = new Map(
      [...offerRows].map(([id, o]) => [
        id,
        { title: o.title, description: o.description },
      ]),
    );

    const { formatHours } = await import("@/lib/business-hours");
    hoursByBiz = new Map(
      [...hourRows].map(([businessId, days]) => [businessId, formatHours(days)]),
    );

    // Uploaded gallery photos join the legacy ones, after them, so a
    // business that had photos on the old site keeps the order it had.
    for (const [businessId, images] of galleryRows) {
      const list = photosByBiz.get(businessId) ?? [];
      for (const img of images) {
        list.push({ url: `/api/business-image/${img.id}`, alt: "", type: "gallery" });
      }
      photosByBiz.set(businessId, list);
    }

    // Uploaded logos go first so a freshly uploaded logo is the one the
    // public listing shows.
    for (const [businessId, imageId] of uploadedLogos) {
      const list = photosByBiz.get(businessId) ?? [];
      list.unshift({
        url: `/api/business-image/${imageId}`,
        alt: "",
        type: "logo",
      });
      photosByBiz.set(businessId, list);
    }
  }

  const [[catRows, locRows], coordsByBiz] = await Promise.all([
    taxonomyQuery,
    coordsQuery,
  ]);
  const prettify = (slug: string) =>
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const catLabel = new Map(catRows.map((c) => [c.slug, c.displayName]));
  const locLabel = new Map(locRows.map((l) => [l.slug, l.displayName]));

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
    claimed: r.userId !== null && r.userId !== undefined,
    // Legacy directory.php features on is_featured OR paid placement;
    // plan_type mirrors the paid tiers the admin assigns.
    isFeatured:
      !!r.isFeatured || r.planType === "featured" || r.planType === "elite",
    // show_hours is the legacy admin's per-listing toggle. Null means it
    // was never touched, and hours that exist should show, so only an
    // explicit false hides them. An empty week stays undefined rather
    // than rendering an "Hours" heading with nothing under it.
    hours:
      r.showHours === false || !hoursByBiz.get(r.id)?.length
        ? undefined
        : hoursByBiz.get(r.id),
    offer: offersByBiz.get(r.id)
      ? {
          title: offersByBiz.get(r.id)!.title,
          description: offersByBiz.get(r.id)!.description || undefined,
        }
      : undefined,
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
    tags: tagsByBiz.get(r.id),
    lat:
      coordsByBiz.get(r.id)?.lat ??
      (r.latitude != null ? Number(r.latitude) : undefined),
    lng:
      coordsByBiz.get(r.id)?.lng ??
      (r.longitude != null ? Number(r.longitude) : undefined),
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
      tags: uniq(SAMPLE.flatMap((b) => b.tags?.map((t) => t.name) ?? [])).map(
        (name) => ({ name, slug: slugify(name) }),
      ),
    };
  }
  try {
    const { db } = await import("@/lib/db");
    const { categories, locations, tags } = await import("@/lib/db/schema-legacy");
    const { asc, eq } = await import("drizzle-orm");
    const [cats, locs, tagRows] = await Promise.all([
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
      db
        .select()
        .from(tags)
        .where(eq(tags.isActive, true))
        .orderBy(asc(tags.displayOrder)),
    ]);
    return {
      categories: cats.map((c) => ({ name: c.displayName, slug: c.slug })),
      locations: locs.map((l) => ({ name: l.displayName, slug: l.slug })),
      tags: tagRows.map((t) => ({ name: t.displayName, slug: t.slug })),
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
      tags: [] as { name: string; slug: string }[],
    };
  }
}
