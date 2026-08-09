import "server-only";
import { sql } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getMcCustomers, getUpcomingCardRoster } from "@/lib/mission-control";

/**
 * Who the advertiser update goes to.
 *
 * Four groups, all built from data the app already holds, because the
 * whole argument for building this before anything else was that it
 * needs nothing new. Current advertisers come from the Mission Control
 * roster, past advertisers from the customer list behind it, directory
 * owners from directory_businesses, and older enquiries from the leads
 * table.
 *
 * Somebody can legitimately be in several at once: a current advertiser
 * who also has a listing and once filled in the quiz is one person and
 * gets one email. Folding by address is what makes that true, and the
 * groups they matched are kept so the admin can see why each address is
 * on the list.
 */

export type AudienceGroup = "current" | "past" | "directory" | "leads";

export const AUDIENCE_LABELS: Record<AudienceGroup, string> = {
  current: "Current advertiser",
  past: "Past advertiser",
  directory: "Directory listing",
  leads: "Enquiry",
};

export type Recipient = {
  /** Lowercase. The key for everything. */
  email: string;
  businessName: string;
  contactName: string;
  groups: AudienceGroup[];
};

/**
 * How far back to reach for enquiries that never became customers.
 *
 * A setting rather than a constant because it is the one number here
 * with a judgement in it. Somebody who asked about a card two years ago
 * and never wrote again is a spam complaint waiting to happen; somebody
 * who asked last month is a warm lead. Twelve months is the default, and
 * it is on the screen so it can be argued with.
 */
export const LEADS_WINDOW_KEY = "newsletter_leads_months";
export const DEFAULT_LEADS_MONTHS = 12;

const clean = (v: unknown) => String(v ?? "").trim();
const lower = (v: unknown) => clean(v).toLowerCase();

/** A shape that could plausibly be delivered to. Not validation, a filter. */
const looksLikeEmail = (s: string) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(s);

/* ---------- opt-outs ---------- */

let optOutReady = false;

async function ensureOptOutTable() {
  if (optOutReady) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_newsletter_optouts (
      email VARCHAR(191) NOT NULL PRIMARY KEY,
      kind VARCHAR(24) NOT NULL DEFAULT 'advertiser',
      opted_out_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      source VARCHAR(64) NOT NULL DEFAULT ''
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  optOutReady = true;
}

/**
 * Records an unsubscribe.
 *
 * Creates the table on a public path, which is the one place that is
 * worth doing: the alternative is an unsubscribe link that fails for the
 * very first person to click it, and there is no worse thing to get
 * wrong on a bulk email.
 */
export async function optOut(email: string, source = "link"): Promise<boolean> {
  const addr = lower(email);
  if (!addr) return false;
  try {
    await ensureOptOutTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`INSERT INTO lbs_newsletter_optouts (email, source)
          VALUES (${addr}, ${source.slice(0, 64)})
          ON DUPLICATE KEY UPDATE opted_out_at = CURRENT_TIMESTAMP`,
    );
    return true;
  } catch (e) {
    console.error("[newsletter] opt-out failed:", e);
    return false;
  }
}

export async function listOptOuts(): Promise<Set<string>> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT email FROM lbs_newsletter_optouts`,
    )) as unknown as [{ email: string }[]];
    return new Set((rows[0] ?? []).map((r) => lower(r.email)));
  } catch {
    // No table yet means nobody has ever unsubscribed. An unreadable one
    // is different and dangerous, so the send path checks this separately
    // and refuses rather than mailing an unknown suppression list.
    return new Set();
  }
}

/** Whether the opt-out list could be read at all. */
export async function optOutsReadable(): Promise<boolean> {
  try {
    await ensureOptOutTable();
    const { db } = await import("@/lib/db");
    await db.execute(sql`SELECT COUNT(*) AS n FROM lbs_newsletter_optouts`);
    return true;
  } catch (e) {
    console.error("[newsletter] opt-out list unreadable:", e);
    return false;
  }
}

/* ---------- unsubscribe tokens ---------- */

const tokenSecret = () =>
  process.env.AUTH_SECRET ?? "dev-only-secret-change-me";

/**
 * A per-address unsubscribe token.
 *
 * Derived rather than stored, so an unsubscribe link keeps working
 * however long the email sits in an inbox, and nothing has to be cleaned
 * up. Signed so the link cannot be used to unsubscribe somebody else by
 * editing the address in the URL, which is the whole risk with a plain
 * ?email= link.
 */
export const unsubscribeToken = (email: string) =>
  createHmac("sha256", tokenSecret())
    .update(`unsub:${lower(email)}`)
    .digest("hex")
    .slice(0, 32);

export function unsubscribeTokenValid(email: string, token: string): boolean {
  const want = Buffer.from(unsubscribeToken(email));
  const got = Buffer.from(String(token ?? ""));
  // Compared in constant time and only when the lengths match, since
  // timingSafeEqual throws on a length mismatch rather than returning false.
  return want.length === got.length && timingSafeEqual(want, got);
}

/* ---------- the four groups ---------- */

/**
 * Everyone with a spot on a card that has not mailed yet.
 *
 * Prospects are excluded. A parked category is a row we created to hold
 * a slot, not a business that agreed to anything, and mailing one an
 * update about "your card" would be the first they had heard of it.
 */
async function currentAdvertisers(): Promise<Recipient[]> {
  const roster = await getUpcomingCardRoster();
  if (!roster) return [];
  const out = new Map<string, Recipient>();
  for (const card of roster) {
    for (const a of card.advertisers) {
      if (a.isProspect) continue;
      const email = lower(a.email);
      if (!looksLikeEmail(email)) continue;
      if (!out.has(email)) {
        out.set(email, {
          email,
          businessName: a.businessName,
          contactName: "",
          groups: ["current"],
        });
      }
    }
  }
  return [...out.values()];
}

/** Bought before, nothing upcoming. */
async function pastAdvertisers(currentEmails: Set<string>): Promise<Recipient[]> {
  const customers = await getMcCustomers();
  if (!customers) return [];
  return customers
    .filter((c) => looksLikeEmail(c.email) && !currentEmails.has(c.email))
    .map((c) => ({
      email: c.email,
      businessName: c.businessName,
      contactName: c.contactName,
      groups: ["past" as AudienceGroup],
    }));
}

/** Businesses with a live listing. */
async function directoryOwners(): Promise<Recipient[]> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT business_name, email
            FROM directory_businesses
           WHERE is_active = 1 AND is_verified = 1 AND is_hidden = 0
             AND email IS NOT NULL AND email <> ''`,
    )) as unknown as [{ business_name: string; email: string }[]];
    return (rows[0] ?? [])
      .map((r) => ({
        email: lower(r.email),
        businessName: clean(r.business_name),
        contactName: "",
        groups: ["directory" as AudienceGroup],
      }))
      .filter((r) => looksLikeEmail(r.email));
  } catch (e) {
    console.error("[newsletter] directory audience failed:", e);
    return [];
  }
}

