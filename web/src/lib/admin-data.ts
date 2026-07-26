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
  createdAt: string | null;
};

const bool = (v: unknown) => v === 1 || v === true || v === "1";

export async function getAdminBusinesses(search = ""): Promise<AdminBusiness[]> {
  const { db } = await import("@/lib/db");
  const term = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
  const rows = search
    ? ((await db.execute(
        sql`SELECT id, slug, business_name, category, location_area, city, phone, email,
                   website, description, plan_type, is_featured, is_verified, is_hidden, created_at
            FROM directory_businesses
            WHERE business_name LIKE ${term} OR slug LIKE ${term} OR email LIKE ${term}
            ORDER BY business_name LIMIT 300`,
      )) as unknown as [Record<string, unknown>[]])
    : ((await db.execute(
        sql`SELECT id, slug, business_name, category, location_area, city, phone, email,
                   website, description, plan_type, is_featured, is_verified, is_hidden, created_at
            FROM directory_businesses ORDER BY business_name LIMIT 300`,
      )) as unknown as [Record<string, unknown>[]]);

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
    createdAt: r.created_at ? String(r.created_at) : null,
  }));
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
};

export async function updateBusiness(id: number, patch: BusinessPatch) {
  const { db } = await import("@/lib/db");
  const sets = [];
  for (const [key, column] of Object.entries(COLUMNS)) {
    const value = patch[key as keyof BusinessPatch];
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
  featuredImage: string | null;
  categoryId: number | null;
  status: string;
  publishedAt: string | null;
};

export async function getAdminPosts(): Promise<AdminPost[]> {
  const { db } = await import("@/lib/db");
  const { blogPosts } = await import("@/lib/db/schema-legacy");
  const { desc } = await import("drizzle-orm");
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

export async function getAdminOrders(): Promise<Record<string, unknown>[]> {
  const { db } = await import("@/lib/db");
  for (const table of ["card_orders", "postcard_orders"]) {
    try {
      const rows = (await db.execute(
        sql.raw(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 200`),
      )) as unknown as [Record<string, unknown>[]];
      if (Array.isArray(rows[0])) {
        return rows[0].map((r) => ({ ...r, __table: table }));
      }
    } catch {
      // table absent on this install; try the next shape
    }
  }
  return [];
}
