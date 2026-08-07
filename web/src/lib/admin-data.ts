import "server-only";
import { sql } from "drizzle-orm";

/**
 * Admin data layer. These read and write the same MySQL tables the
 * legacy PHP admin uses, so both admins stay interchangeable until the
 * old one is retired.
 *
 * Queries use raw SQL where the legacy schema is created at runtime by
 * the PHP side (site_stats, directory_signups): column sets vary by
 * install, so SELECT * plus defensive reads beat a brittle mapping.
 */

/**
 * Status, exactly as the legacy admin derived it: unverified means it is
 * waiting for review, hidden trumps active, and everything else that is
 * verified and active is live.
 */
export type BusinessStatus = "pending" | "active" | "hidden" | "inactive";

export const businessStatus = (b: {
  isVerified: boolean;
  isActive: boolean;
  isHidden: boolean;
}): BusinessStatus =>
  !b.isVerified ? "pending" : b.isHidden ? "hidden" : b.isActive ? "active" : "inactive";

export type AdminBusiness = {
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
  isHidden: boolean;
  isActive: boolean;
  views: number;
  inquiries: number;
  /** Primary photo, so a listing is recognisable at a glance in the list. */
  logoUrl: string | null;
  createdAt: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
};

const bool = (v: unknown) => v === 1 || v === true || v === "1";

export async function getAdminBusinesses(search = ""): Promise<AdminBusiness[]> {
  const { db } = await import("@/lib/db");
  const term = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
  const rows = search
    ? ((await db.execute(
        sql`SELECT id, slug, business_name, category, location_area, city, phone, email,
                   website, description, plan_type, is_featured, is_verified, is_hidden,
                   is_active, views_count, inquiries_count, created_at,
                   facebook_url, instagram_url, tiktok_url, youtube_url
            FROM directory_businesses
            WHERE business_name LIKE ${term} OR slug LIKE ${term} OR email LIKE ${term}
            ORDER BY business_name LIMIT 500`,
      )) as unknown as [Record<string, unknown>[]])
    : ((await db.execute(
        sql`SELECT id, slug, business_name, category, location_area, city, phone, email,
                   website, description, plan_type, is_featured, is_verified, is_hidden,
                   is_active, views_count, inquiries_count, created_at,
                   facebook_url, instagram_url, tiktok_url, youtube_url
            FROM directory_businesses ORDER BY business_name LIMIT 500`,
      )) as unknown as [Record<string, unknown>[]]);

  // One query for the primary photo of everything on the page, rather
  // than one per row.
  const ids = (rows[0] ?? []).map((r) => Number(r.id)).filter(Boolean);
  const logos = new Map<number, string>();
  if (ids.length > 0) {
    try {
      // Same path the public directory builds. Getting this wrong is
      // silent: every thumbnail 404s and the column just looks empty.
      const base =
        (
          process.env.UPLOADS_BASE_URL ??
          "https://www.lowcountrybusinessspotlight.com/uploads"
        ).replace(/\/$/, "") + "/business_photos";
      const photoRows = (await db.execute(
        sql`SELECT business_id, filename
            FROM directory_business_photos
            WHERE business_id IN (${sql.join(
              ids.map((id) => sql`${id}`),
              sql`, `,
            )})
            ORDER BY is_primary DESC, sort_order ASC, id ASC`,
      )) as unknown as [Record<string, unknown>[]];
      for (const p of photoRows[0] ?? []) {
        const id = Number(p.business_id);
        if (!p.filename || logos.has(id)) continue;
        // The upload script also writes a resized copy under medium/,
        // which is the right size for a 36px cell: the originals run to
        // 100KB and this is a list of 85 of them.
        logos.set(id, `${base}/medium/${String(p.filename).replace(/^\//, "")}`);
      }
    } catch (e) {
      // A listing without a thumbnail is a cosmetic loss, not a failure.
      console.error("[admin] listing photos read failed:", e);
    }

    // Anything uploaded here wins over the legacy file. The old photos
    // live on the PHP server's disk, which this app cannot write to, so
    // a newly uploaded logo would otherwise be stored and then never
    // shown.
    const { getBusinessImageIds } = await import("@/lib/business-images");
    for (const [id, imageId] of await getBusinessImageIds(ids)) {
      logos.set(id, `/api/business-image/${imageId}`);
    }
  }

  return (rows[0] ?? []).map((r) => ({
    id: Number(r.id),
    slug: String(r.slug ?? ""),
    name: String(r.business_name ?? ""),
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
    isHidden: bool(r.is_hidden),
    isActive: bool(r.is_active),
    // The legacy views_count is deliberately not used. It was written by
    // the PHP site, stopped moving when traffic came here, and its value
    // is whatever had accumulated by then. Filled from lbs_listing_views
    // by the caller instead, which counts real visits and can say when
    // it started.
    views: 0,
    inquiries: Number(r.inquiries_count ?? 0),
    logoUrl: logos.get(Number(r.id)) ?? null,
    createdAt: r.created_at ? String(r.created_at) : null,
    facebookUrl: (r.facebook_url as string) ?? null,
    instagramUrl: (r.instagram_url as string) ?? null,
    tiktokUrl: (r.tiktok_url as string) ?? null,
    youtubeUrl: (r.youtube_url as string) ?? null,
  }));
}

