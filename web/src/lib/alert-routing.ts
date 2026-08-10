import "server-only";
import { sql } from "drizzle-orm";
import { CATEGORY_KINDS, type ActivityKind } from "@/lib/admin-activity";

/**
 * Who hears about what, and how.
 *
 * Before this, the answer was three environment variables: one inbox for
 * every alert email, one list of phone numbers for every text, and a
 * push that went to whoever had switched it on. Changing any of it meant
 * editing Railway and redeploying, and there was no way to say that one
 * person wants artwork by text while another wants everything by email.
 *
 * A row per person, a column per channel, and a set of kinds they care
 * about. Small enough that the whole table is read and filtered in
 * memory: there will be a handful of these, and a query per channel per
 * event would be three queries to answer a question about four rows.
 *
 * An empty table means the old behaviour exactly. That matters more than
 * it looks: this is the notification path, and a half-configured screen
 * must never be the reason nobody was told a customer sent their
 * artwork. Falling back is the safe direction, so the fallback is what
 * happens whenever routing has nothing to say.
 */

export type AlertChannel = "email" | "sms" | "push";

export const CHANNELS: AlertChannel[] = ["email", "sms", "push"];

export const CHANNEL_LABEL: Record<AlertChannel, string> = {
  email: "Email",
  sms: "Text",
  push: "Push",
};

export type AlertRecipient = {
  id: number;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  /** Kinds this person wants, per channel. */
  prefs: Record<AlertChannel, ActivityKind[]>;
  /**
   * The kinds that existed the last time this row was saved.
   *
   * Without it, adding a new kind silently routes it to nobody: a row
   * cannot list a kind that did not exist when somebody ticked their
   * boxes, so it filters out of every recipient and the alert reaches
   * no one. Recording what was on offer is what separates "they said
   * no" from "they were never asked".
   */
  seenKinds: ActivityKind[];
};

/**
 * What was on offer before this was recorded.
 *
 * Rows saved before the column existed were offered exactly these, so
 * treating them as seen keeps a real opt-out an opt-out. The two kinds
 * missing from it — the advertiser update and event submissions — are
 * the ones added afterwards, and are exactly the ones that were going
 * nowhere.
 */
const BASELINE_SEEN: ActivityKind[] = [
  "artwork",
  "order",
  "refund",
  "inquiry",
  "signup",
  "listing_edit",
  "waitlist",
  "proof",
  "payment_gap",
];

const emptyPrefs = (): Record<AlertChannel, ActivityKind[]> => ({
  email: [],
  sms: [],
  push: [],
});

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_alert_recipients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL DEFAULT '',
      email VARCHAR(255) NOT NULL DEFAULT '',
      phone VARCHAR(32) NOT NULL DEFAULT '',
      active TINYINT NOT NULL DEFAULT 1,
      prefs TEXT NOT NULL,
      seen_kinds TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  // Added after the table shipped. Tolerated for the usual reason: the
  // only way it fails is that it is already there, and the alert path
  // must not break over a column it already has.
  try {
    await db.execute(
      sql`ALTER TABLE lbs_alert_recipients ADD COLUMN seen_kinds TEXT NULL`,
    );
  } catch {
    /* already there */
  }
  ready = true;
}

/**
 * Kinds deliberately sent nowhere.
 *
 * Separate from the recipient grid because it answers a different
 * question. The grid says who wants a thing; this says the thing is not
 * worth telling anybody about, which is not the same as everybody
 * happening to have unticked it — and it has to survive the fallback
 * that exists so a half-configured screen never swallows an alert.
 *
 * Its own table rather than a column, because it is a property of the
 * kind and not of any person.
 */
