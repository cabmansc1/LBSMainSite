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
};

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
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
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
      sql`SELECT id, name, email, phone, active, prefs
          FROM lbs_alert_recipients ORDER BY id`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map((r) => ({
      id: Number(r.id),
      name: String(r.name ?? ""),
      email: String(r.email ?? ""),
      phone: String(r.phone ?? ""),
      active: Number(r.active ?? 0) === 1,
      prefs: parsePrefs(r.prefs),
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
    if (input.id) {
      await db.execute(
        sql`UPDATE lbs_alert_recipients
            SET name = ${input.name.trim().slice(0, 120)}, email = ${email},
                phone = ${phone}, active = ${input.active ? 1 : 0},
                prefs = ${prefs}
            WHERE id = ${input.id}`,
      );
    } else {
      await db.execute(
        sql`INSERT INTO lbs_alert_recipients (name, email, phone, active, prefs)
            VALUES (${input.name.trim().slice(0, 120)}, ${email}, ${phone},
                    ${input.active ? 1 : 0}, ${prefs})`,
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
  const all = await getRecipients();
  const usable = all.filter(
    (r) => r.active && (channel === "sms" ? r.phone : r.email),
  );
  if (usable.length === 0) return null;
  return usable.filter((r) => r.prefs[channel].includes(kind));
}

/** Addresses for an alert email, or null to fall back to LEAD_ALERT_EMAIL. */
export async function alertEmailsFor(
  kind: ActivityKind,
): Promise<string[] | null> {
  const routed = await routeFor(kind, "email");
  return routed === null ? null : routed.map((r) => r.email).filter(Boolean);
}
