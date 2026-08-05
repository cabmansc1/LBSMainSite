import "server-only";
import { sql } from "drizzle-orm";

/**
 * Artwork an advertiser sent us for a card.
 *
 * Until now a paying customer was told to reply to an email. That works
 * and it is what we have been doing, but it means the file lives in an
 * inbox, the admin cannot see whether a card is ready to go to print,
 * and the "awaiting artwork" figure on the dashboard can only count
 * legacy neighborhood card orders.
 *
 * Anchored to the advertiser's email and the Mission Control card id
 * rather than to an order row. Most advertisers arrived by phone and
 * have no row in lbs_orders at all, but every one of them is on a card
 * in Mission Control, so that pair is the thing both kinds of customer
 * actually have.
 *
 * Bytes live in MySQL, the same as logos and card photos, because this
 * app cannot write to the legacy host's disk. Print artwork is bigger
 * than a logo, so the cap is higher and the original is kept: a file
 * resized for the web is worthless to a printer.
 */

export type Artwork = {
  id: number;
  email: string;
  cardId: string;
  filename: string;
  mime: string;
  bytes: number;
  note: string;
  /** Empty when the advertiser sent it themselves, otherwise the admin
   *  who uploaded it for them. Worth knowing before replying "you sent
   *  us this" to somebody who did not. */
  uploadedBy: string;
  createdAt: string | null;
};

/** What a printer can actually use, plus the formats people really send. */
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
  "application/postscript",
  "application/illustrator",
  "application/zip",
]);

export const MAX_ARTWORK_BYTES = 25 * 1024 * 1024;

let ready = false;

/**
 * What MySQL will actually accept in one statement.
 *
 * A LONGBLOB column holds 4GB, but the insert still has to fit inside
 * max_allowed_packet, which is 4MB on a lot of shared hosting and 16MB
 * by default. Without this a 20MB PDF is accepted by every check we
 * wrote, travels all the way to the database, and dies there, which is
 * the most expensive possible place to find out. Read once, and left
 * null if the variable cannot be read so that only our own cap applies.
 */
let packetLimit: number | null = null;

/** Room for the rest of the statement and the protocol overhead. */
const PACKET_HEADROOM = 512 * 1024;

export function artworkByteLimit(): number {
  return packetLimit === null
    ? MAX_ARTWORK_BYTES
    : Math.min(MAX_ARTWORK_BYTES, Math.max(0, packetLimit - PACKET_HEADROOM));
}

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  try {
    const rows = (await db.execute(
      sql`SELECT @@max_allowed_packet AS n`,
    )) as unknown as [{ n: number | string }[]];
    const n = Number(rows[0]?.[0]?.n);
    if (Number.isFinite(n) && n > 0) packetLimit = n;
  } catch (e) {
    console.error("[artwork] could not read max_allowed_packet:", e);
  }
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_artwork (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      card_id VARCHAR(64) NOT NULL,
      filename VARCHAR(255) NOT NULL DEFAULT '',
      mime VARCHAR(120) NOT NULL DEFAULT '',
      size_bytes INT NOT NULL DEFAULT 0,
      note VARCHAR(500) NOT NULL DEFAULT '',
      uploaded_by VARCHAR(255) NOT NULL DEFAULT '',
      bytes LONGBLOB NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (email),
      INDEX (card_id),
      INDEX (email, card_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

const row = (r: Record<string, unknown>): Artwork => ({
  id: Number(r.id),
  email: String(r.email ?? ""),
  cardId: String(r.card_id ?? ""),
  filename: String(r.filename ?? ""),
  mime: String(r.mime ?? ""),
  bytes: Number(r.size_bytes ?? 0),
  note: String(r.note ?? ""),
  uploadedBy: String(r.uploaded_by ?? ""),
  createdAt: r.created_at ? String(r.created_at) : null,
});

const COLUMNS = sql`id, email, card_id, filename, mime, size_bytes, note,
                    uploaded_by, created_at`;

export function artworkTypeAllowed(mime: string, filename: string): boolean {
  if (ALLOWED.has(mime)) return true;
  // Some browsers send an empty or generic type for .ai and .eps, so the
  // extension is a fallback rather than the only check.
  return /\.(pdf|jpe?g|png|tiff?|webp|ai|eps|zip)$/i.test(filename);
}

/**
 * Saves a file. Nothing is resized or re-encoded: a print file that has
 * been through an image pipeline is no longer a print file.
 *
 * Uploading again keeps the previous version rather than replacing it,
 * because "send the new one" and "we lost the old one" should not be the
 * same operation. The newest is what the admin shows.
 */
export async function saveArtwork(input: {
  email: string;
  cardId: string;
  filename: string;
  mime: string;
  note?: string;
  uploadedBy?: string;
  bytes: Buffer;
}): Promise<{ id: number } | { error: string }> {
  if (input.bytes.length === 0) return { error: "That file was empty." };
  if (!artworkTypeAllowed(input.mime, input.filename)) {
    return { error: "Send a PDF, JPG, PNG, TIFF, AI, EPS or a zip." };
  }
  try {
    // After ensureTable, because the size that can actually be stored is
    // not known until the connection has been asked.
    await ensureTable();
    const limit = artworkByteLimit();
    if (input.bytes.length > limit) {
      const mb = Math.floor(limit / 1024 / 1024);
      return {
        error: `That file is over ${mb}MB, which is as much as we can store. Email us a link instead.`,
      };
    }
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`INSERT INTO lbs_artwork
            (email, card_id, filename, mime, size_bytes, note, uploaded_by, bytes)
          VALUES (${input.email}, ${input.cardId}, ${input.filename.slice(0, 255)},
                  ${input.mime.slice(0, 120)}, ${input.bytes.length},
                  ${(input.note ?? "").slice(0, 500)},
                  ${(input.uploadedBy ?? "").slice(0, 255)}, ${input.bytes})`,
    );
    const r = (await db.execute(
      sql`SELECT LAST_INSERT_ID() AS id`,
    )) as unknown as [{ id: number }[]];
    return { id: Number(r[0]?.[0]?.id ?? 0) };
  } catch (e) {
    console.error("[artwork] save failed:", e);
    return { error: "That upload could not be saved. Try again or email us." };
  }
}

/** Metadata only. Selecting bytes here would drag every file through a list. */
export async function getArtworkFor(
  email: string,
  cardId?: string,
): Promise<Artwork[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      cardId
        ? sql`SELECT ${COLUMNS} FROM lbs_artwork
              WHERE email = ${email} AND card_id = ${cardId} ORDER BY id DESC`
        : sql`SELECT ${COLUMNS} FROM lbs_artwork
              WHERE email = ${email} ORDER BY id DESC`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map(row);
  } catch (e) {
    console.error("[artwork] list failed:", e);
    return [];
  }
}