/**
 * The row actions the legacy admin had, with its exact semantics:
 * approving only sets verified, hiding and activating are toggles, and
 * denying removes the listing outright.
 */
export async function businessAction(
  id: number,
  action:
    | "approve"
    | "deny"
    | "toggle_hidden"
    | "toggle_active"
    | "toggle_featured"
    | "ads_auto"
    | "ads_on"
    | "ads_off"
    | "delete",
  opts: { reason?: string; by?: string } = {},
) {
  const { db } = await import("@/lib/db");
  switch (action) {
    case "approve": {
      await db.execute(
        sql`UPDATE directory_businesses SET is_verified = 1, is_active = 1 WHERE id = ${id}`,
      );
      // An approval after a rejection is a second look that went the
      // other way, so the rejection goes with it.
      const { clearRejected } = await import("@/lib/listing-review");
      await clearRejected(id).catch(() => {});
      // Told, at last. A free listing used to go live in silence, so the
      // only way to find out was to go and look.
      await notifyListing(id, "approved").catch((e) =>
        console.error("[admin] approval email failed:", e),
      );
      return;
    }
    case "toggle_hidden":
      await db.execute(
        sql`UPDATE directory_businesses SET is_hidden = NOT is_hidden WHERE id = ${id}`,
      );
      return;
    case "toggle_active":
      await db.execute(
        sql`UPDATE directory_businesses SET is_active = NOT is_active WHERE id = ${id}`,
      );
      return;
    case "toggle_featured":
      await db.execute(
        sql`UPDATE directory_businesses SET is_featured = NOT is_featured WHERE id = ${id}`,
      );
      return;
    // Advertising on this one listing, set by hand. Separate from
    // Featured because Featured is also used editorially: a listing
    // marked Featured to promote it should still be able to carry ads,
    // and a listing that is not Featured should still be able to refuse
    // them.
    case "ads_auto":
    case "ads_on":
    case "ads_off": {
      const { setAdsOverride } = await import("@/lib/ads");
      await setAdsOverride(
        id,
        action === "ads_auto" ? null : action === "ads_on",
      );
      return;
    }
    case "deny": {
      // Kept, not deleted. A rejection that removes the row leaves no
      // record it happened, no reason and nothing to tell the business,
      // so a real shop with a thin description got the same treatment as
      // spam and no answer if they asked why.
      //
      // Unverified and inactive keeps it off the public site exactly as
      // deleting did; the difference is that it can be explained and, if
      // they put it right, approved.
      await db.execute(
        sql`UPDATE directory_businesses SET is_verified = 0, is_active = 0
            WHERE id = ${id}`,
      );
      const { markRejected } = await import("@/lib/listing-review");
      await markRejected(id, opts.reason ?? "", opts.by ?? "");
      await notifyListing(id, "rejected", opts.reason ?? "").catch((e) =>
        console.error("[admin] rejection email failed:", e),
      );
      return;
    }
    case "delete":
      // Still a real delete, and now genuinely different from denying.
      await db.execute(sql`DELETE FROM directory_businesses WHERE id = ${id}`);
      return;
  }
}

/**
 * Emails the business about its own listing.
 *
 * The address and slug are read here rather than passed in, because the
 * only thing every caller has is the id and one lookup is cheaper than
 * threading two more arguments through a bulk action.
 */
