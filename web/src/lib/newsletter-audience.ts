import "server-only";
import { sql } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  advertiserZoneIndex,
  getMcCustomers,
  getUpcomingCardRoster,
} from "@/lib/mission-control";

/**
 * Who the advertiser update goes to.
 *
 * Four groups, all built from data the app already holds, because the
 * whole argument for building this before anything else was that it
 * needs nothing new. Current advertisers come from the Mission Control
 * roster, past advertisers from the customer list behind it, directory
 * owners from directory_businesses, and older inquiries from the leads
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
  leads: "Inquiry",
};

export type Recipient = {
  /** Lowercase. The key for everything. */
  email: string;
  businessName: string;
  contactName: string;
  groups: AudienceGroup[];
};

/**
 * How far back to reach for inquiries that never became customers.
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

/**
 * Suppresses several addresses at once, for the admin screen.
 *
 * Reports what happened to each rather than a total, because the three
 * outcomes are not the same thing and collapsing them hides the one
 * that matters. "Already suppressed" is reassurance; "not an email
 * address" is a typo that would otherwise be silently dropped, and the
 * pasted-in list is exactly where typos come from.
 *
 * Duplicates in the input are folded first. A list copied out of a
 * spreadsheet routinely repeats an address several times, and reporting
 * it as five additions when it is one person reads as a bigger action
 * than it was.
 */
export type SuppressResult = {
  added: string[];
  already: string[];
  invalid: string[];
};

export async function optOutMany(
  emails: string[],
  source = "admin",
): Promise<SuppressResult> {
  const out: SuppressResult = { added: [], already: [], invalid: [] };
  const seen = new Set<string>();
  const existing = await listOptOuts();

  for (const raw of emails) {
    const addr = lower(raw);
    if (!addr || seen.has(addr)) continue;
    seen.add(addr);
    if (!looksLikeEmail(addr)) {
      out.invalid.push(clean(raw));
      continue;
    }
    if (existing.has(addr)) {
      out.already.push(addr);
      continue;
    }
    // Not batched into one INSERT. One address failing should not cost
    // the other eight, and this runs at most a few dozen rows deep from
    // a screen somebody is watching.
    if (await optOut(addr, source)) out.added.push(addr);
    else out.invalid.push(addr);
  }
  return out;
}

/**
 * Splits whatever was pasted into addresses.
 *
 * Newlines, commas, semicolons and spaces all separate, because the
 * list arrives from a spreadsheet column, a mail client's To field or a
 * message somebody typed, and which one it was is not worth asking.
 * Angle brackets are stripped so a pasted "Name <a@b.com>" works.
 */
export const parseEmailList = (text: string): string[] =>
  String(text ?? "")
    .split(/[\s,;]+/)
    .map((s) => s.replace(/^</, "").replace(/>$/, "").trim())
    .filter(Boolean);

/** One suppressed address, for the admin list. */
export type OptOutEntry = {
  email: string;
  optedOutAt: string | null;
  /** "link" when they pressed unsubscribe, "admin" when we did it. */
  source: string;
};

export async function listOptOutEntries(): Promise<OptOutEntry[]> {
  try {
    await ensureOptOutTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT email, opted_out_at, source
            FROM lbs_newsletter_optouts
           ORDER BY opted_out_at DESC, email ASC`,
    )) as unknown as [
      { email: string; opted_out_at: unknown; source: string }[],
    ];
    return (rows[0] ?? []).map((r) => ({
      email: lower(r.email),
      optedOutAt: r.opted_out_at ? new Date(r.opted_out_at as string).toISOString() : null,
      source: clean(r.source) || "link",
    }));
  } catch (e) {
    console.error("[newsletter] opt-out list failed:", e);
    return [];
  }
}

/**
 * Puts an address back on the list.
 *
 * Here because the screen that adds addresses in bulk needs a way to
 * undo one: suppressing the wrong customer is silent — they simply
 * never hear from us again — and a mistake with no way back is worse
 * than no screen at all.
 *
 * Deliberately not exposed publicly. Resubscribing somebody has to be
 * something we do on their word, never something a link can do.
 */
export async function removeOptOut(email: string): Promise<boolean> {
  const addr = lower(email);
  if (!addr) return false;
  try {
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`DELETE FROM lbs_newsletter_optouts WHERE email = ${addr}`,
    );
    return true;
  } catch (e) {
    console.error("[newsletter] opt-out removal failed:", e);
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
async function leadInquiries(months: number): Promise<Recipient[]> {
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
  /** Advertisers dropped because none of their cards are in a chosen zone. */
  outOfArea: number;
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
  /**
   * Zone slugs this issue is for. An advertiser is kept when at least
   * one of their cards is in one of them.
   *
   * Undefined means every zone, which is what the first drafts did
   * before anybody noticed the Midlands customers in the list. Empty
   * also means every zone, deliberately: an issue saved with nothing
   * ticked should reach the same people as before rather than silently
   * mail nobody.
   */
  zones?: string[],
): Promise<Audience> {
  const want = new Set(groups);
  const roster = await getUpcomingCardRoster();
  const mcReadable = roster !== null;

  const current = want.has("current") ? await currentAdvertisers() : [];
  const currentEmails = new Set(current.map((r) => r.email));
  const past = want.has("past") ? await pastAdvertisers(currentEmails) : [];
  const directory = want.has("directory") ? await directoryOwners() : [];
  const leads = want.has("leads") ? await leadInquiries(leadsMonths) : [];

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

  /**
   * Zone filtering applies to advertisers only.
   *
   * A directory listing is filed under an area Andrew maintains, and
   * every one of those is in the Lowcountry, so a listing owner is in
   * area by definition. An inquiry has only free text for a location and
   * nothing reliable to judge on. Dropping either for want of a card
   * would quietly shrink the list to people who have already bought,
   * which is the opposite of what it is for.
   */
  const wantZones = new Set(zones ?? []);
  const zoneIndex = wantZones.size ? await advertiserZoneIndex() : null;
  const inArea = (r: Recipient) => {
    if (!zoneIndex) return true;
    const advertiserOnly =
      !r.groups.includes("directory") && !r.groups.includes("leads");
    if (!advertiserOnly) return true;
    const theirs = zoneIndex.get(r.email);
    // No cards we can see is not evidence of being out of area, so they
    // stay. Being wrongly kept costs one email; being wrongly dropped
    // means a customer silently never hears from us again.
    if (!theirs || theirs.size === 0) return true;
    for (const z of theirs) if (wantZones.has(z)) return true;
    return false;
  };

  const opted = await listOptOuts();
  const beforeArea = [...folded.values()].filter((r) => !opted.has(r.email));
  const recipients = beforeArea.filter(inArea);

  const counts: Record<AudienceGroup, number> = {
    current: 0,
    past: 0,
    directory: 0,
    leads: 0,
  };
  for (const r of recipients) for (const g of r.groups) counts[g] += 1;

  return {
    outOfArea: beforeArea.length - recipients.length,
    recipients: recipients.sort((a, b) =>
      a.businessName.localeCompare(b.businessName) ||
      a.email.localeCompare(b.email),
    ),
    counts,
    suppressed: folded.size - beforeArea.length,
    mcReadable,
  };
}
