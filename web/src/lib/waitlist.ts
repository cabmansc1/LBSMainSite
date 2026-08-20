import "server-only";
import { sql } from "drizzle-orm";

/**
 * Category waitlist.
 *
 * Somebody wanted a spot, their category was already taken on the card
 * that is filling, and they asked to be told when it frees up. That is
 * a warm lead with a stated category, which makes it the most valuable
 * thing the site captures short of a sale.
 *
 * This replaces an earlier attempt that wrote to `waitlist_entries` and
 * `mailing_zones` from the Drizzle schema. Nothing ever created those
 * tables: there are no migrations in this repo and no push step in the
 * build, so every submission threw ER_NO_SUCH_TABLE and the visitor got
 * a 500. Runtime-created `lbs_` tables are how the rest of the app does
 * this, so the waitlist does it that way too.
 *
 * Two things the old shape got wrong and this one fixes:
 *
 * The category was never stored. It went to Mission Control and nowhere
 * else, and the column held a hardcoded `category_id` of 0. A waitlist
 * that cannot say what somebody is waiting for answers no question.
 *
 * The zone was a foreign key into a table that does not exist. Zones
 * live in lib/zones.ts and are keyed by slug everywhere else in the app,
 * so the slug is stored directly and there is no join to get wrong.
 */

export type WaitlistEntry = {
  id: number;
  zoneSlug: string;
  category: string;
  email: string;
  businessName: string;
  notifiedAt: string | null;
  createdAt: string | null;
};

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_waitlist (
      id INT AUTO_INCREMENT PRIMARY KEY,
      zone_slug VARCHAR(120) NOT NULL DEFAULT '',
      category VARCHAR(160) NOT NULL DEFAULT '',
      email VARCHAR(255) NOT NULL,
      business_name VARCHAR(255) DEFAULT '',
      notified_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_lbs_waitlist (zone_slug, category, email(190)),
      INDEX (created_at),
      INDEX (notified_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

/**
 * Asking twice is not an error. The unique key covers zone, category
 * and email, so a repeat submission refreshes the row rather than
 * stacking duplicates, and a different category in the same zone is a
 * separate wait rather than a collision.
 *
 * Returns false when the write did not land. The caller has to know:
 * telling somebody they are on a list they are not on is the one
 * outcome worse than an error message.
 */
export async function addWaitlistEntry(input: {
  zoneSlug: string;
  category: string;
  email: string;
  businessName?: string;
}): Promise<boolean> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`INSERT INTO lbs_waitlist (zone_slug, category, email, business_name)
          VALUES (${input.zoneSlug}, ${input.category}, ${input.email},
                  ${input.businessName ?? ""})
          ON DUPLICATE KEY UPDATE
            business_name = VALUES(business_name),
            created_at = created_at`,
    );
    return true;
  } catch (e) {
    console.error("[waitlist] could not record entry:", e);
    return false;
  }
}

const row = (r: Record<string, unknown>): WaitlistEntry => ({
  id: Number(r.id),
  zoneSlug: String(r.zone_slug ?? ""),
  category: String(r.category ?? ""),
  email: String(r.email ?? ""),
  businessName: String(r.business_name ?? ""),
  notifiedAt: r.notified_at ? String(r.notified_at) : null,
  createdAt: r.created_at ? String(r.created_at) : null,
});

