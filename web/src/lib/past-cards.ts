import "server-only";
import { sql } from "drizzle-orm";

/**
 * The archive of cards we have already mailed.
 *
 * Images live in MySQL as blobs. At roughly two images per mailing that
 * is tens of megabytes a year, which the database carries without
 * complaint, and it keeps the whole site in one backup with no second
 * account to hold. Pages address an image by id through a route rather
 * than by a storage URL, so if the archive ever outgrows this, moving
 * the bytes to object storage changes one function and no pages.
 *
 * Every image is re-encoded to WebP and bounded on upload, so a 12MB
 * phone photo of a postcard lands as a few hundred kilobytes.
 */

export type CardSide = "front" | "back" | "detail";

export type PastCard = {
  slug: string;
  /** Mission Control card id, where the card came from MC. */
  mcCardId?: string;
  zoneSlug: string;
  zoneName: string;
  /** "Downtown Summerville", when the card had its own name. */
  cardName?: string;
  mailMonth: string;
  /** ISO date, used for ordering and for the page's dateline. */
  mailDate?: string;
  description?: string;
  published: boolean;
  images: CardImage[];
};

export type CardImage = {
  id: number;
  cardSlug: string;
  side: CardSide;
  caption?: string;
  alt: string;
  width: number;
  height: number;
  mime: string;
  order: number;
};

let ensured = false;

/**
 * Created on first use, the same way the orders table is. The legacy
 * schema was built by hand over years and there is no migration history
 * to hang this off, so the app owns its own tables.
 */