/** Which cards have artwork, for a whole page of them at once. */
export async function cardsWithArtwork(cardIds: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const clean = cardIds.filter(Boolean);
  if (clean.length === 0) return out;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT DISTINCT card_id FROM lbs_artwork
          WHERE card_id IN (${sql.join(
            clean.map((c) => sql`${c}`),
            sql`, `,
          )})`,
    )) as unknown as [{ card_id: string }[]];
    for (const r of rows[0] ?? []) out.add(String(r.card_id));
  } catch (e) {
    console.error("[artwork] card lookup failed:", e);
  }
  return out;
}

export async function getArtworkBytes(
  id: number,
): Promise<{ bytes: Buffer; mime: string; filename: string; email: string } | undefined> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT bytes, mime, filename, email FROM lbs_artwork WHERE id = ${id} LIMIT 1`,
    )) as unknown as [
      { bytes: Buffer; mime: string; filename: string; email: string }[],
    ];
    const r = rows[0]?.[0];
    return r
      ? {
          bytes: r.bytes,
          mime: String(r.mime || "application/octet-stream"),
          filename: String(r.filename || "artwork"),
          email: String(r.email ?? ""),
        }
      : undefined;
  } catch (e) {
    console.error("[artwork] read failed:", e);
    return undefined;
  }
}

/**
 * Which advertiser/card pairs already have a file, as `email|cardId`.
 *
 * Emails are lowercased on both sides of the comparison. Mission
 * Control and a login form disagree about capitalisation often enough
 * that matching on the raw string would report artwork as missing while
 * the file sits in the table.
 */
async function artworkKeys(cardIds: string[]): Promise<Set<string>> {
  const keys = new Set<string>();
  const clean = cardIds.filter(Boolean);
  if (clean.length === 0) return keys;
  await ensureTable();
  const { db } = await import("@/lib/db");
  const rows = (await db.execute(
    sql`SELECT DISTINCT LOWER(email) AS email, card_id FROM lbs_artwork
        WHERE card_id IN (${sql.join(
          clean.map((c) => sql`${c}`),
          sql`, `,
        )})`,
  )) as unknown as [{ email: string; card_id: string }[]];
  for (const r of rows[0] ?? []) keys.add(`${r.email}|${r.card_id}`);
  return keys;
}

export type ArtworkGap = {
  cardId: string;
  cardName: string;
  zoneName: string;
  mailMonth: string;
  artworkDeadline?: string;
  /** The deadline has already gone by. The whole reason for the page is
   *  to catch this before the card prints with a hole in it. */
  overdue: boolean;
  businessName: string;
  email: string;
  phone: string;
  adSize: string;
  /** What Mission Control says, so the page can show why it is listed. */
  artStatus: string;
};