export async function getWaitlistEntries(): Promise<WaitlistEntry[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_waitlist
          ORDER BY notified_at IS NOT NULL, created_at DESC
          LIMIT 500`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map(row);
  } catch (e) {
    console.error("[waitlist] list failed:", e);
    return [];
  }
}

/** People still owed a reply. This is the number worth putting on a dashboard. */
export async function countWaitingEntries(): Promise<number> {
  await ensureTable();
  const { db } = await import("@/lib/db");
  const rows = (await db.execute(
    sql`SELECT COUNT(*) AS n FROM lbs_waitlist WHERE notified_at IS NULL`,
  )) as unknown as [{ n: number }[]];
  return Number(rows[0]?.[0]?.n ?? 0);
}

export async function setWaitlistNotified(
  ids: number[],
  notified: boolean,
): Promise<number> {
  const clean = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (clean.length === 0) return 0;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const list = sql.join(
      clean.map((id) => sql`${id}`),
      sql`, `,
    );
    const result = (await db.execute(
      notified
        ? sql`UPDATE lbs_waitlist SET notified_at = NOW() WHERE id IN (${list})`
        : sql`UPDATE lbs_waitlist SET notified_at = NULL WHERE id IN (${list})`,
    )) as unknown as [{ affectedRows?: number }];
    return result[0]?.affectedRows ?? 0;
  } catch (e) {
    console.error("[waitlist] could not update:", e);
    return 0;
  }
}

async function getWaitlistEntriesByIds(ids: number[]): Promise<WaitlistEntry[]> {
  if (ids.length === 0) return [];
  await ensureTable();
  const { db } = await import("@/lib/db");
  const rows = (await db.execute(
    sql`SELECT * FROM lbs_waitlist WHERE id IN (${sql.join(
      ids.map((id) => sql`${id}`),
      sql`, `,
    )})`,
  )) as unknown as [Record<string, unknown>[]];
  return (rows[0] ?? []).map(row);
}

export type WaitlistSendOutcome = {
  id: number;
  email: string;
  sent: boolean;
  /** Why it did not go, phrased for the person looking at the queue. */
  error?: string;
};

export type NotifyWaitlistResult = {
  outcomes: WaitlistSendOutcome[];
  sent: number;
  failed: number;
  /** Rows actually flipped to notified, which is only the ones that sent. */
  marked: number;
};

/**
 * Sending is what "notified" means, so the send happens first and only
 * the addresses the provider accepted get the timestamp.
 *
 * The old button set the flag on its own, which meant the queue could
 * reach empty with nobody having heard anything. A timestamp that
 * records an email nobody sent is worse than no timestamp: it retires
 * the row, so the promise is never kept and nothing is left to show it
 * was broken.
 *
 * One bad address does not stop the batch. A typo in row three is not a
 * reason the other nineteen should stay waiting, and every failure comes
 * back per recipient so the admin can see exactly who to chase. What
 * does stop the batch is a run of failures from the very start, because
 * that shape is a dead key or an unverified domain rather than a bad
 * address, and hammering the provider seventeen more times to collect
 * seventeen copies of the same error helps nobody.
 */
export async function notifyWaitlistEntries(
  ids: number[],
): Promise<NotifyWaitlistResult> {
  const clean = [
    ...new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n > 0)),
  ];
  const empty = { outcomes: [], sent: 0, failed: 0, marked: 0 };
  if (clean.length === 0) return empty;

  // Imported here rather than at the top of the file: the public
  // waitlist form imports this module on every submission and has no
  // use for a mailer or for Mission Control.
  const [{ sendEmail, emailEnabled }, { composeWaitlistNotice }] =
    await Promise.all([import("@/lib/email"), import("@/lib/waitlist-email")]);

  let entries: WaitlistEntry[];
  try {
    entries = await getWaitlistEntriesByIds(clean);
  } catch (e) {
    console.error("[waitlist] could not load rows to notify:", e);
    return empty;
  }

  // One lookup for the whole batch. A card that cannot be read just
  // means the notice goes out without a mail month, which the copy is
  // written to survive.
  const mailMonths = new Map<string, string>();
  try {
    const { getUpcomingMailings, mcEnabled } = await import(
      "@/lib/mission-control"
    );
    // Unconfigured Mission Control means getUpcomingMailings serves the
    // sample schedule. A web page showing a sample date can be reloaded
    // once the real one exists; an email cannot be taken back, and the
    // date in it is a written promise about when somebody's ad mails.
    // The notice reads correctly with no month, so it goes without one.
    if (mcEnabled()) {
      const { getLiveMailingAreaFor } = await import("@/lib/zone-store");
      for (const m of await getUpcomingMailings()) {
        if (!m.mailMonth) continue;
        // Recorded against every zone on the card. Somebody waiting on
        // Sullivan's Island is waiting on the Isle of Palms card, and
        // keying by the one slug Mission Control filed it under left
        // their notice with no date on it.
        const slugs =
          (await getLiveMailingAreaFor(m.zoneSlug))?.zoneSlugs ?? [m.zoneSlug];
        for (const slug of slugs) {
          if (!mailMonths.has(slug)) mailMonths.set(slug, m.mailMonth);
        }
      }
    }
  } catch (e) {
    console.error("[waitlist] no mail dates for notices:", e);
  }

  const preview = !emailEnabled();
  const outcomes: WaitlistSendOutcome[] = [];
  const delivered: number[] = [];
  let attempted = 0;
  let abandoned = false;

  for (const entry of entries) {
    if (abandoned) {
      outcomes.push({
        id: entry.id,
        email: entry.email,
        sent: false,
        error: "Not attempted. Sending stopped after the first tries failed.",
      });
      continue;
    }

    // Resend rate limits, and a queue of twenty is exactly the shape
    // that trips it. A pause between sends costs the admin seconds and
    // saves a batch that would otherwise come back half 429.
    if (attempted > 0 && !preview) await new Promise((r) => setTimeout(r, 350));

    const notice = composeWaitlistNotice({
      zoneSlug: entry.zoneSlug,
      category: entry.category,
      businessName: entry.businessName || undefined,
      mailMonth: mailMonths.get(entry.zoneSlug),
    });

    const result = await sendEmail({
      to: entry.email,
      subject: notice.subject,
      text: notice.text,
      html: notice.html,
    });
    attempted++;

    if (result.sent) {
      delivered.push(entry.id);
      outcomes.push({ id: entry.id, email: entry.email, sent: true });
    } else {
      outcomes.push({
        id: entry.id,
        email: entry.email,
        sent: false,
        // Preview mode is not a fault, but it is also not a send, and
        // the row stays waiting either way.
        error: preview
          ? "Nothing sent. Email is not configured in this environment."
          : (result.error ?? "The mail provider rejected it."),
      });
    }

    if (attempted >= 3 && delivered.length === 0) abandoned = true;
  }

  const marked = delivered.length
    ? await setWaitlistNotified(delivered, true)
    : 0;

  return {
    outcomes,
    sent: delivered.length,
    failed: outcomes.length - delivered.length,
    marked,
  };
}

export async function deleteWaitlistEntries(ids: number[]): Promise<number> {
  const clean = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (clean.length === 0) return 0;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const result = (await db.execute(
      sql`DELETE FROM lbs_waitlist WHERE id IN (${sql.join(
        clean.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )) as unknown as [{ affectedRows?: number }];
    return result[0]?.affectedRows ?? 0;
  } catch (e) {
    console.error("[waitlist] could not delete:", e);
    return 0;
  }
}