async function notifyListing(
  id: number,
  outcome: "approved" | "rejected",
  reason = "",
): Promise<void> {
  const { db } = await import("@/lib/db");
  const rows = (await db.execute(
    sql`SELECT business_name, email, slug FROM directory_businesses
        WHERE id = ${id} LIMIT 1`,
  )) as unknown as [
    { business_name: string; email: string | null; slug: string }[],
  ];
  const r = rows[0]?.[0];
  if (!r?.email) return;

  const facts = {
    businessName: String(r.business_name ?? ""),
    email: String(r.email),
    slug: String(r.slug ?? ""),
  };
  const emails = await import("@/lib/listing-status-emails");
  if (outcome === "approved") await emails.sendListingApproved(facts);
  else await emails.sendListingRejected({ ...facts, reason });
}

export type BusinessPatch = {
  name?: string;
  category?: string;
  locationArea?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  planType?: string;
  isFeatured?: boolean;
  isVerified?: boolean;
  isHidden?: boolean;
  isActive?: boolean;
  // Columns the legacy admin has always written and the public page
  // already renders, but which nothing in this app could set until the
  // advertiser portal needed them.
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  showHours?: boolean;
};

/** Column whitelist: patch keys can never reach SQL directly. */
const COLUMNS: Record<keyof BusinessPatch, string> = {
  name: "business_name",
  category: "category",
  locationArea: "location_area",
  city: "city",
  phone: "phone",
  email: "email",
  website: "website",
  description: "description",
  planType: "plan_type",
  isFeatured: "is_featured",
  isVerified: "is_verified",
  isHidden: "is_hidden",
  isActive: "is_active",
  facebookUrl: "facebook_url",
  instagramUrl: "instagram_url",
  tiktokUrl: "tiktok_url",
  youtubeUrl: "youtube_url",
  showHours: "show_hours",
};

/**
 * Add a listing by hand.
 *
 * Until now the only ways a business could enter the directory were the
 * public signup form, which creates a request rather than a listing, and
 * the bulk CSV import. Neither covers the ordinary case: an advertiser
 * comes aboard and needs a listing today.
 */
export async function createBusiness(input: BusinessPatch & { name: string }) {
  const { db } = await import("@/lib/db");
  const name = input.name.trim();
  if (!name) throw new Error("A business name is required");

  const base =
    name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 180) || "business";

  // Slugs are the listing's URL, so a clash has to be resolved rather
  // than left to fail at insert time.
  const taken = (await db.execute(
    sql`SELECT slug FROM directory_businesses WHERE slug LIKE ${`${base}%`}`,
  )) as unknown as [{ slug: string }[]];
  const existing = new Set((taken[0] ?? []).map((r) => String(r.slug)));
  let slug = base;
  for (let n = 2; existing.has(slug); n++) slug = `${base}-${n}`;

  const value = (v: string | boolean | undefined) =>
    v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v;

  await db.execute(sql`
    INSERT INTO directory_businesses
      (business_name, slug, category, location_area, city, state, phone, email,
       website, description, plan_type, is_featured, is_verified, is_hidden,
       is_active, created_at)
    VALUES
      (${name}, ${slug}, ${value(input.category)}, ${value(input.locationArea)},
       ${value(input.city)}, 'SC', ${value(input.phone)}, ${value(input.email)},
       ${value(input.website)}, ${value(input.description)},
       ${input.planType ?? "basic"}, ${input.isFeatured ? 1 : 0},
       ${input.isVerified ? 1 : 0}, ${input.isHidden ? 1 : 0}, 1, NOW())
  `);

  const rows = (await db.execute(
    sql`SELECT LAST_INSERT_ID() AS id`,
  )) as unknown as [{ id: number }[]];
  return { id: Number((rows[0] ?? [])[0]?.id ?? 0), slug };
}

/**
 * Fields that end up in an href on a public page.
 *
 * Somebody typing "facebook.com/joesbbq" is the normal case, and stored
 * as typed it makes a link that resolves against our own domain. The
 * portal has always tidied these on the way in; the admin writes the
 * same columns and needs the same treatment.
 */
const URL_FIELDS = [
  "website",
  "facebookUrl",
  "instagramUrl",
  "tiktokUrl",
  "youtubeUrl",
] as const satisfies readonly (keyof BusinessPatch)[];

export class InvalidPatch extends Error {}

