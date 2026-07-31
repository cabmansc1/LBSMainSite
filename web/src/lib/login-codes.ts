import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";

/**
 * Six-digit sign-in codes.
 *
 * A code rather than a clickable link, because corporate mail scanners
 * pre-click links in incoming mail and burn single-use URLs before the
 * recipient ever sees them. A typed code cannot be consumed by a robot,
 * survives being forwarded, and works when someone reads the mail on a
 * phone while sitting at a desktop.
 *
 * Six digits is a million possibilities, which is only safe because of
 * the limits below. Without them it is a four-second brute force.
 *
 *   - hashed at rest, so a database read does not hand out logins
 *   - ten minute expiry
 *   - single use, consumed on success
 *   - five wrong guesses burns the code
 *   - rate limited per email, so requesting codes in bulk does not
 *     widen the guessing window
 */

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
/** Codes issued to one address inside the window. */
const MAX_PER_WINDOW = 5;
const REQUEST_WINDOW_MINUTES = 15;

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_login_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code_hash CHAR(64) NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      used_at DATETIME DEFAULT NULL,
      INDEX (email),
      INDEX (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  tableReady = true;
}

/** Emails are matched case-insensitively; people capitalise inconsistently. */
export const normalizeEmail = (e: string) => e.trim().toLowerCase();

/**
 * SHA-256, not bcrypt. The input is six digits from a set of a million
 * and lives for ten minutes, so a slow hash buys nothing an attacker
 * could not brute force anyway; the attempt limit is what protects it.
 * Hashing at rest is about not leaking live codes from a backup.
 */
const hash = (code: string) => createHash("sha256").update(code).digest("hex");

const sameHash = (a: string, b: string) => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

/** randomInt, not Math.random: this is a credential. */
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export type IssueResult =
  | { ok: true; code: string }
  | { ok: false; reason: "rate-limited" | "unavailable" };

/**
 * Issues a code and returns it for sending. The caller emails it; it is
 * never returned to the browser.
 */
export async function issueLoginCode(emailRaw: string): Promise<IssueResult> {
  const email = normalizeEmail(emailRaw);
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");

    const recent = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM lbs_login_codes
          WHERE email = ${email}
            AND created_at > (NOW() - INTERVAL ${REQUEST_WINDOW_MINUTES} MINUTE)`,
    )) as unknown as [{ n: number | string }[]];
    if (Number(recent[0]?.[0]?.n ?? 0) >= MAX_PER_WINDOW) {
      return { ok: false, reason: "rate-limited" };
    }

    // Any earlier live code for this address stops working. Two valid
    // codes at once doubles the guessing surface for no benefit, and
    // someone who asked twice is going to use the newer mail anyway.
    await db.execute(
      sql`UPDATE lbs_login_codes SET used_at = NOW()
          WHERE email = ${email} AND used_at IS NULL`,
    );

    const code = newCode();
    await db.execute(
      sql`INSERT INTO lbs_login_codes (email, code_hash, expires_at)
          VALUES (${email}, ${hash(code)},
                  (NOW() + INTERVAL ${CODE_TTL_MINUTES} MINUTE))`,
    );
    return { ok: true, code };
  } catch (e) {
    console.error("[login-codes] could not issue:", e);
    return { ok: false, reason: "unavailable" };
  }
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "too-many" | "unavailable" };

/**
 * Checks a code and consumes it on success.
 *
 * "invalid" covers both a wrong code and no code outstanding, on
 * purpose: distinguishing them tells an attacker which addresses have
 * requested a login.
 */
export async function verifyLoginCode(
  emailRaw: string,
  codeRaw: string,
): Promise<VerifyResult> {
  const email = normalizeEmail(emailRaw);
  const code = codeRaw.replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, reason: "invalid" };

  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT id, code_hash, attempts,
                 (expires_at < NOW()) AS expired
          FROM lbs_login_codes
          WHERE email = ${email} AND used_at IS NULL
          ORDER BY id DESC LIMIT 1`,
    )) as unknown as [
      { id: number; code_hash: string; attempts: number; expired: number }[],
    ];
    const row = rows[0]?.[0];
    if (!row) return { ok: false, reason: "invalid" };
    if (Number(row.expired) === 1) return { ok: false, reason: "expired" };
    if (Number(row.attempts) >= MAX_ATTEMPTS) {
      return { ok: false, reason: "too-many" };
    }

    if (!sameHash(row.code_hash, hash(code))) {
      // Count the miss before returning, so a guessing loop runs out.
      await db.execute(
        sql`UPDATE lbs_login_codes SET attempts = attempts + 1 WHERE id = ${row.id}`,
      );
      const left = MAX_ATTEMPTS - (Number(row.attempts) + 1);
      return { ok: false, reason: left <= 0 ? "too-many" : "invalid" };
    }

    // Consume it. The used_at guard makes a replayed request a no-op
    // even if two verifications race.
    const consumed = (await db.execute(
      sql`UPDATE lbs_login_codes SET used_at = NOW()
          WHERE id = ${row.id} AND used_at IS NULL`,
    )) as unknown as [{ affectedRows?: number }];
    if ((consumed[0]?.affectedRows ?? 0) === 0) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[login-codes] could not verify:", e);
    return { ok: false, reason: "unavailable" };
  }
}

/** Housekeeping. Codes are worthless once expired; do not hoard them. */
export async function purgeExpiredCodes(): Promise<void> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`DELETE FROM lbs_login_codes
          WHERE expires_at < (NOW() - INTERVAL 1 DAY)`,
    );
  } catch (e) {
    console.error("[login-codes] purge failed:", e);
  }
}

export const CODE_TTL = CODE_TTL_MINUTES;