async function ensureTables() {
  if (ensured) return;
  const { db } = await import("@/lib/db");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lbs_past_cards (
      slug VARCHAR(190) NOT NULL PRIMARY KEY,
      mc_card_id VARCHAR(64) NULL,
      zone_slug VARCHAR(64) NOT NULL,
      zone_name VARCHAR(128) NOT NULL,
      card_name VARCHAR(190) NULL,
      mail_month VARCHAR(64) NOT NULL,
      mail_date DATE NULL,
      description TEXT NULL,
      published TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_zone (zone_slug),
      INDEX idx_date (mail_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lbs_card_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      card_slug VARCHAR(190) NOT NULL,
      side VARCHAR(16) NOT NULL DEFAULT 'front',
      caption VARCHAR(255) NULL,
      alt VARCHAR(255) NOT NULL DEFAULT '',
      width INT NOT NULL DEFAULT 0,
      height INT NOT NULL DEFAULT 0,
      mime VARCHAR(64) NOT NULL DEFAULT 'image/webp',
      bytes LONGBLOB NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_card (card_slug, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  ensured = true;
}

const rowToCard = (r: Record<string, unknown>): Omit<PastCard, "images"> => ({
  slug: String(r.slug),
  mcCardId: r.mc_card_id ? String(r.mc_card_id) : undefined,
  zoneSlug: String(r.zone_slug),
  zoneName: String(r.zone_name),
  cardName: r.card_name ? String(r.card_name) : undefined,
  mailMonth: String(r.mail_month),
  mailDate: r.mail_date ? String(r.mail_date).slice(0, 10) : undefined,
  description: r.description ? String(r.description) : undefined,
  published: Number(r.published) === 1,
});

const rowToImage = (r: Record<string, unknown>): CardImage => ({
  id: Number(r.id),
  cardSlug: String(r.card_slug),
  side: (String(r.side) as CardSide) ?? "front",
  caption: r.caption ? String(r.caption) : undefined,
  alt: String(r.alt ?? ""),
  width: Number(r.width ?? 0),
  height: Number(r.height ?? 0),
  mime: String(r.mime ?? "image/webp"),
  order: Number(r.sort_order ?? 0),
});

/** Slug from the zone and the mail month: summerville-august-2026. */
export const pastCardSlug = (zoneSlug: string, mailMonth: string) =>
  `${zoneSlug}-${mailMonth}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function getPastCards(
  opts: { publishedOnly?: boolean; zoneSlug?: string } = {},
): Promise<PastCard[]> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const cards = (await db.execute(
      opts.zoneSlug
        ? sql`SELECT * FROM lbs_past_cards WHERE zone_slug = ${opts.zoneSlug}
              ORDER BY mail_date DESC, slug DESC`
        : sql`SELECT * FROM lbs_past_cards ORDER BY mail_date DESC, slug DESC`,
    )) as unknown as [Record<string, unknown>[]];
    // Blobs are never selected here; only the metadata a listing needs.
    const images = (await db.execute(
      sql`SELECT id, card_slug, side, caption, alt, width, height, mime, sort_order
          FROM lbs_card_images ORDER BY sort_order, id`,
    )) as unknown as [Record<string, unknown>[]];

    const byCard = new Map<string, CardImage[]>();
    for (const row of images[0] ?? []) {
      const img = rowToImage(row);
      byCard.set(img.cardSlug, [...(byCard.get(img.cardSlug) ?? []), img]);
    }

    return (cards[0] ?? [])
      .map((r) => ({ ...rowToCard(r), images: byCard.get(String(r.slug)) ?? [] }))
      .filter((c) => !opts.publishedOnly || (c.published && c.images.length > 0));
  } catch (e) {
    console.error("[past-cards] read failed:", e);
    return [];
  }
}

export async function getPastCard(slug: string): Promise<PastCard | undefined> {
  const all = await getPastCards();
  return all.find((c) => c.slug === slug);
}

export async function savePastCard(card: {
  slug: string;
  mcCardId?: string;
  zoneSlug: string;
  zoneName: string;
  cardName?: string;
  mailMonth: string;
  mailDate?: string;
  description?: string;
  published: boolean;
}) {
  await ensureTables();
  const { db } = await import("@/lib/db");
  await db.execute(sql`
    INSERT INTO lbs_past_cards
      (slug, mc_card_id, zone_slug, zone_name, card_name, mail_month, mail_date,
       description, published)
    VALUES
      (${card.slug}, ${card.mcCardId ?? null}, ${card.zoneSlug}, ${card.zoneName},
       ${card.cardName ?? null}, ${card.mailMonth}, ${card.mailDate ?? null},
       ${card.description ?? null}, ${card.published ? 1 : 0})
    ON DUPLICATE KEY UPDATE
      mc_card_id = VALUES(mc_card_id),
      zone_slug = VALUES(zone_slug),
      zone_name = VALUES(zone_name),
      card_name = VALUES(card_name),
      mail_month = VALUES(mail_month),
      mail_date = VALUES(mail_date),
      description = VALUES(description),
      published = VALUES(published)
  `);
}

export async function deletePastCard(slug: string) {
  await ensureTables();
  const { db } = await import("@/lib/db");
  await db.execute(sql`DELETE FROM lbs_card_images WHERE card_slug = ${slug}`);
  await db.execute(sql`DELETE FROM lbs_past_cards WHERE slug = ${slug}`);
}

/** The bytes, for the image route. Selected on its own so listings never
 *  drag megabytes through the query. */
export async function getCardImageBytes(
  id: number,
): Promise<{ bytes: Buffer; mime: string } | undefined> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT bytes, mime FROM lbs_card_images WHERE id = ${id} LIMIT 1`,
    )) as unknown as [Record<string, unknown>[]];
    const row = (rows[0] ?? [])[0];
    if (!row) return undefined;
    return { bytes: row.bytes as Buffer, mime: String(row.mime ?? "image/webp") };
  } catch (e) {
    console.error("[past-cards] image read failed:", e);
    return undefined;
  }
}

export async function addCardImage(image: {
  cardSlug: string;
  side: CardSide;
  caption?: string;
  alt: string;
  width: number;
  height: number;
  mime: string;
  bytes: Buffer;
  order: number;
}): Promise<number> {
  await ensureTables();
  const { db } = await import("@/lib/db");
  await db.execute(sql`
    INSERT INTO lbs_card_images
      (card_slug, side, caption, alt, width, height, mime, bytes, sort_order)
    VALUES
      (${image.cardSlug}, ${image.side}, ${image.caption ?? null}, ${image.alt},
       ${image.width}, ${image.height}, ${image.mime}, ${image.bytes},
       ${image.order})
  `);
  const rows = (await db.execute(
    sql`SELECT LAST_INSERT_ID() AS id`,
  )) as unknown as [Record<string, unknown>[]];
  return Number((rows[0] ?? [])[0]?.id ?? 0);
}

export async function deleteCardImage(id: number) {
  await ensureTables();
  const { db } = await import("@/lib/db");
  await db.execute(sql`DELETE FROM lbs_card_images WHERE id = ${id}`);
}