export async function updateBusiness(id: number, patch: BusinessPatch) {
  const { db } = await import("@/lib/db");
  const { normalizeUrl } = await import("@/lib/listing-edits");
  const clean: BusinessPatch = { ...patch };
  for (const field of URL_FIELDS) {
    const raw = clean[field];
    if (typeof raw !== "string") continue;
    const url = normalizeUrl(raw);
    if (url === null) {
      throw new InvalidPatch(`That ${field === "website" ? "website" : "link"} does not look like a web address.`);
    }
    clean[field] = url;
  }

  const sets = [];
  for (const [key, column] of Object.entries(COLUMNS)) {
    const value = clean[key as keyof BusinessPatch];
    if (value === undefined) continue;
    const stored = typeof value === "boolean" ? (value ? 1 : 0) : value;
    sets.push(sql`${sql.raw(`\`${column}\``)} = ${stored}`);
  }
  if (sets.length === 0) return { updated: 0 };
  await db.execute(
    sql`UPDATE directory_businesses SET ${sql.join(sets, sql`, `)} WHERE id = ${id}`,
  );
  return { updated: 1 };
}

/* ---------- homepage stats bar (site_stats) ---------- */

export type SiteStat = {
  id: number;
  key: string;
  value: string;
  label: string;
  icon: string;
  order: number;
  active: boolean;
};

export async function getSiteStats(): Promise<SiteStat[]> {
  const { db } = await import("@/lib/db");
  try {
    const rows = (await db.execute(
      sql`SELECT * FROM site_stats ORDER BY display_order, id`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map((r) => ({
      id: Number(r.id),
      key: String(r.stat_key ?? ""),
      value: String(r.stat_value ?? ""),
      label: String(r.stat_label ?? ""),
      icon: String(r.stat_icon ?? ""),
      order: Number(r.display_order ?? 0),
      active: bool(r.is_active),
    }));
  } catch (e) {
    console.error("[admin] site_stats read failed:", e);
    return [];
  }
}

export async function saveSiteStat(stat: {
  id?: number;
  key: string;
  value: string;
  label: string;
  icon?: string;
  order?: number;
  active?: boolean;
}) {
  const { db } = await import("@/lib/db");
  const icon = stat.icon ?? "";
  const order = stat.order ?? 0;
  const active = stat.active === false ? 0 : 1;
  if (stat.id) {
    await db.execute(
      sql`UPDATE site_stats SET stat_key = ${stat.key}, stat_value = ${stat.value},
          stat_label = ${stat.label}, stat_icon = ${icon},
          display_order = ${order}, is_active = ${active} WHERE id = ${stat.id}`,
    );
    return { id: stat.id };
  }
  await db.execute(
    sql`INSERT INTO site_stats (stat_key, stat_value, stat_label, stat_icon, display_order, is_active)
        VALUES (${stat.key}, ${stat.value}, ${stat.label}, ${icon}, ${order}, ${active})
        ON DUPLICATE KEY UPDATE stat_value = VALUES(stat_value), stat_label = VALUES(stat_label),
        stat_icon = VALUES(stat_icon), display_order = VALUES(display_order), is_active = VALUES(is_active)`,
  );
  return { id: 0 };
}

export async function deleteSiteStat(id: number) {
  const { db } = await import("@/lib/db");
  await db.execute(sql`DELETE FROM site_stats WHERE id = ${id}`);
}

/* ---------- editable settings (pricing overrides) ---------- */

/**
 * Key/value store for values that used to live in pricing_config.php.
 * Created on demand from admin writes only, never from a public path.
 */
async function ensureSettingsTable() {
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_settings (
      setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
      setting_value MEDIUMTEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const { db } = await import("@/lib/db");
  try {
    const rows = (await db.execute(
      sql`SELECT setting_value FROM lbs_settings WHERE setting_key = ${key}`,
    )) as unknown as [{ setting_value: string }[]];
    const raw = rows[0]?.[0]?.setting_value;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // Table not created yet: fall back to code defaults.
    return null;
  }
}

export async function saveSetting(key: string, value: unknown) {
  const { db } = await import("@/lib/db");
  await ensureSettingsTable();
  const json = JSON.stringify(value);
  await db.execute(
    sql`INSERT INTO lbs_settings (setting_key, setting_value) VALUES (${key}, ${json})
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
  );
}

/* ---------- directory signups queue ---------- */