/**
 * Mission Control artwork states that mean we already have the file.
 *
 * Checked against the live store: of 227 advertiser rows, 209 are
 * approved and 2 received. Almost every advertiser sent their artwork
 * long before this app could accept one, so a "missing" list that only
 * looked at our own uploads table would have declared nearly everybody
 * delinquent on its first day and been ignored from then on.
 */
const SETTLED = new Set(["approved", "received"]);

/**
 * Everyone on an upcoming card who has not sent artwork.
 *
 * This is the question the dashboard could never answer before. The old
 * "awaiting artwork" figure counted rows in directory_card_orders, which
 * only ever covered legacy neighborhood card orders bought online. Most
 * advertisers are sold over the phone and exist nowhere but Mission
 * Control, so the number that mattered before a print deadline was the
 * one nobody could see.
 *
 * Null means Mission Control could not be reached. An empty list means
 * everyone has sent something, and the two must not render the same.
 *
 * The prospect count comes back with it so the page can say the rule is
 * running. A filter nobody can see is a filter nobody trusts.
 */
export type ArtworkGapReport = { gaps: ArtworkGap[]; prospects: number };

export async function getArtworkGaps(): Promise<ArtworkGapReport | null> {
  const { getUpcomingCardRoster } = await import("@/lib/mission-control");
  const roster = await getUpcomingCardRoster();
  if (roster === null) return null;
  if (roster.length === 0) return { gaps: [], prospects: 0 };
  const have = await artworkKeys(roster.map((c) => c.cardId));

  const { artworkDeadlineFrom } = await import("@/lib/mailings");
  const now = Date.now();

  const gaps: ArtworkGap[] = [];
  let prospects = 0;
  for (const card of roster) {
    const due = artworkDeadlineFrom(card.mailDateIso);
    const overdue = due !== undefined && due.getTime() < now;
    for (const a of card.advertisers) {
      // Nobody owes us artwork for a spot they have not bought.
      if (a.isProspect) {
        prospects++;
        continue;
      }
      // Mission Control is the record of what we have on hand, whether
      // it arrived by upload, by email years ago, or on a thumb drive.
      if (SETTLED.has(a.artStatus)) continue;
      // No email means no upload could have been matched to them, so
      // they count as missing by definition rather than by lookup.
      if (a.email && have.has(`${a.email.toLowerCase()}|${card.cardId}`)) continue;
      gaps.push({
        cardId: card.cardId,
        cardName: card.cardName,
        zoneName: card.zoneName,
        mailMonth: card.mailMonth,
        artworkDeadline: card.artworkDeadline,
        overdue,
        businessName: a.businessName,
        email: a.email,
        phone: a.phone,
        adSize: a.adSize,
        artStatus: a.artStatus,
      });
    }
  }
  return { gaps, prospects };
}

/** Everything waiting to be looked at, newest first, for the admin. */
export async function getRecentArtwork(limit = 200): Promise<Artwork[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT ${COLUMNS} FROM lbs_artwork ORDER BY id DESC LIMIT ${limit}`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map(row);
  } catch (e) {
    console.error("[artwork] recent list failed:", e);
    return [];
  }
}

/**
 * Removes an uploaded file.
 *
 * There was no way to. A file sent to the wrong card, a test upload, or a
 * customer's third attempt at the same logo all stayed forever, and the
 * admin's list is the place somebody looks to decide whether a card is
 * ready, so junk in it costs more than the disk it uses.
 *
 * `owner` scopes the delete to one advertiser's own uploads. The admin
 * passes nothing and can remove any; the portal passes the signed-in
 * address, so an id belonging to somebody else deletes nothing rather
 * than deleting theirs.
 *
 * Returns whether a row actually went, so a caller can tell "removed"
 * from "that was not yours" instead of reporting success either way.
 */
export async function deleteArtwork(
  id: number,
  owner?: string,
): Promise<boolean> {
  if (!Number.isInteger(id) || id <= 0) return false;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      owner
        ? sql`DELETE FROM lbs_artwork WHERE id = ${id}
              AND email = ${owner.toLowerCase()}`
        : sql`DELETE FROM lbs_artwork WHERE id = ${id}`,
    );
    const check = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM lbs_artwork WHERE id = ${id}`,
    )) as unknown as [{ n: number | string }[]];
    return Number(check[0]?.[0]?.n ?? 0) === 0;
  } catch (e) {
    console.error("[artwork] delete failed:", e);
    return false;
  }
}
