import "server-only";
import { sql } from "drizzle-orm";
import { SITE_TZ } from "@/lib/events-types";
import {
  readMinutes,
  slugifyStory,
  type Story,
  type StoryBusiness,
  type StoryBusinessRole,
  type StoryKind,
  type StoryStatus,
} from "@/lib/stories-types";

/**
 * The editorial spine.
 *
 * One table for all five consumer pillars, because a Business
 * Spotlight, a Now Open, a Coming Soon, a New & Noteworthy and a Local
 * Guide differ by what they are about and which template draws them,
 * not by shape. Every one is a headline, a picture, some prose, a place
 * and usually a business.
 *
 * The two join tables are what make the flywheel mechanical rather than
 * a matter of remembering. A spotlight joined to Mount Pleasant and to
 * a roofer turns up on the Mount Pleasant page, on that roofer's
 * listing, on the roofing category page and in the next newsletter,
 * because of the joins rather than because somebody linked it four
 * times. That difference is what decides whether one story a week
 * survives past month two.
 *
 * A new table rather than columns bolted onto directory_blog_posts.
 * That table is shared with the old PHP site, the house rule since the
 * migration is that shared tables get rows and never columns, and a
 * side table would make every one of these joins awkward for ever.
 */

export type {
  Story,
  StoryBusiness,
  StoryBusinessRole,
  StoryKind,
  StoryStatus,
} from "@/lib/stories-types";
export {
  STORY_KINDS,
  STORY_STATUSES,
  kindEyebrow,
  kindLabel,
  readMinutes,
  slugifyStory,
} from "@/lib/stories-types";

const KINDS = new Set<string>([
  "spotlight",
  "now_open",
  "coming_soon",
  "noteworthy",
  "guide",
  "news",
]);
const STATUSES = new Set<string>([
  "draft",
  "scheduled",
  "published",
  "archived",
]);

let ready = false;