export async function getDirectorySignups(): Promise<Record<string, unknown>[]> {
  const { db } = await import("@/lib/db");
  try {
    const rows = (await db.execute(
      sql`SELECT * FROM directory_signups ORDER BY id DESC LIMIT 200`,
    )) as unknown as [Record<string, unknown>[]];
    return rows[0] ?? [];
  } catch (e) {
    console.error("[admin] directory_signups read failed:", e);
    return [];
  }
}

/* ---------- inquiries ---------- */

export async function getInquiries(): Promise<Record<string, unknown>[]> {
  const { db } = await import("@/lib/db");
  try {
    const rows = (await db.execute(
      sql`SELECT i.*, b.business_name, b.slug
          FROM directory_business_inquiries i
          LEFT JOIN directory_businesses b ON b.id = i.business_id
          ORDER BY i.id DESC LIMIT 200`,
    )) as unknown as [Record<string, unknown>[]];
    return rows[0] ?? [];
  } catch (e) {
    console.error("[admin] inquiries read failed:", e);
    return [];
  }
}

/* ---------- blog ---------- */

export type AdminPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  metaDescription: string | null;
  /** Exactly what the column holds: a legacy filename or a serving path. */
  featuredImage: string | null;
  /**
   * The same value resolved to something an img tag can load, so the
   * editor can preview a post's image without knowing which of the two
   * kinds it is.
   */
  featuredImageUrl: string | null;
  categoryId: number | null;
  status: string;
  publishedAt: string | null;
};

export async function getAdminPosts(): Promise<AdminPost[]> {
  const { db } = await import("@/lib/db");
  const { blogPosts } = await import("@/lib/db/schema-legacy");
  const { desc } = await import("drizzle-orm");
  const { resolveBlogImageUrl } = await import("@/lib/blog-images");
  const rows = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.id))
    .limit(300);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt ?? null,
    content: r.content ?? null,
    metaDescription: r.metaDescription ?? null,
    featuredImage: r.featuredImage ?? null,
    featuredImageUrl: resolveBlogImageUrl(r.featuredImage) ?? null,
    categoryId: r.categoryId ?? null,
    status: r.status ?? "draft",
    publishedAt: r.publishedAt ? String(r.publishedAt) : null,
  }));
}

export async function getAdminPost(id: number): Promise<AdminPost | null> {
  const all = await getAdminPosts();
  return all.find((p) => p.id === id) ?? null;
}

export type PostPatch = Partial<
  Pick<
    AdminPost,
    | "title"
    | "slug"
    | "excerpt"
    | "content"
    | "metaDescription"
    | "featuredImage"
    | "status"
  >
>;

const POST_COLUMNS: Record<keyof PostPatch, string> = {
  title: "title",
  slug: "slug",
  excerpt: "excerpt",
  content: "content",
  metaDescription: "meta_description",
  // Either a legacy filename or the serving path of an uploaded image.
  // Stored verbatim, since resolveBlogImageUrl is what reads it back and
  // rewriting it here would strand every post written before uploads.
  featuredImage: "featured_image",
  status: "status",
};