async function ensureMuteTable() {
  if (muteReady) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_alert_muted (
      kind VARCHAR(40) NOT NULL PRIMARY KEY,
      muted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  muteReady = true;
}

let muteReady = false;

export async function mutedKinds(): Promise<ActivityKind[]> {
  try {
    await ensureMuteTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT kind FROM lbs_alert_muted`,
    )) as unknown as [{ kind: string }[]];
    const known = new Set<string>(CATEGORY_KINDS);
    return (rows[0] ?? [])
      .map((r) => String(r.kind))
      .filter((k) => known.has(k)) as ActivityKind[];
  } catch (e) {
    // Unreadable means nothing is muted, which errs towards telling
    // somebody rather than towards silence.
    console.error("[alert-routing] muted read failed:", e);
    return [];
  }
}

export async function setMuted(
  kind: ActivityKind,
  muted: boolean,
): Promise<void> {
  try {
    await ensureMuteTable();
    const { db } = await import("@/lib/db");
    if (muted) {
      await db.execute(
        sql`INSERT IGNORE INTO lbs_alert_muted (kind) VALUES (${kind})`,
      );
    } else {
      await db.execute(sql`DELETE FROM lbs_alert_muted WHERE kind = ${kind}`);
    }
  } catch (e) {
    console.error("[alert-routing] mute save failed:", e);
  }
}

/** A stored list of kinds, with anything no longer real dropped. */
function parseKinds(raw: unknown, fallback: ActivityKind[]): ActivityKind[] {
  try {
    const parsed = JSON.parse(String(raw ?? ""));
    if (!Array.isArray(parsed)) return fallback;
    const known = new Set<string>(CATEGORY_KINDS);
    return parsed.map(String).filter((k) => known.has(k)) as ActivityKind[];
  } catch {
    return fallback;
  }
}

/** Anything stored that is no longer a real kind is dropped on read. */
function parsePrefs(raw: unknown): Record<AlertChannel, ActivityKind[]> {
  const out = emptyPrefs();
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "{}"));
  } catch {
    return out;
  }
  if (!parsed || typeof parsed !== "object") return out;
  const known = new Set<string>(CATEGORY_KINDS);
  for (const channel of CHANNELS) {
    const list = (parsed as Record<string, unknown>)[channel];
    if (!Array.isArray(list)) continue;
    out[channel] = list
      .map((k) => String(k))
      .filter((k) => known.has(k)) as ActivityKind[];
  }
  return out;
}

export async function getRecipients(): Promise<AlertRecipient[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT id, name, email, phone, active, prefs, seen_kinds
          FROM lbs_alert_recipients ORDER BY id`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map((r) => ({
      id: Number(r.id),
      name: String(r.name ?? ""),
      email: String(r.email ?? ""),
      phone: String(r.phone ?? ""),
      active: Number(r.active ?? 0) === 1,
      prefs: parsePrefs(r.prefs),
      seenKinds: parseKinds(r.seen_kinds, BASELINE_SEEN),
    }));
  } catch (e) {
    console.error("[alert-routing] read failed:", e);
    return [];
  }
}

export async function saveRecipient(input: {
  id?: number;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  prefs: Record<AlertChannel, ActivityKind[]>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (!email && !phone) {
    return { ok: false, error: "Give an email address or a phone number." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "That is not a valid email address." };
  }
  // Twilio wants E.164. Accepting "843 555 0100" here and failing at
  // send time would report the problem hours later, in a log.
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return {
      ok: false,
      error: "Phone must be in +1XXXXXXXXXX form, including the country code.",
    };
  }

  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const prefs = JSON.stringify(input.prefs);
    // Everything the screen could have shown them, so an untick is
    // recorded as a decision and a kind invented next month is not.
    const seen = JSON.stringify(CATEGORY_KINDS);
    if (input.id) {
      await db.execute(
        sql`UPDATE lbs_alert_recipients
            SET name = ${input.name.trim().slice(0, 120)}, email = ${email},
                phone = ${phone}, active = ${input.active ? 1 : 0},
                prefs = ${prefs}, seen_kinds = ${seen}
            WHERE id = ${input.id}`,
      );
    } else {
      await db.execute(
        sql`INSERT INTO lbs_alert_recipients
              (name, email, phone, active, prefs, seen_kinds)
            VALUES (${input.name.trim().slice(0, 120)}, ${email}, ${phone},
                    ${input.active ? 1 : 0}, ${prefs}, ${seen})`,
      );
    }
    return { ok: true };
  } catch (e) {
    console.error("[alert-routing] save failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

export async function deleteRecipient(id: number): Promise<void> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(sql`DELETE FROM lbs_alert_recipients WHERE id = ${id}`);
  } catch (e) {
    console.error("[alert-routing] delete failed:", e);
  }
}

/**
 * Who wants this kind of event on this channel.
 *
 * Returns null, not an empty array, when routing has nothing to say, so
 * the caller can tell "nobody is configured, use the environment" apart
 * from "somebody is configured and deliberately does not want this".
 * Collapsing those two is how a deliberate silence becomes a surprise
 * text at eleven at night.
 */
export async function routeFor(
  kind: ActivityKind,
  channel: AlertChannel,
): Promise<AlertRecipient[] | null> {
  // Muted means nobody, deliberately, and it is checked before
  // anything else so no fallback can talk over it.
  if ((await mutedKinds()).includes(kind)) return [];

  const all = await getRecipients();
  const usable = all.filter(
    (r) => r.active && (channel === "sms" ? r.phone : r.email),
  );
  if (usable.length === 0) return null;

  const wants = usable.filter(
    (r) =>
      r.prefs[channel].includes(kind) ||
      // Never offered this kind, so they have not turned it down. New
      // kinds reach the people already listening until somebody opens
      // the screen and decides otherwise.
      !r.seenKinds.includes(kind),
  );

  /*
   * Nobody at all is treated as nothing to say, not as silence.
   *
   * This is the file's own rule applied one level down. It used to hold
   * only for an empty table, so a configured table that happened to
   * cover none of a particular kind routed that kind into a hole — which
   * is how event submissions reached no one from the day they shipped.
   * A stray copy of an alert costs a deleted email; a missed one costs
   * somebody's event.
   */
  if (wants.length === 0) {
    console.warn(
      `[alert-routing] nobody is set up for ${kind} on ${channel}; using the default`,
    );
    return null;
  }
  return wants;
}

/** Addresses for an alert email, or null to fall back to LEAD_ALERT_EMAIL. */
export async function alertEmailsFor(
  kind: ActivityKind,
): Promise<string[] | null> {
  const routed = await routeFor(kind, "email");
  return routed === null ? null : routed.map((r) => r.email).filter(Boolean);
}