/** Created from admin writes only. Public reads tolerate its absence. */
async function ensureTables() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_stories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(200) NOT NULL UNIQUE,
      kind VARCHAR(24) NOT NULL DEFAULT 'news',
      title VARCHAR(300) NOT NULL,
      dek TEXT NULL,
      body_html MEDIUMTEXT NULL,
      hero_media_id INT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'draft',
      published_at DATETIME NULL,
      featured_rank INT NULL,
      sponsored TINYINT NOT NULL DEFAULT 0,
      sponsor_business_id INT NULL,
      meta_title VARCHAR(320) NULL,
      meta_description VARCHAR(400) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY status_pub (status, published_at),
      KEY kind_idx (kind)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  // Places are joined by slug rather than id, the same way a listing
  // records its area: a slug is fixed at creation here, so it is stable,
  // and it means a story can be filed against a place that is still only
  // in the code seed.
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_story_places (
      story_id INT NOT NULL,
      place_slug VARCHAR(80) NOT NULL,
      PRIMARY KEY (story_id, place_slug),
      KEY place_idx (place_slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_story_businesses (
      story_id INT NOT NULL,
      business_id INT NOT NULL,
      role VARCHAR(16) NOT NULL DEFAULT 'subject',
      PRIMARY KEY (story_id, business_id),
      KEY business_idx (business_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

/**
 * Strips the handful of things a rich text editor should never emit.
 *
 * The body is written by an admin through Tiptap, which produces a
 * closed set of tags and no scripting, and it renders the same way the
 * migrated blog HTML already does. This is not a substitute for that
 * trust; it is the cheap net under it, so that a body pasted in from
 * somewhere unexpected cannot put a script tag or an onclick on a public
 * page. Deliberately narrow: a general HTML sanitiser is a dependency
 * and a source of surprises about which formatting survives.
 */
export function cleanStoryHtml(html: string): string {
  return html
    .replace(/<\/?(script|style|iframe|object|embed|form)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

type Row = {
  id: number;
  slug: string;
  kind: string;
  title: string;
  dek: string | null;
  body_html: string | null;
  hero_media_id: number | null;
  status: string;
  published_at: unknown;
  featured_rank: number | null;
  sponsored: number | null;
  sponsor_business_id: number | null;
  meta_title: string | null;
  meta_description: string | null;
  updated_at?: unknown;
};

const isoDate = (d: unknown) => {
  const dt = d instanceof Date ? d : new Date(String(d ?? ""));
  return isNaN(dt.getTime()) ? "" : dt.toISOString();
};

const prettyDate = (d: unknown) => {
  const dt = d instanceof Date ? d : new Date(String(d ?? ""));
  return isNaN(dt.getTime())
    ? undefined
    : dt.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        // Same reason as events: publishing after 8pm here would
        // otherwise be dated tomorrow, because the server is in UTC.
        timeZone: SITE_TZ,
      });
};

const toStory = (r: Row): Story => ({
  id: Number(r.id),
  slug: String(r.slug),
  // A kind the code does not know would fall through every template
  // switch and render as nothing at all. "news" keeps it visible.
  kind: (KINDS.has(r.kind) ? r.kind : "news") as StoryKind,
  title: String(r.title ?? ""),
  dek: r.dek ?? "",
  bodyHtml: r.body_html ?? "",
  heroMediaId: r.hero_media_id ?? null,
  status: (STATUSES.has(r.status) ? r.status : "draft") as StoryStatus,
  publishedAt: isoDate(r.published_at),
  publishedLabel: prettyDate(r.published_at),
  featuredRank: r.featured_rank ?? null,
  sponsored: Number(r.sponsored) === 1,
  sponsorBusinessId: r.sponsor_business_id ?? null,
  metaTitle: r.meta_title ?? "",
  metaDescription: r.meta_description ?? "",
  places: [],
  businesses: [],
  updatedAt: prettyDate(r.updated_at),
});

/** Fills in the joins for a set of stories in two queries, not 2N. */
async function attachJoins(stories: Story[]): Promise<Story[]> {
  if (stories.length === 0) return stories;
  const ids = stories.map((s) => s.id);
  const byId = new Map(stories.map((s) => [s.id, s]));
  try {
    const { db } = await import("@/lib/db");
    const places = (await db.execute(
      sql`SELECT story_id, place_slug FROM lbs_story_places
           WHERE story_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`,
    )) as unknown as [{ story_id: number; place_slug: string }[]];
    for (const p of places[0] ?? []) {
      byId.get(Number(p.story_id))?.places.push(String(p.place_slug));
    }

    // Joined to the businesses table so the admin list and the byline
    // can show a name rather than a number.
    const biz = (await db.execute(
      sql`SELECT sb.story_id, sb.business_id, sb.role, b.business_name, b.slug
            FROM lbs_story_businesses sb
            LEFT JOIN directory_businesses b ON b.id = sb.business_id
           WHERE sb.story_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`,
    )) as unknown as [
      {
        story_id: number;
        business_id: number;
        role: string;
        business_name: string | null;
        slug: string | null;
      }[],
    ];
    for (const b of biz[0] ?? []) {
      byId.get(Number(b.story_id))?.businesses.push({
        businessId: Number(b.business_id),
        role: (b.role === "mentioned" ? "mentioned" : "subject") as StoryBusinessRole,
        name: b.business_name ?? undefined,
        slug: b.slug ?? undefined,
      });
    }
  } catch (e) {
    // A story without its joins is still a readable story. Losing the
    // whole page because a join table could not be read would be the
    // worse outcome.
    console.error("[stories] joins failed:", e);
  }
  return stories;
}

const SELECT = sql`SELECT id, slug, kind, title, dek, body_html, hero_media_id,
                          status, published_at, featured_rank, sponsored,
                          sponsor_business_id, meta_title, meta_description,
                          updated_at
                     FROM lbs_stories`;

/* ---------- reads ---------- */

/** Everything, for the admin list. */
export async function listStories(limit = 200): Promise<Story[]> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`${SELECT} ORDER BY COALESCE(published_at, updated_at) DESC, id DESC LIMIT ${limit}`,
    )) as unknown as [Row[]];
    return attachJoins((rows[0] ?? []).map(toStory));
  } catch (e) {
    console.error("[stories] list failed:", e);
    return [];
  }
}