export async function savePost(id: number | null, patch: PostPatch) {
  const { db } = await import("@/lib/db");
  if (id) {
    const sets = [];
    for (const [key, column] of Object.entries(POST_COLUMNS)) {
      const value = patch[key as keyof PostPatch];
      if (value === undefined) continue;
      sets.push(sql`${sql.raw(`\`${column}\``)} = ${value}`);
    }
    // Publishing for the first time stamps the date the public site sorts by.
    if (patch.status === "published") {
      sets.push(sql`published_at = COALESCE(published_at, NOW())`);
    }
    if (sets.length === 0) return { id };
    await db.execute(
      sql`UPDATE directory_blog_posts SET ${sql.join(sets, sql`, `)} WHERE id = ${id}`,
    );
    return { id };
  }
  const published = patch.status === "published";
  await db.execute(
    sql`INSERT INTO directory_blog_posts
        (title, slug, excerpt, content, meta_description, featured_image, status, published_at, created_at)
        VALUES (${patch.title ?? "Untitled"}, ${patch.slug ?? ""}, ${patch.excerpt ?? ""},
                ${patch.content ?? ""}, ${patch.metaDescription ?? ""}, ${patch.featuredImage ?? ""},
                ${patch.status ?? "draft"}, ${published ? sql`NOW()` : null}, NOW())`,
  );
  return { id: 0 };
}

/* ---------- signups ---------- */

export async function setSignupStatus(id: number, status: string) {
  const allowed = ["pending", "approved", "rejected"];
  if (!allowed.includes(status)) throw new Error("Unknown status");
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`UPDATE directory_signups SET status = ${status} WHERE id = ${id}`,
  );
}

/* ---------- orders ---------- */

export type AdminOrder = {
  id: number;
  status: string;
  amountCents: number;
  customer: string;
  email: string;
  cardName: string;
  spotName: string;
  categoryName: string;
  createdAt: string | null;
  printDeadline: string | null;
  adminApproved: boolean | null;
  hasArtwork: boolean;
};

/**
 * Mirrors admin/card_orders.php: the same joins across orders, cards,
 * spot types, users, ad content, and categories. Table names carry the
 * legacy directory_ prefix.
 */
export async function getAdminOrders(): Promise<AdminOrder[]> {
  const { db } = await import("@/lib/db");
  try {
    const rows = (await db.execute(
      sql`SELECT o.id, o.status, o.amount_cents, o.created_at,
                 u.first_name, u.last_name, u.email,
                 c.neighborhood_name, c.print_deadline,
                 st.name AS spot_name, st.dimensions,
                 cc.name AS category_name,
                 ac.admin_approved, ac.logo_filename
          FROM directory_card_orders o
          JOIN directory_cards c ON c.id = o.card_id
          JOIN directory_card_spot_types st ON st.id = o.spot_type_id
          JOIN directory_users u ON u.id = o.user_id
          LEFT JOIN directory_card_ad_content ac ON ac.order_id = o.id
          LEFT JOIN directory_card_categories cc ON cc.id = o.card_category_id
          ORDER BY o.created_at DESC
          LIMIT 200`,
    )) as unknown as [Record<string, unknown>[]];

    return (rows[0] ?? []).map((r) => ({
      id: Number(r.id),
      status: String(r.status ?? "pending"),
      amountCents: Number(r.amount_cents ?? 0),
      customer: [r.first_name, r.last_name].filter(Boolean).join(" ").trim(),
      email: String(r.email ?? ""),
      cardName: String(r.neighborhood_name ?? ""),
      spotName: [r.spot_name, r.dimensions].filter(Boolean).join(" "),
      categoryName: String(r.category_name ?? ""),
      createdAt: r.created_at ? String(r.created_at) : null,
      printDeadline: r.print_deadline ? String(r.print_deadline) : null,
      adminApproved:
        r.admin_approved === null || r.admin_approved === undefined
          ? null
          : bool(r.admin_approved),
      hasArtwork: !!r.logo_filename,
    }));
  } catch (e) {
    console.error("[admin] orders query failed:", e);
    return [];
  }
}

/* ---------- leads ---------- */

export type AdminLead = {
  id: number;
  company: string;
  contact: string;
  email: string;
  phone: string;
  location: string;
  interest: string;
  createdAt: string | null;
};

/**
 * Mirrors admin/leads.php, reading the same leads table.
 *
 * The table is `leads`, with no prefix. This read used to say
 * `directory_leads`, which does not exist: both capture paths,
 * process_form.php and save-quiz-lead.php, insert into `leads`, and the
 * legacy dashboard counts `leads`. The missing table threw, the catch
 * returned an empty array, and the page reported "No leads captured
 * yet" however many had come in.
 */
export async function getAdminLeads(): Promise<AdminLead[]> {
  const { db } = await import("@/lib/db");
  try {
    const rows = (await db.execute(
      sql`SELECT id, company_name, contact_name, email, phone, location,
                 package_description, created_at
          FROM leads
          ORDER BY created_at DESC
          LIMIT 200`,
    )) as unknown as [Record<string, unknown>[]];

    return (rows[0] ?? []).map((r) => ({
      id: Number(r.id),
      company: String(r.company_name ?? ""),
      contact: String(r.contact_name ?? ""),
      email: String(r.email ?? ""),
      phone: String(r.phone ?? ""),
      location: String(r.location ?? ""),
      interest: String(r.package_description ?? ""),
      createdAt: r.created_at ? String(r.created_at) : null,
    }));
  } catch (e) {
    console.error("[admin] leads query failed:", e);
    return [];
  }
}

/**
 * Removes leads outright, matching admin/leads.php, which has always
 * done a hard DELETE behind a confirm.
 *
 * Safe to be blunt about because the lead was pushed to GoHighLevel at
 * capture time by process_form.php and save-quiz-lead.php. This table
 * is the local copy, so deleting a row here does not lose the contact.
 */
export async function deleteLeads(ids: number[]): Promise<number> {
  const clean = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (clean.length === 0) return 0;
  try {
    const { db } = await import("@/lib/db");
    const result = (await db.execute(
      sql`DELETE FROM leads WHERE id IN (${sql.join(
        clean.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )) as unknown as [{ affectedRows?: number }];
    return result[0]?.affectedRows ?? 0;
  } catch (e) {
    console.error("[admin] could not delete leads:", e);
    return 0;
  }
}

/* ---------- advertiser accounts ---------- */

export type AdminUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string | null;
  listings: string[];
  /** Null means never, which is also what it means for everybody until
   *  they next sign in: nothing was recorded before this existed. */
  lastLogin: string | null;
  /** Any authenticated page view since, recorded hourly at most. */
  lastSeen: string | null;
  loginCount: number;
};

