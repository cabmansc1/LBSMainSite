import "server-only";
import { sql } from "drizzle-orm";
import {
  AD_SLOT_BY_ID,
  EMPTY_ADSENSE,
  adState,
  isAdSlot,
  type Ad,
  type AdSlotId,
  type AdWithStats,
  type AdsenseConfig,
} from "@/lib/ads-types";
import { SITE_TZ } from "@/lib/time";

/**
 * Advertising on directory listing pages.
 *
 * Two kinds of thing fill a slot. A sponsored advertiser is an image
 * stored here with a link, a date window and optional targeting; Google
 * is a script tag configured once. They are tried in that order, and a
 * slot with neither renders nothing at all rather than an empty box,
 * because a visible hole reads as a broken page.
 *
 * Images live in the database next to listing logos and card artwork, for
 * the same reason those do: this app runs on Railway and has no
 * filesystem to write to that survives a deploy.
 *
 * Counting is a daily rollup rather than a row per event. A leaderboard
 * seen by every visitor to every listing would otherwise be the largest
 * table on the site within a month, and nobody has ever needed to know
 * which second an impression happened.
 */

let ready = false;

async function ensureTables() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_ads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slot VARCHAR(32) NOT NULL,
      name VARCHAR(160) NOT NULL DEFAULT '',
      alt VARCHAR(200) NOT NULL DEFAULT '',
      click_url VARCHAR(500) NOT NULL DEFAULT '',
      categories VARCHAR(500) NOT NULL DEFAULT '',
      locations VARCHAR(500) NOT NULL DEFAULT '',
      starts_on DATE NULL,
      ends_on DATE NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      mime VARCHAR(64) NOT NULL DEFAULT 'image/webp',
      width INT NOT NULL DEFAULT 0,
      height INT NOT NULL DEFAULT 0,
      bytes LONGBLOB NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (slot, active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_ad_stats (
      ad_id INT NOT NULL,
      day DATE NOT NULL,
      impressions INT NOT NULL DEFAULT 0,
      clicks INT NOT NULL DEFAULT 0,
      PRIMARY KEY (ad_id, day),
      INDEX (day)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  // Listings whose ad behaviour has been set by hand, either way. A
  // listing with no row here follows the rule in adsAllowed().
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_listing_ads (
      business_id INT NOT NULL PRIMARY KEY,
      show_ads TINYINT(1) NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

/** Today where the advertiser is, so a campaign ends when they expect. */
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: SITE_TZ });

const csv = (v: string): string[] =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

type Row = {
  id: number;
  slot: string;
  name: string;
  alt: string;
  click_url: string;
  categories: string;
  locations: string;
  starts_on: string | Date | null;
  ends_on: string | Date | null;
  active: number;
  width: number;
  height: number;
};

const isoDate = (v: string | Date | null): string | null => {
  if (!v) return null;
  if (v instanceof Date) return v.toLocaleDateString("en-CA");
  return String(v).slice(0, 10);
};

const toAd = (r: Row): Ad => ({
  id: Number(r.id),
  slot: (isAdSlot(r.slot) ? r.slot : "in_content") as AdSlotId,
  name: String(r.name ?? ""),
  alt: String(r.alt ?? ""),
  clickUrl: String(r.click_url ?? ""),
  categories: csv(r.categories),
  locations: csv(r.locations),
  startsOn: isoDate(r.starts_on),
  endsOn: isoDate(r.ends_on),
  active: Number(r.active) === 1,
  width: Number(r.width ?? 0),
  height: Number(r.height ?? 0),
});

const SELECT_COLUMNS = sql`id, slot, name, alt, click_url, categories,
  locations, starts_on, ends_on, active, width, height`;

/* ---------- what runs where ---------- */

/**
 * The creative to show in one slot on one listing, or null.
 *
 * Targeting is applied here rather than in SQL because it is a set
 * membership test against a short list, and pushing it into the query
 * would mean FIND_IN_SET on an unindexed column for no gain: there are
 * never many ads competing for one slot.
 *
 * When several qualify they rotate by page view. Random rather than
 * round-robin, because round-robin needs a counter that every request
 * writes to, and over a day the two are the same split.
 */
export async function pickAd(input: {
  slot: AdSlotId;
  categorySlug?: string;
  locationSlug?: string;
}): Promise<Ad | null> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const day = today();
    const rows = (await db.execute(
      sql`SELECT ${SELECT_COLUMNS} FROM lbs_ads
          WHERE slot = ${input.slot}
            AND active = 1
            AND (starts_on IS NULL OR starts_on <= ${day})
            AND (ends_on IS NULL OR ends_on >= ${day})`,
    )) as unknown as [Row[]];

    const eligible = (rows[0] ?? []).map(toAd).filter((ad) => {
      // Empty means "anywhere", which is what most ads will be.
      if (
        ad.categories.length > 0 &&
        (!input.categorySlug || !ad.categories.includes(input.categorySlug))
      ) {
        return false;
      }
      if (
        ad.locations.length > 0 &&
        (!input.locationSlug || !ad.locations.includes(input.locationSlug))
      ) {
        return false;
      }
      return true;
    });

    if (eligible.length === 0) return null;
    return eligible[Math.floor(Math.random() * eligible.length)];
  } catch (e) {
    // An advertisement is the least important thing on the page.
    console.error("[ads] pick failed:", e);
    return null;
  }
}