/**
 * Rows in the abandoned `waitlist_entries` table, if it exists at all.
 *
 * Near certainly zero, since nothing ever created it. Counted rather
 * than displayed because writing a reader for a table that was never
 * written to is speculative work, and a count is enough to prove the
 * assumption right or wrong. A missing table is the expected answer,
 * so the error is swallowed.
 */
export async function countLegacyWaitlistRows(): Promise<number> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM waitlist_entries`,
    )) as unknown as [{ n: number }[]];
    return Number(rows[0]?.[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export type ReassignResult =
  | { ok: true; merged: boolean; category: string }
  | { ok: false; error: string };

/**
 * Move somebody to the category you can actually sell them.
 *
 * "Your category is taken, but the one next to it is open" is an
 * ordinary sales conversation, and until now there was nowhere to
 * record the outcome: the row is keyed on zone, category and email, so
 * a different category was a separate entry rather than an edit, and
 * the only routes were asking them to re-join the public form or
 * editing the table by hand.
 *
 * notified_at is cleared, and that is the part that matters rather than
 * a nicety. The sweep only considers rows it has not notified, so a
 * reassignment that kept the old flag would move somebody to a category
 * they would never be told about — a worse outcome than leaving them
 * where they were, because the screen would show it had worked.
 */
export async function reassignWaitlistCategory(
  id: number,
  category: string,
): Promise<ReassignResult> {
  const entryId = Number(id);
  const next = String(category ?? "").trim();
  if (!Number.isInteger(entryId) || entryId <= 0) {
    return { ok: false, error: "That entry no longer exists." };
  }
  if (!next) return { ok: false, error: "Pick a category." };
  if (next.length > 160) return { ok: false, error: "That category is too long." };

  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const { categoryKey } = await import("@/lib/categories");

    const rows = (await db.execute(
      sql`SELECT zone_slug, category, email FROM lbs_waitlist WHERE id = ${entryId} LIMIT 1`,
    )) as unknown as [{ zone_slug: string; category: string; email: string }[]];
    const entry = rows[0]?.[0];
    if (!entry) return { ok: false, error: "That entry no longer exists." };

    // Same category typed differently is not a move. Compared on the key
    // Mission Control's hand-typed names are compared on everywhere
    // else, so "Real Estate" and "real estate" do not count as a change.
    if (categoryKey(String(entry.category)) === categoryKey(next)) {
      return { ok: true, merged: false, category: String(entry.category) };
    }

    // They may already be waiting on the category they are being moved
    // to, which the unique key would refuse. Refusing is the wrong
    // answer: the intent is that they end up waiting on it, and they
    // already are. So the row being moved goes and the existing one
    // stands, which is the same end state with one row instead of two.
    const dupe = (await db.execute(
      sql`SELECT id FROM lbs_waitlist
           WHERE zone_slug = ${entry.zone_slug}
             AND email = ${entry.email}
             AND LOWER(category) = LOWER(${next})
             AND id <> ${entryId}
           LIMIT 1`,
    )) as unknown as [{ id: number }[]];

    if ((dupe[0] ?? []).length > 0) {
      await db.execute(sql`DELETE FROM lbs_waitlist WHERE id = ${entryId}`);
      return { ok: true, merged: true, category: next };
    }

    await db.execute(
      sql`UPDATE lbs_waitlist
             SET category = ${next}, notified_at = NULL
           WHERE id = ${entryId}`,
    );
    return { ok: true, merged: false, category: next };
  } catch (e) {
    console.error("[waitlist] could not reassign:", e);
    return { ok: false, error: "That did not save." };
  }
}

/**
 * Take somebody off the list once they have bought the thing they were
 * waiting for.
 *
 * Nothing did this, so a person who joined the waitlist, got the notice
 * and then paid stayed on the list looking like they were still owed
 * something. It causes no wrong emails — they now hold the category, so
 * the sweep reads it as taken and says nothing — but the row outlives
 * its meaning and the dashboard counts it.
 *
 * Matched on all three of email, zone and category rather than any two.
 * Deleting every row for an address in a zone would take a category
 * they are still genuinely waiting on, and a wrongly deleted waitlist
 * row cannot be recovered from anywhere: nobody finds out until the
 * category frees up and the email that should have gone never does.
 *
 * The category comparison is categoryKey rather than a string match,
 * because these names are typed by hand in Mission Control and at
 * checkout, so "Mold Remediation" and "mold remediation" are one
 * category and would otherwise leave the row behind.
 */
export async function clearWaitlistForPurchase(input: {
  email: string;
  zoneSlug: string;
  category: string;
}): Promise<number> {
  const email = String(input.email ?? "").trim();
  const zoneSlug = String(input.zoneSlug ?? "").trim();
  const category = String(input.category ?? "").trim();
  // All three or nothing. A purchase missing any of them cannot identify
  // a row with enough confidence to delete it.
  if (!email || !zoneSlug || !category) return 0;

  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const { categoryKey } = await import("@/lib/categories");

    const rows = (await db.execute(
      sql`SELECT id, category FROM lbs_waitlist
           WHERE zone_slug = ${zoneSlug} AND email = ${email}`,
    )) as unknown as [{ id: number; category: string }[]];

    const want = categoryKey(category);
    const ids = (rows[0] ?? [])
      .filter((r) => categoryKey(String(r.category ?? "")) === want)
      .map((r) => Number(r.id));
    if (ids.length === 0) return 0;

    return await deleteWaitlistEntries(ids);
  } catch (e) {
    console.error("[waitlist] could not clear after purchase:", e);
    return 0;
  }
}