export async function getAdminUsers(search = ""): Promise<AdminUser[]> {
  const { db } = await import("@/lib/db");
  const term = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
  const where = search ? sql`WHERE u.email LIKE ${term}` : sql``;
  const rows = (await db.execute(
    sql`SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.created_at,
               GROUP_CONCAT(b.business_name SEPARATOR '||') AS listings
        FROM directory_users u
        LEFT JOIN directory_businesses b ON b.user_id = u.id
        ${where}
        GROUP BY u.id
        ORDER BY u.id DESC
        LIMIT 200`,
  )) as unknown as [Record<string, unknown>[]];

  const base = (rows[0] ?? []).map((r) => ({
    id: Number(r.id),
    email: String(r.email ?? ""),
    firstName: String(r.first_name ?? ""),
    lastName: String(r.last_name ?? ""),
    isActive: bool(r.is_active),
    createdAt: r.created_at ? String(r.created_at) : null,
    listings: r.listings ? String(r.listings).split("||").filter(Boolean) : [],
  }));

  // A second query rather than a join, because the activity lives in our
  // own table and directory_users belongs to the legacy site. Keeping
  // the two apart is what lets this exist at all.
  const { activityFor } = await import("@/lib/user-activity");
  const activity = await activityFor(base.map((u) => u.email));

  return base.map((u) => {
    const a = activity.get(u.email.toLowerCase());
    return {
      ...u,
      lastLogin: a?.lastLogin ?? null,
      lastSeen: a?.lastSeen ?? null,
      loginCount: a?.loginCount ?? 0,
    };
  });
}

/**
 * Sets an advertiser's password to a value the admin chose. Hashed with
 * bcrypt at the same cost PHP uses, so the legacy site accepts it too.
 * The plaintext is never stored or logged; it is shown once in the UI.
 */
export async function setUserPassword(id: number, password: string) {
  const bcrypt = (await import("bcryptjs")).default;
  const { db } = await import("@/lib/db");
  const hash = await bcrypt.hash(password, 12);
  await db.execute(
    sql`UPDATE directory_users SET password_hash = ${hash} WHERE id = ${id}`,
  );
}

export async function setUserActive(id: number, active: boolean) {
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`UPDATE directory_users SET is_active = ${active ? 1 : 0} WHERE id = ${id}`,
  );
}

export type DeleteUserResult =
  | { ok: true; unlinkedListings: number }
  | { ok: false; reason: string };

/**
 * Removes an advertiser account.
 *
 * Refused outright when the account has neighborhood card orders.
 * directory_card_orders.user_id is NOT NULL and getAdminOrders joins
 * directory_users with an inner JOIN, so deleting the account does not
 * just orphan the orders, it removes them from the Orders page and from
 * the revenue the admin reports. Somebody's paid history would silently
 * stop existing. Disabling is the right answer there and the error says
 * so.
 *
 * Listings are unlinked rather than deleted. A directory listing is
 * public content that stands on its own: most of them were created
 * without an owner in the first place, and the account going away is no
 * reason for the business to disappear from the directory.
 *
 * Login codes go with the account, since leaving a live code behind
 * would let somebody sign in to a login that no longer exists.
 */
