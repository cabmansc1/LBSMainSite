import "server-only";
import { sql } from "drizzle-orm";
import { PROOF_STATUSES, type Proof, type ProofStatus } from "@/lib/proofs-types";

export type { Proof, ProofStatus } from "@/lib/proofs-types";
export { PROOF_STATUS_LABEL } from "@/lib/proofs-types";

/**
 * The ad we designed, sent to the advertiser to approve.
 *
 * Deliberately not stored in lbs_artwork, which is the opposite
 * direction: artwork is what a customer sends us, a proof is what we
 * send them. Filing one as the other is not a labelling problem. It
 * would tell the customer "we have your artwork" for a file they never
 * sent, list it in their portal among their own uploads, and make the
 * artwork gap report count them as ready for print when they have sent
 * nothing at all.
 *
 * Keyed on advertiser email and Mission Control card id, the same pair
 * artwork uses, because most advertisers arrived by phone and have no
 * order row here but every one of them is on a card there.
 *
 * Approval is authoritative here and is never written back to Mission
 * Control. MC's own artStatus is read alongside and shown next to this,
 * so a disagreement between the two is visible and can be settled by
 * hand rather than by one system quietly overwriting the other.
 *
 * Uploading again adds a version rather than replacing one. A proof that
 * has been approved is a record of what was agreed, and the second round
 * of changes should not erase what the first round said.
 */

/** What a proof is actually sent as. Narrower than artwork on purpose:
 *  this is something to look at, not something to print from. */
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MAX_PROOF_BYTES = 15 * 1024 * 1024;

export function proofTypeAllowed(mime: string, filename: string): boolean {
  if (ALLOWED.has(mime)) return true;
  return /\.(pdf|jpe?g|png|webp)$/i.test(filename);
}

let ready = false;
let packetLimit: number | null = null;
const PACKET_HEADROOM = 512 * 1024;

export function proofByteLimit(): number {
  return packetLimit === null
    ? MAX_PROOF_BYTES
    : Math.min(MAX_PROOF_BYTES, Math.max(0, packetLimit - PACKET_HEADROOM));
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
    console.error("[proofs] could not read max_allowed_packet:", e);
  }

  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_proofs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      card_id VARCHAR(64) NOT NULL,
      version INT NOT NULL DEFAULT 1,
      filename VARCHAR(255) NOT NULL DEFAULT '',
      mime VARCHAR(120) NOT NULL DEFAULT '',
      size_bytes INT NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'sent',
      note VARCHAR(1000) NOT NULL DEFAULT '',
      response VARCHAR(1000) NOT NULL DEFAULT '',
      uploaded_by VARCHAR(255) NOT NULL DEFAULT '',
      bytes LONGBLOB NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME NULL,
      INDEX (email),
      INDEX (card_id),
      INDEX (email, card_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

const COLUMNS = sql`id, email, card_id, version, filename, mime, size_bytes,
                    status, note, response, uploaded_by, created_at,
                    responded_at`;

const row = (r: Record<string, unknown>): Proof => ({
  id: Number(r.id),
  email: String(r.email ?? ""),
  cardId: String(r.card_id ?? ""),
  version: Number(r.version ?? 1),
  filename: String(r.filename ?? ""),
  mime: String(r.mime ?? ""),
  bytes: Number(r.size_bytes ?? 0),
  status: PROOF_STATUSES.includes(String(r.status) as ProofStatus)
    ? (String(r.status) as ProofStatus)
    : "sent",
  note: String(r.note ?? ""),
  response: String(r.response ?? ""),
  uploadedBy: String(r.uploaded_by ?? ""),
  createdAt: r.created_at ? String(r.created_at) : null,
  respondedAt: r.responded_at ? String(r.responded_at) : null,
});

export async function saveProof(input: {
  email: string;
  cardId: string;
  filename: string;
  mime: string;
  bytes: Buffer;
  note?: string;
  uploadedBy: string;
}): Promise<{ id: number; version: number } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  const cardId = input.cardId.trim();
  if (!email || !cardId) return { error: "Which advertiser, and which card?" };
  if (!proofTypeAllowed(input.mime, input.filename)) {
    return { error: "Send the proof as a PDF, JPEG, PNG or WebP." };
  }

  try {
    await ensureTable();
    const limit = proofByteLimit();
    if (input.bytes.length > limit) {
      return {
        error: `That file is ${Math.round(input.bytes.length / 1024 / 1024)}MB, over the ${Math.round(limit / 1024 / 1024)}MB this database will take in one go.`,
      };
    }

    const { db } = await import("@/lib/db");
    const prev = (await db.execute(
      sql`SELECT COALESCE(MAX(version), 0) + 1 AS n FROM lbs_proofs
          WHERE email = ${email} AND card_id = ${cardId}`,
    )) as unknown as [{ n: number }[]];
    const version = Number(prev[0]?.[0]?.n ?? 1);

    await db.execute(
      sql`INSERT INTO lbs_proofs
            (email, card_id, version, filename, mime, size_bytes, note,
             uploaded_by, bytes)
          VALUES (${email}, ${cardId}, ${version},
                  ${input.filename.slice(0, 255)}, ${input.mime.slice(0, 120)},
                  ${input.bytes.length}, ${(input.note ?? "").slice(0, 1000)},
                  ${input.uploadedBy.slice(0, 255)}, ${input.bytes})`,
    );
    const idRow = (await db.execute(
      sql`SELECT LAST_INSERT_ID() AS id`,
    )) as unknown as [{ id: number }[]];
    return { id: Number(idRow[0]?.[0]?.id ?? 0), version };
  } catch (e) {
    console.error("[proofs] save failed:", e);
    return { error: "That proof could not be saved." };
  }
}

