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
  let allListings: { name: string; email: string }[] = [];

  {
    const { db } = await import("@/lib/db");
    try {
      if (emails.length > 0) {
        // A login is an email address, so email is the whole of its
        // identity and there is nothing else to match on.
        const users = (await db.execute(
          sql`SELECT LOWER(email) AS email FROM directory_users
              WHERE LOWER(email) IN (${sql.join(
                emails.map((e) => sql`${e}`),
                sql`, `,
              )})`,
        )) as unknown as [{ email: string }[]];
        for (const r of users[0] ?? []) logins.add(String(r.email));
      }

      // Listings are different, and every name in the directory is
      // loaded rather than filtered by email, because email alone gets
      // this wrong. The two systems are typed by different people:
      // Mission Control can hold owner@ while the listing was created
      // under office@, and the business is the same business. Matching
      // on email only would report "no listing" for a listing that is
      // sitting right there, and the button next to that badge creates a
      // second one.
      const biz = (await db.execute(
        sql`SELECT business_name, LOWER(email) AS email FROM directory_businesses`,
      )) as unknown as [{ business_name: string; email: string | null }[]];
      allListings = (biz[0] ?? []).map((r) => ({
        name: String(r.business_name ?? ""),
        email: String(r.email ?? ""),
      }));
    } catch (e) {
      // The list is still worth showing without the annotations; what is
      // not acceptable is showing it with every row wrongly marked as
      // needing work, so this fails the whole read rather than half of it.
      console.error("[mc-accounts] existing account lookup failed:", e);
      return { rows: null, enabled: true };
    }
  }

  const { sameBusiness } = await import("@/lib/name-match");
  const listedEmails = new Set(allListings.map((l) => l.email).filter(Boolean));
  const hasListingFor = (c: McCustomer) => {
    if (c.email && listedEmails.has(c.email)) return true;
    if (!c.businessName.trim()) return false;
    return allListings.some((l) => sameBusiness(c.businessName, l.name));
  };

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
      hasListing: hasListingFor(c),
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
