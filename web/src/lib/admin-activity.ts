import "server-only";
import { sql } from "drizzle-orm";
import { alreadyApplied } from "@/lib/db-errors";

/**
 * Things the admin should know happened.
 *
 * Until this, the only way to hear that a customer had sent their
 * artwork was an email, which is fine until the day it lands under
 * fifty others and the card goes to print with a hole in it. The same
 * event now reaches every channel that is switched on.
 *
 * A log rather than a set of "what is new" queries across six tables.
 * Those tables disagree about what a timestamp means, several have none
 * worth trusting, and a feed assembled from them has to be reassembled
 * every time a seventh thing becomes worth knowing. One append-only row
 * per event is also exactly what push and SMS need: a title, a line of
 * detail, and somewhere to go.
 *
 * Recording is never allowed to fail the thing it describes. An artwork
 * upload that succeeded must not report an error because a notification
 * table was unreachable, so everything here swallows its own failures
 * and says so in the log.
 */

export type ActivityKind =
  | "artwork"
  | "order"
  | "inquiry"
  | "signup"
  | "listing_edit"
  | "waitlist"
  | "refund"
  | "proof"
  // Money taken that Mission Control never heard about. Its own kind
  // rather than an order, because an order is good news and this is the
  // opposite, and somebody may well want it on a different channel.
  | "payment_gap"
  // The fortnight's advertiser update has been assembled and is waiting
  // to be read. Never a send; the send is a button somebody presses.
  | "newsletter"
  // Somebody outside the business has put an event forward. Nothing is
  // public until it is read, so this is a queue notice, not an alarm.
  | "event_submission";

export type ActivityEvent = {
  kind: ActivityKind;
  /** One line. This is the push notification title and the SMS opener. */
  title: string;
  /** The useful specifics: who, which card, how much. */
  detail?: string;
  /** Site-relative path to whatever this is about. */
  href?: string;
};

export type ActivityRow = ActivityEvent & {
  id: number;
  createdAt: string;
};

/** Every kind, for anything that has to offer a choice of all of them. */
export const CATEGORY_KINDS: ActivityKind[] = [
  "artwork",
  "order",
  "refund",
  "inquiry",
  "signup",
  "listing_edit",
  "waitlist",
  "proof",
  "payment_gap",
  "newsletter",
  "event_submission",
];

export const KIND_LABEL: Record<ActivityKind, string> = {
  artwork: "Artwork",
  order: "Order",
  inquiry: "Inquiry",
  signup: "Signup",
  listing_edit: "Listing change",
  waitlist: "Waitlist",
  refund: "Refund",
  proof: "Proof",
  payment_gap: "Payment not in MC",
  newsletter: "Newsletter ready",
  event_submission: "Event submitted",
};

let ready = false;

async function ensureTables() {
  if (ready) return;
  const { db } = await import("@/lib/db");

  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_admin_activity (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kind VARCHAR(32) NOT NULL,
      title VARCHAR(255) NOT NULL,
      detail VARCHAR(500) NOT NULL DEFAULT '',
      href VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (created_at),
      INDEX (kind, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  // Per admin, not global. Two people sharing one "everything is read"
  // marker means whoever looks first clears the badge for the other.
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_admin_seen (
      email VARCHAR(255) NOT NULL PRIMARY KEY,
      last_seen_id INT NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  for (const alter of [
    "ALTER TABLE lbs_admin_activity ADD COLUMN href VARCHAR(255) NOT NULL DEFAULT ''",
  ]) {
    try {
      await db.execute(sql.raw(alter));
    } catch (e) {
      if (!alreadyApplied(e)) throw e;
    }
  }

  ready = true;
}

/**
 * Records an event and tells every switched-on channel about it.
 *
 * Call from inside after(), so a slow push service never delays the
 * response to the customer whose action caused this.
 */
export async function recordActivity(event: ActivityEvent): Promise<void> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`INSERT INTO lbs_admin_activity (kind, title, detail, href)
          VALUES (${event.kind}, ${event.title.slice(0, 255)},
                  ${(event.detail ?? "").slice(0, 500)},
                  ${(event.href ?? "").slice(0, 255)})`,
    );
  } catch (e) {
    // The badge and the feed lose this one. Not a reason to fail the
    // upload or the order that caused it.
    console.error("[activity] could not record:", event.kind, e);
  }

  // Each channel is independent: SMS being misconfigured must not stop a
  // push, and neither must throw into the caller.
  const fanout = [
    import("@/lib/push").then((m) => m.pushToAdmins(event)),
    import("@/lib/alerts-sms").then((m) => m.smsAlert(event)),
    import("@/lib/alerts-slack").then((m) => m.slackAlert(event)),
  ];
  const results = await Promise.allSettled(fanout);
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[activity] channel failed:", r.reason);
    }
  }
}

/** How many events this admin has not seen. */
export async function unseenCount(email: string): Promise<number> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM lbs_admin_activity
          WHERE id > COALESCE(
            (SELECT last_seen_id FROM lbs_admin_seen WHERE email = ${email.toLowerCase()}),
            0)`,
    )) as unknown as [{ n: number | string }[]];
    return Number(rows[0]?.[0]?.n ?? 0);
  } catch (e) {
    // Zero, not a crash. A badge is the least important thing on the
    // page and must never be the reason it fails to render.
    console.error("[activity] unseen count failed:", e);
    return 0;
  }
}

export type ActivityFeed = {
  rows: ActivityRow[];
  /** Ids above this are new to this admin. */
  lastSeenId: number;
};

export async function recentActivity(
  email: string,
  limit = 30,
): Promise<ActivityFeed> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const seen = (await db.execute(
      sql`SELECT last_seen_id FROM lbs_admin_seen WHERE email = ${email.toLowerCase()}`,
    )) as unknown as [{ last_seen_id: number }[]];

    const rows = (await db.execute(
      sql`SELECT id, kind, title, detail, href, created_at
          FROM lbs_admin_activity
          ORDER BY id DESC
          LIMIT ${sql.raw(String(Math.max(1, Math.min(200, limit))))}`,
    )) as unknown as [
      {
        id: number;
        kind: string;
        title: string;
        detail: string;
        href: string;
        created_at: string;
      }[],
    ];

    return {
      lastSeenId: Number(seen[0]?.[0]?.last_seen_id ?? 0),
      rows: (rows[0] ?? []).map((r) => ({
        id: Number(r.id),
        kind: String(r.kind) as ActivityKind,
        title: String(r.title ?? ""),
        detail: String(r.detail ?? ""),
        href: String(r.href ?? ""),
        createdAt: r.created_at ? String(r.created_at) : "",
      })),
    };
  } catch (e) {
    console.error("[activity] feed read failed:", e);
    return { rows: [], lastSeenId: 0 };
  }
}

/**
 * Moves this admin's marker up to the newest event.
 *
 * Deliberately takes the id the page rendered rather than reading the
 * maximum again. Something arriving between the render and this call
 * would otherwise be marked as read without ever having been on screen.
 */
export async function markSeen(email: string, throughId: number): Promise<void> {
  if (!Number.isInteger(throughId) || throughId <= 0) return;
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`INSERT INTO lbs_admin_seen (email, last_seen_id)
          VALUES (${email.toLowerCase()}, ${throughId})
          ON DUPLICATE KEY UPDATE
            last_seen_id = GREATEST(last_seen_id, VALUES(last_seen_id))`,
    );
  } catch (e) {
    console.error("[activity] could not mark seen:", e);
  }
}