export async function getAdBytes(
  id: number,
): Promise<{ bytes: Buffer; mime: string } | undefined> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT bytes, mime FROM lbs_ads WHERE id = ${id} LIMIT 1`,
    )) as unknown as [{ bytes: Buffer; mime: string }[]];
    const r = rows[0]?.[0];
    return r ? { bytes: r.bytes, mime: String(r.mime ?? "image/webp") } : undefined;
  } catch (e) {
    console.error("[ads] image read failed:", e);
    return undefined;
  }
}

/** Where a click should land, checked server-side so the URL cannot be forged. */
export async function clickTargetFor(id: number): Promise<string | null> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT click_url FROM lbs_ads WHERE id = ${id} LIMIT 1`,
    )) as unknown as [{ click_url: string }[]];
    const url = String(rows[0]?.[0]?.click_url ?? "");
    return /^https?:\/\//i.test(url) ? url : null;
  } catch (e) {
    console.error("[ads] click target failed:", e);
    return null;
  }
}

/* ---------- counting ---------- */

async function bump(id: number, column: "impressions" | "clicks") {
  if (!Number.isInteger(id) || id <= 0) return;
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const day = today();
    const col = sql.raw(column);
    await db.execute(
      sql`INSERT INTO lbs_ad_stats (ad_id, day, ${col})
          VALUES (${id}, ${day}, 1)
          ON DUPLICATE KEY UPDATE ${col} = ${col} + 1`,
    );
  } catch (e) {
    console.error(`[ads] could not record ${column}:`, e);
  }
}

/**
 * Records that an ad was rendered. Call inside after().
 *
 * Bots are excluded on the same list the view counter uses. An
 * impression figure that counts crawlers is worse than no figure,
 * because it is the number a sponsor is being invoiced against.
 */
export async function recordImpression(id: number, userAgent: string) {
  const { looksLikeBot } = await import("@/lib/listing-views");
  if (looksLikeBot(userAgent)) return;
  await bump(id, "impressions");
}

export const recordClick = (id: number) => bump(id, "clicks");

/* ---------- the admin's view ---------- */

export async function listAds(): Promise<AdWithStats[]> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const [adRows, statRows] = (await Promise.all([
      db.execute(sql`SELECT ${SELECT_COLUMNS} FROM lbs_ads ORDER BY slot, id DESC`),
      db.execute(
        sql`SELECT ad_id, SUM(impressions) AS i, SUM(clicks) AS c
            FROM lbs_ad_stats GROUP BY ad_id`,
      ),
    ])) as unknown as [
      [Row[]],
      [{ ad_id: number; i: number | string; c: number | string }[]],
    ];

    const stats = new Map(
      (statRows[0] ?? []).map((s) => [
        Number(s.ad_id),
        { impressions: Number(s.i ?? 0), clicks: Number(s.c ?? 0) },
      ]),
    );
    const day = today();
    return (adRows[0] ?? []).map(toAd).map((ad) => ({
      ...ad,
      impressions: stats.get(ad.id)?.impressions ?? 0,
      clicks: stats.get(ad.id)?.clicks ?? 0,
      state: adState(ad, day),
    }));
  } catch (e) {
    console.error("[ads] list failed:", e);
    return [];
  }
}