/** Newest first, for one advertiser. */
export async function getProofsFor(
  email: string,
  cardId?: string,
): Promise<Proof[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      cardId
        ? sql`SELECT ${COLUMNS} FROM lbs_proofs
              WHERE email = ${email.toLowerCase()} AND card_id = ${cardId}
              ORDER BY id DESC`
        : sql`SELECT ${COLUMNS} FROM lbs_proofs
              WHERE email = ${email.toLowerCase()}
              ORDER BY id DESC`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map(row);
  } catch (e) {
    console.error("[proofs] read failed:", e);
    return [];
  }
}

/** The latest proof per advertiser and card, for the admin overview. */
export async function getLatestProofs(limit = 200): Promise<Proof[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    // The newest row per (email, card) pair. A join against the maximum
    // id rather than a window function, since the legacy database may be
    // MySQL 5.7 where those do not exist.
    const rows = (await db.execute(
      sql`SELECT ${COLUMNS} FROM lbs_proofs p
          WHERE p.id = (
            SELECT MAX(p2.id) FROM lbs_proofs p2
            WHERE p2.email = p.email AND p2.card_id = p.card_id
          )
          ORDER BY p.id DESC
          LIMIT ${sql.raw(String(Math.max(1, Math.min(500, limit))))}`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map(row);
  } catch (e) {
    console.error("[proofs] latest read failed:", e);
    return [];
  }
}

export async function getProofBytes(
  id: number,
): Promise<{ bytes: Buffer; mime: string; filename: string; email: string } | undefined> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT bytes, mime, filename, email FROM lbs_proofs
          WHERE id = ${id} LIMIT 1`,
    )) as unknown as [
      { bytes: Buffer; mime: string; filename: string; email: string }[],
    ];
    const r = rows[0]?.[0];
    return r
      ? {
          bytes: r.bytes,
          mime: String(r.mime ?? "application/octet-stream"),
          filename: String(r.filename ?? `proof-${id}`),
          email: String(r.email ?? ""),
        }
      : undefined;
  } catch (e) {
    console.error("[proofs] bytes read failed:", e);
    return undefined;
  }
}

/**
 * The advertiser's answer.
 *
 * Scoped by email as well as id, so an id belonging to somebody else's
 * proof changes nothing rather than changing theirs. Only a proof still
 * waiting can be answered: re-approving something already settled would
 * move its date and lose when it was actually agreed.
 */
export async function respondToProof(input: {
  id: number;
  email: string;
  status: Extract<ProofStatus, "approved" | "changes">;
  response?: string;
}): Promise<{ ok: true; proof: Proof } | { ok: false; error: string }> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`UPDATE lbs_proofs
          SET status = ${input.status},
              response = ${(input.response ?? "").slice(0, 1000)},
              responded_at = NOW()
          WHERE id = ${input.id} AND email = ${input.email.toLowerCase()}
            AND status = 'sent'`,
    );
    const rows = (await db.execute(
      sql`SELECT ${COLUMNS} FROM lbs_proofs
          WHERE id = ${input.id} AND email = ${input.email.toLowerCase()}
          LIMIT 1`,
    )) as unknown as [Record<string, unknown>[]];
    const found = rows[0]?.[0];
    if (!found) return { ok: false, error: "That proof is not yours." };
    const proof = row(found);
    if (proof.status === "sent") {
      return { ok: false, error: "That proof has already been answered." };
    }
    return { ok: true, proof };
  } catch (e) {
    console.error("[proofs] respond failed:", e);
    return { ok: false, error: "That did not save." };
  }
}