/**
 * People who asked about advertising and never bought.
 *
 * SELECT * rather than a column list on purpose. This table predates the
 * migration and its shape is not declared anywhere in this codebase;
 * naming a column that turns out not to exist is exactly the mistake
 * that took the public directory down, and here it would break the
 * newsletter rather than one page. Reading fields off the row gives
 * undefined for anything missing, which the filters below drop.
 */
async function leadEnquiries(months: number): Promise<Recipient[]> {
  const out = new Map<string, Recipient>();
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM leads
           WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
           ORDER BY created_at DESC
           LIMIT 2000`,
    )) as unknown as [Record<string, unknown>[]];
    for (const r of rows[0] ?? []) {
      const email = lower(r.email);
      if (!looksLikeEmail(email) || out.has(email)) continue;
      out.set(email, {
        email,
        businessName: clean(r.company_name),
        contactName: clean(r.contact_name),
        groups: ["leads"],
      });
    }
  } catch (e) {
    console.error("[newsletter] leads audience failed:", e);
  }
  return [...out.values()];
}

export type Audience = {
  recipients: Recipient[];
  counts: Record<AudienceGroup, number>;
  suppressed: number;
  /** True when Mission Control answered. False means the advertiser
   *  groups are missing, not empty, and a send should not go out. */
  mcReadable: boolean;
};

/**
 * The whole list, folded and suppressed.
 *
 * Order matters when folding. Current advertisers are resolved first so
 * their business name is the one that sticks, since Mission Control's
 * spelling of a name is the one on the card and the one they will
 * recognise.
 */
export async function buildAudience(
  groups: AudienceGroup[],
  leadsMonths = DEFAULT_LEADS_MONTHS,
): Promise<Audience> {
  const want = new Set(groups);
  const roster = await getUpcomingCardRoster();
  const mcReadable = roster !== null;

  const current = want.has("current") ? await currentAdvertisers() : [];
  const currentEmails = new Set(current.map((r) => r.email));
  const past = want.has("past") ? await pastAdvertisers(currentEmails) : [];
  const directory = want.has("directory") ? await directoryOwners() : [];
  const leads = want.has("leads") ? await leadEnquiries(leadsMonths) : [];

  const folded = new Map<string, Recipient>();
  for (const r of [...current, ...past, ...directory, ...leads]) {
    const existing = folded.get(r.email);
    if (!existing) {
      folded.set(r.email, { ...r, groups: [...r.groups] });
      continue;
    }
    for (const g of r.groups) {
      if (!existing.groups.includes(g)) existing.groups.push(g);
    }
    // Earlier groups win the name, but a blank one is worth filling.
    existing.businessName ||= r.businessName;
    existing.contactName ||= r.contactName;
  }

  const opted = await listOptOuts();
  const recipients = [...folded.values()].filter((r) => !opted.has(r.email));

  const counts: Record<AudienceGroup, number> = {
    current: 0,
    past: 0,
    directory: 0,
    leads: 0,
  };
  for (const r of recipients) for (const g of r.groups) counts[g] += 1;

  return {
    recipients: recipients.sort((a, b) =>
      a.businessName.localeCompare(b.businessName) ||
      a.email.localeCompare(b.email),
    ),
    counts,
    suppressed: folded.size - recipients.length,
    mcReadable,
  };
}
