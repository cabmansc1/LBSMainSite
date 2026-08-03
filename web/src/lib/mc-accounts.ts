import "server-only";
import { sql } from "drizzle-orm";
import { getMcCustomers, mcEnabled, type McCustomer } from "@/lib/mission-control";

/**
 * Bringing the existing customer list into the site.
 *
 * Mission Control has been the customer record for far longer than this
 * site has existed, so most advertisers have never had a reason to touch
 * the website: no order here, no listing here, no login here. The portal
 * already knows how to show somebody their cards, because it matches a
 * signed-in account to Mission Control by email, but they could not get
 * as far as signing in.
 *
 * This is the admin's side of closing that. Sign-in itself now accepts a
 * Mission Control customer as evidence that an address has earned an
 * account, so most of them need nothing from this screen at all. What
 * the screen adds is the deliberate version: see the whole customer
 * list, see who is already set up, and create logins and listings ahead
 * of time so their information is in the site before they arrive.
 *
 * Nothing here emails anybody. Every address on this list belongs to a
 * paying customer, which makes a careless bulk send more costly than
 * usual, so contacting them stays a separate decision made on a list you
 * have already looked at.
 */

export type McAccountRow = McCustomer & {
  hasLogin: boolean;
  hasListing: boolean;
  /** The site category a new listing would get, when MC's word matches
   *  one we actually filter on. Empty means the admin picks it later. */
  categorySlug: string;
  /** Set when nothing can be done for this row, with the reason. */
  blocked?: string;
};

export type McAccountRoster = {
  /** Null when Mission Control is not configured or did not answer. */
  rows: McAccountRow[] | null;
  enabled: boolean;
};

/**
 * MC's category is a free-text trade name; the directory filters on
 * slugs. A word that does not match one is left empty rather than
 * guessed at: a listing filed under a category nothing filters on is
 * invisible in a way that looks like the import silently failed.
 */
async function categorySlugs(): Promise<Map<string, string>> {
  const { getFilterOptions } = await import("@/lib/directory");
  const options = await getFilterOptions();
  const map = new Map<string, string>();
  for (const c of options.categories) {
    map.set(c.slug, c.slug);
    map.set(c.name.trim().toLowerCase(), c.slug);
  }
  return map;
}

const slugish = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function getMcAccountRoster(): Promise<McAccountRoster> {
  if (!mcEnabled()) return { rows: null, enabled: false };

  const customers = await getMcCustomers();
  if (!customers) return { rows: null, enabled: true };

  const emails = customers.map((c) => c.email).filter(Boolean);
  const logins = new Set<string>();
  const listings = new Set<string>();

  if (emails.length > 0) {
    const { db } = await import("@/lib/db");
    const list = sql.join(
      emails.map((e) => sql`${e}`),
      sql`, `,
    );
    try {
      const users = (await db.execute(
        sql`SELECT LOWER(email) AS email FROM directory_users
            WHERE LOWER(email) IN (${list})`,
      )) as unknown as [{ email: string }[]];
      for (const r of users[0] ?? []) logins.add(String(r.email));

      const biz = (await db.execute(
        sql`SELECT LOWER(email) AS email FROM directory_businesses
            WHERE LOWER(email) IN (${list})`,
      )) as unknown as [{ email: string }[]];
      for (const r of biz[0] ?? []) listings.add(String(r.email));
    } catch (e) {
      // The list is still worth showing without the annotations; what is
      // not acceptable is showing it with every row wrongly marked as
      // needing work, so this fails the whole read rather than half of it.
      console.error("[mc-accounts] existing account lookup failed:", e);
      return { rows: null, enabled: true };
    }
  }

  const slugs = await categorySlugs();
  const slugFor = (raw: string) => {
    const name = raw.trim().toLowerCase();
    if (!name || name === "other") return "";
    return slugs.get(name) ?? slugs.get(slugish(raw)) ?? "";
  };

  return {
    enabled: true,
    rows: customers.map((c) => ({
      ...c,
      hasLogin: !!c.email && logins.has(c.email),
      hasListing: !!c.email && listings.has(c.email),
      categorySlug: slugFor(c.category),
      blocked: c.email ? undefined : "No email in Mission Control",
    })),
  };
}

export type BulkResult = {
  created: number;
  skipped: number;
  errors: { email: string; error: string }[];
};

/**
 * Everything below re-reads Mission Control rather than trusting what
 * the browser posted. The request says which customers to act on; what
 * is written about them comes from the record, so a tampered payload can
 * name somebody else's email but cannot invent a business to file under
 * it.
 */
async function selected(emails: string[]): Promise<McAccountRow[]> {
  const wanted = new Set(
    emails.map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
  if (wanted.size === 0) return [];
  const { rows } = await getMcAccountRoster();
  return (rows ?? []).filter((r) => r.email && wanted.has(r.email));
}

/** Splits "Jane Doe" the way the users table stores it. */
function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export async function createLoginsFor(emails: string[]): Promise<BulkResult> {
  const { createLoginForEmail } = await import("@/lib/admin-data");
  const out: BulkResult = { created: 0, skipped: 0, errors: [] };

  for (const row of await selected(emails)) {
    if (row.hasLogin) {
      out.skipped++;
      continue;
    }
    try {
      const result = await createLoginForEmail({
        email: row.email,
        ...splitName(row.contactName),
      });
      if (result.ok) {
        // created is false when the address already had an account that
        // the roster had not seen, which is a skip and not a failure.
        if (result.created) out.created++;
        else out.skipped++;
      } else {
        out.errors.push({ email: row.email, error: result.error });
      }
    } catch (e) {
      out.errors.push({
        email: row.email,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return out;
}

/**
 * Creates the directory listing for a customer, unverified.
 *
 * Unverified is the existing pending state: the public directory only
 * shows rows that are active, verified and not hidden, and the admin's
 * Approve button is exactly `is_verified = 1`. So these land in the
 * queue that already exists and nothing about a business appears in
 * public because an import ran. That matters more here than anywhere
 * else, because these businesses did not ask to be listed; they bought a
 * postcard spot.
 */
export async function createListingsFor(emails: string[]): Promise<BulkResult> {
  const { createBusiness, createLoginForEmail } = await import("@/lib/admin-data");
  const out: BulkResult = { created: 0, skipped: 0, errors: [] };

  for (const row of await selected(emails)) {
    if (row.hasListing || !row.businessName.trim()) {
      out.skipped++;
      continue;
    }
    try {
      await createBusiness({
        name: row.businessName,
        email: row.email,
        phone: row.phone,
        category: row.categorySlug || undefined,
        isVerified: false,
      });
      // Ties the new listing to their login, so it is already theirs to
      // edit when they first sign in. Safe to call for an address that
      // already has an account: it returns the existing one.
      await createLoginForEmail({
        email: row.email,
        ...splitName(row.contactName),
      });
      out.created++;
    } catch (e) {
      out.errors.push({
        email: row.email,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return out;
}