export async function getStory(id: number): Promise<Story | undefined> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`${SELECT} WHERE id = ${id} LIMIT 1`,
    )) as unknown as [Row[]];
    const r = rows[0]?.[0];
    if (!r) return undefined;
    return (await attachJoins([toStory(r)]))[0];
  } catch (e) {
    console.error("[stories] read failed:", e);
    return undefined;
  }
}

/**
 * Live now.
 *
 * A scheduled story becomes live the moment its date passes, judged
 * here rather than by a job, so nothing depends on a sweep having run.
 * Publishing is therefore never late and never needs a cron.
 */
const LIVE = sql`(status = 'published'
                  OR (status = 'scheduled' AND published_at IS NOT NULL
                      AND published_at <= NOW()))`;

export async function getPublishedStory(
  slug: string,
): Promise<Story | undefined> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`${SELECT} WHERE slug = ${slug} AND ${LIVE} LIMIT 1`,
    )) as unknown as [Row[]];
    const r = rows[0]?.[0];
    if (!r) return undefined;
    return (await attachJoins([toStory(r)]))[0];
  } catch (e) {
    console.error("[stories] published read failed:", e);
    return undefined;
  }
}

export type StoryQuery = {
  kind?: StoryKind;
  placeSlug?: string;
  businessId?: number;
  limit?: number;
  offset?: number;
};

export async function publishedStories(q: StoryQuery = {}): Promise<Story[]> {
  const limit = Math.min(Math.max(q.limit ?? 24, 1), 100);
  const offset = Math.max(q.offset ?? 0, 0);
  try {
    const { db } = await import("@/lib/db");
    const where = [LIVE];
    if (q.kind) where.push(sql`kind = ${q.kind}`);
    if (q.placeSlug) {
      where.push(
        sql`id IN (SELECT story_id FROM lbs_story_places WHERE place_slug = ${q.placeSlug})`,
      );
    }
    if (q.businessId) {
      where.push(
        sql`id IN (SELECT story_id FROM lbs_story_businesses WHERE business_id = ${q.businessId})`,
      );
    }
    const rows = (await db.execute(
      sql`${SELECT} WHERE ${sql.join(where, sql` AND `)}
           ORDER BY published_at DESC, id DESC
           LIMIT ${limit} OFFSET ${offset}`,
    )) as unknown as [Row[]];
    return attachJoins((rows[0] ?? []).map(toStory));
  } catch (e) {
    console.error("[stories] published list failed:", e);
    return [];
  }
}