export async function deleteUser(id: number): Promise<DeleteUserResult> {
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, reason: "That is not a valid account." };
  }
  try {
    const { db } = await import("@/lib/db");

    const userRows = (await db.execute(
      sql`SELECT email FROM directory_users WHERE id = ${id} LIMIT 1`,
    )) as unknown as [{ email: string }[]];
    const user = userRows[0]?.[0];
    if (!user) return { ok: false, reason: "That account no longer exists." };

    const orderRows = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM directory_card_orders WHERE user_id = ${id}`,
    )) as unknown as [{ n: number }[]];
    const orders = Number(orderRows[0]?.[0]?.n ?? 0);
    if (orders > 0) {
      return {
        ok: false,
        reason:
          `This account has ${orders} card order${orders === 1 ? "" : "s"}. ` +
          "Deleting it would remove them from the Orders page and from " +
          "revenue totals. Set the account inactive instead.",
      };
    }

    const unlink = (await db.execute(
      sql`UPDATE directory_businesses SET user_id = NULL WHERE user_id = ${id}`,
    )) as unknown as [{ affectedRows?: number }];

    // Best effort: the table is created on first use, so it may not exist.
    try {
      await db.execute(
        sql`DELETE FROM lbs_login_codes WHERE email = ${user.email}`,
      );
    } catch {
      /* no codes table yet */
    }

    await db.execute(sql`DELETE FROM directory_users WHERE id = ${id}`);
    return { ok: true, unlinkedListings: unlink[0]?.affectedRows ?? 0 };
  } catch (e) {
    console.error("[admin] could not delete user:", e);
    return { ok: false, reason: "That account could not be deleted." };
  }
}

/** Links a listing to a login so the portal can show "your listing". */
export async function linkListingToUser(businessId: number, userId: number | null) {
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`UPDATE directory_businesses SET user_id = ${userId} WHERE id = ${businessId}`,
  );
}

/**
 * Creates a portal login for an advertiser who has never signed in.
 *
 * Most advertisers arrived by phone or in person, so they have a
 * listing and card history but no login, which means no portal and
 * nothing to view as. This is how one gets made without setting a
 * password on their behalf or emailing them.
 *
 * Any listing already carrying that email is linked to the new login on
 * the way through. The portal can find a listing by email alone, but
 * user_id is the reliable join and email is the fallback; leaving it
 * unlinked keeps a real relationship resting on a heuristic.
 */
export async function createLoginForEmail(input: {
  email: string;
  firstName?: string;
  lastName?: string;
}): Promise<
  | { ok: true; id: number; created: boolean; linkedListings: number }
  | { ok: false; error: string }
> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "That is not a valid email address." };
  }

  const { db } = await import("@/lib/db");
  try {
    const existing = (await db.execute(
      sql`SELECT id FROM directory_users WHERE email = ${email} LIMIT 1`,
    )) as unknown as [{ id: number }[]];
    let id = existing[0]?.[0]?.id ?? 0;
    const created = !id;

    if (!id) {
      // Unusable by design: bcrypt can never match it, so the account
      // exists and codes work while password sign-in stays closed until
      // the owner chooses one.
      const unusable = `$2a$12$${".".repeat(53)}`;
      await db.execute(
        sql`INSERT INTO directory_users (email, password_hash, first_name, last_name, is_active)
            VALUES (${email}, ${unusable}, ${input.firstName?.trim() ?? ""},
                    ${input.lastName?.trim() ?? ""}, 1)`,
      );
      const row = (await db.execute(
        sql`SELECT id FROM directory_users WHERE email = ${email} ORDER BY id DESC LIMIT 1`,
      )) as unknown as [{ id: number }[]];
      id = row[0]?.[0]?.id ?? 0;
      if (!id) return { ok: false, error: "The account could not be created." };
    }

    const linked = (await db.execute(
      sql`UPDATE directory_businesses SET user_id = ${id}
          WHERE email = ${email} AND (user_id IS NULL OR user_id = 0)`,
    )) as unknown as [{ affectedRows?: number }];

    return {
      ok: true,
      id,
      created,
      linkedListings: linked[0]?.affectedRows ?? 0,
    };
  } catch (e) {
    console.error("[admin] could not create login:", e);
    return { ok: false, error: "The account could not be created." };
  }
}