export type AdInput = {
  id?: number;
  slot: string;
  name: string;
  alt: string;
  clickUrl: string;
  categories: string[];
  locations: string[];
  startsOn: string | null;
  endsOn: string | null;
  active: boolean;
};

const dateOrNull = (v: string | null): string | null =>
  v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

/**
 * Creates or updates one creative.
 *
 * The image is optional on an update, so changing a date window does not
 * mean re-uploading the artwork. It is required on a create, because a
 * slot cannot render an ad that has no picture in it.
 */
export async function saveAd(
  input: AdInput,
  image?: Buffer,
): Promise<{ id: number } | { error: string }> {
  if (!isAdSlot(input.slot)) return { error: "Pick a slot for this ad." };
  if (!input.name.trim()) return { error: "Give the ad a name you will recognise." };
  if (input.clickUrl && !/^https?:\/\//i.test(input.clickUrl)) {
    return { error: "The click-through link needs to start with http:// or https://." };
  }
  if (
    input.startsOn &&
    input.endsOn &&
    dateOrNull(input.startsOn) &&
    dateOrNull(input.endsOn) &&
    input.endsOn < input.startsOn
  ) {
    return { error: "The end date is before the start date." };
  }

  try {
    await ensureTables();
    const { db } = await import("@/lib/db");

    let resized: { data: Buffer; width: number; height: number } | null = null;
    if (image) {
      const spec = AD_SLOT_BY_ID.get(input.slot);
      const sharp = (await import("sharp")).default;
      const img = sharp(image, { failOn: "none" });
      const meta = await img.metadata();
      if (!meta.width || !meta.height) {
        return { error: "That file does not look like an image." };
      }
      // Twice the slot's own size, so it stays sharp on a retina screen
      // and no sharper. `fit: inside` never crops: an ad cropped to fit
      // is an ad with the phone number missing.
      const box = spec ? Math.max(spec.width, spec.height) * 2 : 1200;
      const out = await img
        .rotate()
        .resize({ width: box, height: box, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer({ resolveWithObject: true });
      resized = { data: out.data, width: out.info.width, height: out.info.height };
    }

    const categories = input.categories.join(",");
    const locations = input.locations.join(",");
    const starts = dateOrNull(input.startsOn);
    const ends = dateOrNull(input.endsOn);

    if (input.id) {
      await db.execute(
        sql`UPDATE lbs_ads SET
              slot = ${input.slot},
              name = ${input.name.trim()},
              alt = ${input.alt.trim()},
              click_url = ${input.clickUrl.trim()},
              categories = ${categories},
              locations = ${locations},
              starts_on = ${starts},
              ends_on = ${ends},
              active = ${input.active ? 1 : 0}
            WHERE id = ${input.id}`,
      );
      if (resized) {
        await db.execute(
          sql`UPDATE lbs_ads SET bytes = ${resized.data}, mime = 'image/webp',
                width = ${resized.width}, height = ${resized.height}
              WHERE id = ${input.id}`,
        );
      }
      return { id: input.id };
    }

    if (!resized) return { error: "Upload the artwork for this ad." };
    await db.execute(
      sql`INSERT INTO lbs_ads
            (slot, name, alt, click_url, categories, locations, starts_on,
             ends_on, active, mime, width, height, bytes)
          VALUES (${input.slot}, ${input.name.trim()}, ${input.alt.trim()},
                  ${input.clickUrl.trim()}, ${categories}, ${locations},
                  ${starts}, ${ends}, ${input.active ? 1 : 0}, 'image/webp',
                  ${resized.width}, ${resized.height}, ${resized.data})`,
    );
    const rows = (await db.execute(
      sql`SELECT LAST_INSERT_ID() AS id`,
    )) as unknown as [{ id: number }[]];
    return { id: Number(rows[0]?.[0]?.id ?? 0) };
  } catch (e) {
    console.error("[ads] save failed:", e);
    return { error: "That did not save." };
  }
}

export async function deleteAd(id: number) {
  await ensureTables();
  const { db } = await import("@/lib/db");
  await db.execute(sql`DELETE FROM lbs_ads WHERE id = ${id}`);
  // The totals go with it. Keeping orphan rows would make the next ad to
  // reuse the id inherit somebody else's numbers.
  await db.execute(sql`DELETE FROM lbs_ad_stats WHERE ad_id = ${id}`);
}

export async function setAdActive(id: number, active: boolean) {
  await ensureTables();
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`UPDATE lbs_ads SET active = ${active ? 1 : 0} WHERE id = ${id}`,
  );
}

/* ---------- Google, for the slots nobody has bought ---------- */

const ADSENSE_KEY = "ads_adsense";

export async function getAdsense(): Promise<AdsenseConfig> {
  const { getSetting } = await import("@/lib/admin-data");
  const stored = await getSetting<AdsenseConfig>(ADSENSE_KEY);
  if (!stored) return EMPTY_ADSENSE;
  return {
    enabled: !!stored.enabled,
    client: String(stored.client ?? ""),
    units: stored.units ?? {},
  };
}

export async function saveAdsense(config: AdsenseConfig) {
  const { saveSetting } = await import("@/lib/admin-data");
  const units: AdsenseConfig["units"] = {};
  for (const [slot, unit] of Object.entries(config.units ?? {})) {
    if (isAdSlot(slot) && String(unit ?? "").trim()) {
      units[slot] = String(unit).trim();
    }
  }
  await saveSetting(ADSENSE_KEY, {
    enabled: !!config.enabled,
    client: String(config.client ?? "").trim(),
    units,
  });
}

/* ---------- which listings carry advertising ---------- */

/**
 * Whether this listing shows ads at all.
 *
 * A Featured listing does not, by default. Featured is what a paying
 * advertiser gets, and running a competitor's ad in their sidebar is
 * selling the same reader twice. The rule is a default rather than a law
 * because Featured is also used editorially, so any listing can be set
 * either way by hand and the override wins.
 */
export async function adsAllowed(
  businessId: number,
  isFeatured: boolean,
): Promise<boolean> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT show_ads FROM lbs_listing_ads WHERE business_id = ${businessId}`,
    )) as unknown as [{ show_ads: number }[]];
    const row = rows[0]?.[0];
    if (row) return Number(row.show_ads) === 1;
  } catch (e) {
    console.error("[ads] override lookup failed:", e);
  }
  return !isFeatured;
}

/** null means "follow the Featured rule". */
export async function setAdsOverride(businessId: number, show: boolean | null) {
  await ensureTables();
  const { db } = await import("@/lib/db");
  if (show === null) {
    await db.execute(
      sql`DELETE FROM lbs_listing_ads WHERE business_id = ${businessId}`,
    );
    return;
  }
  await db.execute(
    sql`INSERT INTO lbs_listing_ads (business_id, show_ads)
        VALUES (${businessId}, ${show ? 1 : 0})
        ON DUPLICATE KEY UPDATE show_ads = VALUES(show_ads)`,
  );
}

/** Every listing that has been set by hand, for the admin directory table. */
export async function getAdsOverrides(): Promise<Map<number, boolean>> {
  const out = new Map<number, boolean>();
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT business_id, show_ads FROM lbs_listing_ads`,
    )) as unknown as [{ business_id: number; show_ads: number }[]];
    for (const r of rows[0] ?? []) {
      out.set(Number(r.business_id), Number(r.show_ads) === 1);
    }
  } catch (e) {
    console.error("[ads] overrides lookup failed:", e);
  }
  return out;
}