export async function countPublishedStories(q: StoryQuery = {}): Promise<number> {
  try {
    const { db } = await import("@/lib/db");
    const where = [LIVE];
    if (q.kind) where.push(sql`kind = ${q.kind}`);
    if (q.placeSlug) {
      where.push(
        sql`id IN (SELECT story_id FROM lbs_story_places WHERE place_slug = ${q.placeSlug})`,
      );
    }
    if (q.businessId) {
      where.push(
        sql`id IN (SELECT story_id FROM lbs_story_businesses WHERE business_id = ${q.businessId})`,
      );
    }
    const rows = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM lbs_stories WHERE ${sql.join(where, sql` AND `)}`,
    )) as unknown as [{ n: number | string }[]];
    return Number(rows[0]?.[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

/** The homepage grid, in the order somebody ranked them. */
export async function featuredStories(limit = 3): Promise<Story[]> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`${SELECT} WHERE ${LIVE} AND featured_rank IS NOT NULL
           ORDER BY featured_rank, published_at DESC
           LIMIT ${limit}`,
    )) as unknown as [Row[]];
    const found = (rows[0] ?? []).map(toStory);
    // Nobody has ranked anything yet is the normal state for a while, so
    // the grid falls back to the newest rather than sitting empty.
    if (found.length >= limit) return attachJoins(found);
    const filler = await publishedStories({ limit: limit - found.length });
    const seen = new Set(found.map((s) => s.id));
    return attachJoins([...found, ...filler.filter((s) => !seen.has(s.id))]);
  } catch (e) {
    console.error("[stories] featured failed:", e);
    return [];
  }
}

/* ---------- writes ---------- */

export type StoryPatch = {
  title: string;
  kind: StoryKind;
  dek: string;
  bodyHtml: string;
  heroMediaId: number | null;
  status: StoryStatus;
  /** ISO string. Empty means now, when publishing. */
  publishedAt: string;
  featuredRank: number | null;
  sponsored: boolean;
  sponsorBusinessId: number | null;
  metaTitle: string;
  metaDescription: string;
  places: string[];
  businesses: StoryBusiness[];
};

export type StoryResult =
  | { ok: true; id: number; slug: string }
  | { ok: false; error: string };

/**
 * Makes a slug nothing else is using.
 *
 * A story's slug is its address for ever, so a clash cannot be allowed
 * to overwrite somebody else's. Suffixed rather than rejected, because
 * two Now Open pieces about different bakeries genuinely can share a
 * headline and refusing the second helps nobody.
 */
async function freeSlug(base: string, exceptId: number | null): Promise<string> {
  const { db } = await import("@/lib/db");
  const root = base || "story";
  for (let n = 0; n < 50; n += 1) {
    const candidate = n === 0 ? root : `${root}-${n + 1}`;
    const rows = (await db.execute(
      sql`SELECT id FROM lbs_stories WHERE slug = ${candidate} LIMIT 1`,
    )) as unknown as [{ id: number }[]];
    const found = rows[0]?.[0];
    if (!found || (exceptId !== null && Number(found.id) === exceptId)) {
      return candidate;
    }
  }
  return `${root}-${Date.now()}`;
}

export async function saveStory(
  id: number | null,
  patch: StoryPatch,
): Promise<StoryResult> {
  const title = patch.title.trim();
  if (title.length < 3) {
    return { ok: false, error: "Give the story a headline." };
  }
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");

    const body = cleanStoryHtml(patch.bodyHtml ?? "");
    const kind = KINDS.has(patch.kind) ? patch.kind : "news";
    const status = STATUSES.has(patch.status) ? patch.status : "draft";

    /*
     * Publishing with no date set means now. A scheduled story keeps
     * whatever date was chosen, since that is the whole point of it, and
     * a draft keeps nothing so that saving a draft twice does not
     * quietly decide when it went live.
     */
    const wantsDate = status === "published" || status === "scheduled";
    const chosen = patch.publishedAt?.trim();
    const dateSql = !wantsDate
      ? sql`NULL`
      : chosen
        ? sql`${new Date(chosen)}`
        : sql`NOW()`;

    let storyId = id;
    if (storyId) {
      const slug = await freeSlug(slugifyStory(title), storyId);
      // The slug only follows the headline while nobody has seen it. Once
      // a story is live its address is out in the world, in a newsletter
      // and possibly in Google, and rewriting it would break every one of
      // those links silently.
      const current = (await db.execute(
        sql`SELECT slug, status FROM lbs_stories WHERE id = ${storyId} LIMIT 1`,
      )) as unknown as [{ slug: string; status: string }[]];
      const row = current[0]?.[0];
      if (!row) return { ok: false, error: "That story is not here any more." };
      const keepSlug = row.status !== "draft";
      const finalSlug = keepSlug ? String(row.slug) : slug;

      await db.execute(
        sql`UPDATE lbs_stories
               SET slug = ${finalSlug}, kind = ${kind}, title = ${title},
                   dek = ${patch.dek ?? ""}, body_html = ${body},
                   hero_media_id = ${patch.heroMediaId},
                   status = ${status}, published_at = ${dateSql},
                   featured_rank = ${patch.featuredRank},
                   sponsored = ${patch.sponsored ? 1 : 0},
                   sponsor_business_id = ${patch.sponsorBusinessId},
                   meta_title = ${patch.metaTitle ?? ""},
                   meta_description = ${patch.metaDescription ?? ""}
             WHERE id = ${storyId}`,
      );
      await writeJoins(storyId, patch);
      return { ok: true, id: storyId, slug: finalSlug };
    }

    const slug = await freeSlug(slugifyStory(title), null);
    await db.execute(
      sql`INSERT INTO lbs_stories
            (slug, kind, title, dek, body_html, hero_media_id, status,
             published_at, featured_rank, sponsored, sponsor_business_id,
             meta_title, meta_description)
          VALUES (${slug}, ${kind}, ${title}, ${patch.dek ?? ""}, ${body},
                  ${patch.heroMediaId}, ${status}, ${dateSql},
                  ${patch.featuredRank}, ${patch.sponsored ? 1 : 0},
                  ${patch.sponsorBusinessId}, ${patch.metaTitle ?? ""},
                  ${patch.metaDescription ?? ""})`,
    );
    const back = (await db.execute(
      sql`SELECT id FROM lbs_stories WHERE slug = ${slug} LIMIT 1`,
    )) as unknown as [{ id: number }[]];
    storyId = Number(back[0]?.[0]?.id ?? 0);
    if (!storyId) return { ok: false, error: "That saved but could not be read back." };
    await writeJoins(storyId, patch);
    return { ok: true, id: storyId, slug };
  } catch (e) {
    console.error("[stories] save failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

/** Replaces the joins wholesale, which is what the form posts. */
async function writeJoins(storyId: number, patch: StoryPatch) {
  const { db } = await import("@/lib/db");
  await db.execute(sql`DELETE FROM lbs_story_places WHERE story_id = ${storyId}`);
  for (const slug of [...new Set(patch.places.filter(Boolean))]) {
    await db.execute(
      sql`INSERT IGNORE INTO lbs_story_places (story_id, place_slug)
          VALUES (${storyId}, ${slug})`,
    );
  }
  await db.execute(
    sql`DELETE FROM lbs_story_businesses WHERE story_id = ${storyId}`,
  );
  const seen = new Set<number>();
  for (const b of patch.businesses) {
    const bid = Number(b.businessId);
    if (!Number.isInteger(bid) || bid <= 0 || seen.has(bid)) continue;
    seen.add(bid);
    await db.execute(
      sql`INSERT IGNORE INTO lbs_story_businesses (story_id, business_id, role)
          VALUES (${storyId}, ${bid}, ${b.role === "mentioned" ? "mentioned" : "subject"})`,
    );
  }
}

export async function setStoryStatus(
  id: number,
  status: StoryStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!STATUSES.has(status)) return { ok: false, error: "Unknown status." };
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    // Publishing something that has never had a date gets one now;
    // anything already dated keeps it, so re-publishing an archived
    // story does not pretend it is new.
    if (status === "published") {
      await db.execute(
        sql`UPDATE lbs_stories
               SET status = 'published',
                   published_at = COALESCE(published_at, NOW())
             WHERE id = ${id}`,
      );
    } else {
      await db.execute(
        sql`UPDATE lbs_stories SET status = ${status} WHERE id = ${id}`,
      );
    }
    return { ok: true };
  } catch (e) {
    console.error("[stories] status failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

/**
 * Deletes a story and its joins.
 *
 * Allowed at any status, unlike a sent newsletter: a story is a page,
 * not a record of something delivered to a hundred inboxes. Archiving
 * is the gentler option and the screen offers it first.
 */
export async function deleteStory(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    await db.execute(sql`DELETE FROM lbs_story_places WHERE story_id = ${id}`);
    await db.execute(
      sql`DELETE FROM lbs_story_businesses WHERE story_id = ${id}`,
    );
    await db.execute(sql`DELETE FROM lbs_stories WHERE id = ${id}`);
    return { ok: true };
  } catch (e) {
    console.error("[stories] delete failed:", e);
    return { ok: false, error: "That did not delete." };
  }
}

export { readMinutes as storyReadMinutes };
