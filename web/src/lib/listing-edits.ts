import "server-only";
import { sql } from "drizzle-orm";
import { alreadyApplied } from "@/lib/db-errors";
import type { SessionUser } from "@/lib/auth";
import { updateBusiness, type BusinessPatch } from "@/lib/admin-data";

/**
 * Advertiser-side writes to a directory listing.
 *
 * Until now the only endpoint that could write directory_businesses was
 * the admin one, so an advertiser wanting a new phone number had to
 * email us and wait. Two things are needed to change that: a way for a
 * login to take ownership of the listing that carries its email, and a
 * way to edit it afterwards.
 *
 * Editing is split rather than uniform, because the fields are not
 * equally consequential:
 *
 *   Published immediately. Phone, website, email, description, opening
 *   hours and social links. These are the things an advertiser actually
 *   wants to fix at 9pm on a Sunday, and a wrong one costs us nothing
 *   that a later edit does not undo. Making them wait behind a review
 *   queue is how a portal earns a reputation for being slower than
 *   sending an email.
 *
 *   Queued for review. Name, category and location area. These decide
 *   where a listing appears and which business we think it is: category
 *   and location are what the directory filters on, and the name is what
 *   Mission Control matches campaigns against. A business quietly
 *   re-categorising itself changes what we are selling, so it stays with
 *   an admin.
 *
 * Nothing here regenerates the slug. A listing's URL is printed on cards
 * and encoded in QR codes, so a rename must not break it; updateBusiness
 * already leaves the column alone and this relies on that.
 */

/** Published the moment they hit save. Keys are BusinessPatch keys. */
export const INSTANT_FIELDS = [
  "phone",
  "email",
  "website",
  "description",
  "facebookUrl",
  "instagramUrl",
  "tiktokUrl",
  "youtubeUrl",
  "linkedinUrl",
  "showHours",
] as const;

/** Held for an admin. Keys are BusinessPatch keys. */
export const REVIEW_FIELDS = ["name", "category", "locationArea"] as const;

export type InstantField = (typeof INSTANT_FIELDS)[number];
export type ReviewField = (typeof REVIEW_FIELDS)[number];
export type EditableField = InstantField | ReviewField;

const INSTANT = new Set<string>(INSTANT_FIELDS);
const REVIEW = new Set<string>(REVIEW_FIELDS);

/** Human names, for the advertiser's confirmation and the admin queue. */
export const FIELD_LABELS: Record<EditableField, string> = {
  name: "Business name",
  category: "Category",
  locationArea: "Location area",
  phone: "Phone",
  email: "Listing email",
  website: "Website",
  description: "Description",
  facebookUrl: "Facebook",
  instagramUrl: "Instagram",
  tiktokUrl: "TikTok",
  youtubeUrl: "YouTube",
  linkedinUrl: "LinkedIn",
  showHours: "Show hours",
};

export type AccountListing = {
  id: number;
  slug: string;
  name: string;
  category: string;
  locationArea: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  showHours: boolean;
  /** What they are entitled to. Photos and offers are paid features. */
  planType: string;
  /** Linked to this login by user_id. Editing requires it. */
  owned: boolean;
  /** Matched by email with no owner yet, so this login may claim it. */
  claimable: boolean;
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const bool = (v: unknown) => v === 1 || v === true || v === "1";

/**
 * The listing, if this account has any business with it at all.
 *
 * The same two-way rule the portal reads with: owned outright, or
 * matched by email and waiting to be claimed. Anything else returns
 * undefined, so callers cannot accidentally act on a stranger's row by
 * passing its id.
 */
export async function getListingForAccount(
  user: SessionUser,
  id: number,
): Promise<AccountListing | undefined> {
  const { db } = await import("@/lib/db");
  const rows = (await db.execute(
    sql`SELECT id, slug, business_name, category, location_area, city, phone,
               email, website, description, facebook_url, instagram_url,
               tiktok_url, youtube_url, linkedin_url, show_hours, plan_type,
               user_id
        FROM directory_businesses
        WHERE id = ${id}
          AND (user_id = ${user.id} OR (user_id IS NULL AND email = ${user.email}))
        LIMIT 1`,
  )) as unknown as [Record<string, unknown>[]];

  const r = rows[0]?.[0];
  if (!r) return undefined;

  const ownerId = r.user_id === null || r.user_id === undefined ? null : Number(r.user_id);
  return {
    id: Number(r.id),
    slug: str(r.slug),
    name: str(r.business_name),
    category: str(r.category),
    locationArea: str(r.location_area),
    city: str(r.city),
    phone: str(r.phone),
    email: str(r.email),
    website: str(r.website),
    description: str(r.description),
    facebookUrl: str(r.facebook_url),
    instagramUrl: str(r.instagram_url),
    tiktokUrl: str(r.tiktok_url),
    youtubeUrl: str(r.youtube_url),
    linkedinUrl: str(r.linkedin_url),
    // Null means the legacy admin never touched the toggle. Hours that
    // exist should show, so an untouched listing counts as on.
    showHours: r.show_hours === null || r.show_hours === undefined ? true : bool(r.show_hours),
    planType: str(r.plan_type) || "basic",
    owned: ownerId !== null && ownerId === user.id,
    claimable: ownerId === null,
  };
}

/**
 * Links a listing to this login.
 *
 * The authorization is the WHERE clause rather than a check above it:
 * the row must still be unowned and must still carry this account's
 * email at the moment of the write. Two people racing to claim the same
 * listing means the second UPDATE matches nothing, instead of both
 * reading "unowned" and the loser silently taking it.
 *
 * Email match is the whole proof of ownership, which is only as strong
 * as how the account was created. That is fine while accounts come from
 * an order, an import or an admin; it is worth revisiting if self-serve
 * registration ever opens up.
 */
export async function claimListing(
  user: SessionUser,
  id: number,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const listing = await getListingForAccount(user, id);
  if (!listing) return { ok: false, error: "That listing is not yours to claim." };
  if (listing.owned) return { ok: true, slug: listing.slug };
  if (!listing.claimable) {
    return { ok: false, error: "That listing already belongs to another account." };
  }

  const { db } = await import("@/lib/db");
  await db.execute(
    sql`UPDATE directory_businesses
        SET user_id = ${user.id}
        WHERE id = ${id} AND user_id IS NULL AND email = ${user.email}`,
  );

  // Read back rather than trusting affectedRows: this has to be certain
  // before the portal starts offering edit controls for the row.
  const check = (await db.execute(
    sql`SELECT user_id FROM directory_businesses WHERE id = ${id} LIMIT 1`,
  )) as unknown as [{ user_id: number | null }[]];
  const owner = check[0]?.[0]?.user_id;

  return Number(owner) === user.id
    ? { ok: true, slug: listing.slug }
    : { ok: false, error: "Someone else claimed that listing first." };
}

/* ---------- validation ---------- */

const MAX_DESCRIPTION = 4000;

/**
 * Tidies a URL the way somebody types one.
 *
 * "facebook.com/joesbbq" is what people write, and storing it as typed
 * produces a link that resolves against our own domain. Anything that
 * is not http(s) is rejected outright: these strings end up in an href
 * on a public page.
 */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".")) return null;
  return url.toString().slice(0, 500);
}

export const looksLikeEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

/**
 * Checks one field and returns what should be stored.
 *
 * Category and location are checked against the live taxonomy because
 * they are slugs the directory filters on: a value that is not in the
 * list produces a listing that appears nowhere, and queueing it for
 * review would only move that discovery to an admin.
 */
async function cleanField(
  field: EditableField,
  raw: unknown,
): Promise<{ value: string | boolean } | { error: string }> {
  if (field === "showHours") return { value: raw === true || raw === "true" };

  const value = String(raw ?? "").trim();

  switch (field) {
    case "name": {
      if (value.length < 2) return { error: "Enter your business name." };
      return { value: value.slice(0, 255) };
    }
    case "phone": {
      if (!value) return { value: "" };
      const { looksLikePhone } = await import("@/lib/profile");
      return looksLikePhone(value)
        ? { value: value.slice(0, 32) }
        : { error: "That does not look like a phone number." };
    }
    case "email": {
      if (!value) return { value: "" };
      return looksLikeEmail(value)
        ? { value: value.slice(0, 255) }
        : { error: "That does not look like an email address." };
    }
    case "description": {
      return value.length > MAX_DESCRIPTION
        ? { error: `Keep the description under ${MAX_DESCRIPTION} characters.` }
        : { value };
    }
    case "website":
    case "facebookUrl":
    case "instagramUrl":
    case "tiktokUrl":
    case "linkedinUrl":
    case "youtubeUrl": {
      const url = normalizeUrl(value);
      return url === null ? { error: "That does not look like a web address." } : { value: url };
    }
    case "category":
    case "locationArea": {
      if (!value) return { error: "Choose one from the list." };
      const { getFilterOptions } = await import("@/lib/directory");
      const options = await getFilterOptions();
      const allowed = new Set(
        (field === "category" ? options.categories : options.locations).map((o) => o.slug),
      );
      return allowed.has(value) ? { value } : { error: "Choose one from the list." };
    }
  }
}

/* ---------- the review queue ---------- */

export type PendingEdit = {
  id: number;
  businessId: number;
  field: EditableField;
  label: string;
  oldValue: string;
  newValue: string;
  requestedBy: string;
  createdAt: string | null;
};

/** A pending edit with enough about the listing for the admin queue. */
export type PendingEditForReview = PendingEdit & {
  businessName: string;
  slug: string;
};

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_listing_edits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      field VARCHAR(32) NOT NULL,
      old_value TEXT,
      new_value TEXT,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      requested_by VARCHAR(255) NOT NULL DEFAULT '',
      requested_by_user_id INT NULL,
      reviewed_by VARCHAR(255) NOT NULL DEFAULT '',
      reviewed_at DATETIME NULL,
      review_note VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (business_id),
      INDEX (status),
      INDEX (business_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  // CREATE TABLE IF NOT EXISTS does nothing to a table that already
  // exists, so review_note needs its own step for any install that ran
  // the first version. Duplicate column is the expected outcome on
  // every run after the first.
  try {
    await db.execute(
      sql`ALTER TABLE lbs_listing_edits
          ADD COLUMN review_note VARCHAR(500) NOT NULL DEFAULT '' AFTER reviewed_at`,
    );
  } catch (e) {
    // Drizzle wraps the driver error, so the MySQL code is on `cause`
    // rather than on the error itself.
    if (!alreadyApplied(e)) {
      console.error("[listing-edits] could not add review_note column:", e);
    }
  }

  ready = true;
}

const editRow = (r: Record<string, unknown>): PendingEdit => {
  const field = str(r.field) as EditableField;
  return {
    id: Number(r.id),
    businessId: Number(r.business_id),
    field,
    label: FIELD_LABELS[field] ?? field,
    oldValue: str(r.old_value),
    newValue: str(r.new_value),
    requestedBy: str(r.requested_by),
    createdAt: r.created_at ? String(r.created_at) : null,
  };
};

/** What each of these listings is waiting on us for. */
export async function pendingEditsFor(
  businessIds: number[],
): Promise<Map<number, PendingEdit[]>> {
  const out = new Map<number, PendingEdit[]>();
  if (businessIds.length === 0) return out;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT id, business_id, field, old_value, new_value, requested_by, created_at
          FROM lbs_listing_edits
          WHERE status = 'pending'
            AND business_id IN (${sql.join(
              businessIds.map((i) => sql`${i}`),
              sql`, `,
            )})
          ORDER BY id DESC`,
    )) as unknown as [Record<string, unknown>[]];
    for (const r of rows[0] ?? []) {
      const edit = editRow(r);
      const list = out.get(edit.businessId) ?? [];
      list.push(edit);
      out.set(edit.businessId, list);
    }
  } catch (e) {
    console.error("[listing-edits] pending lookup failed:", e);
  }
  return out;
}

export type SaveResult = {
  /** Fields that are live on the public page now. */
  published: EditableField[];
  /** Fields sent for review, with what they would become. Carries the
   *  before and after because the notification to the admin is only
   *  useful if it says what is actually being asked for. */
  queued: { field: ReviewField; from: string; to: string }[];
  /** Per-field problems. Any of these and nothing is written at all. */
  errors: Partial<Record<EditableField, string>>;
  /** The listing's slug, so the caller can revalidate its public page. */
  slug: string;
};

/**
 * Applies an advertiser's edit, splitting it between publish and review.
 *
 * Validation happens for every field before anything is written. A
 * half-saved form where the phone went through and the website did not
 * is the kind of thing people only notice after they have closed the
 * tab.
 *
 * Unchanged values are dropped rather than written, which is what keeps
 * a re-save from filling the review queue with rows that change
 * nothing.
 */
export async function saveListingEdits(
  user: SessionUser,
  listing: AccountListing,
  patch: Record<string, unknown>,
): Promise<SaveResult> {
  const result: SaveResult = {
    published: [],
    queued: [],
    errors: {},
    slug: listing.slug,
  };

  const instant: BusinessPatch = {};

  for (const [key, raw] of Object.entries(patch)) {
    if (!INSTANT.has(key) && !REVIEW.has(key)) continue;
    const field = key as EditableField;

    const cleaned = await cleanField(field, raw);
    if ("error" in cleaned) {
      result.errors[field] = cleaned.error;
      continue;
    }

    const current = listing[field];
    if (cleaned.value === current) continue;

    if (INSTANT.has(field)) {
      (instant as Record<string, unknown>)[field] = cleaned.value;
      result.published.push(field);
    } else {
      result.queued.push({
        field: field as ReviewField,
        from: String(current ?? ""),
        to: String(cleaned.value),
      });
    }
  }

  if (Object.keys(result.errors).length > 0) {
    return { ...result, published: [], queued: [], slug: listing.slug };
  }

  if (result.published.length > 0) {
    await updateBusiness(listing.id, instant);
  }

  if (result.queued.length > 0) {
    await ensureTable();
    const { db } = await import("@/lib/db");
    for (const q of result.queued) {
      // A newer request replaces the one already waiting. Otherwise
      // changing your mind twice leaves an admin three versions of the
      // same field to reason about, and approving the wrong one is a
      // silent revert.
      await db.execute(
        sql`UPDATE lbs_listing_edits SET status = 'superseded'
            WHERE business_id = ${listing.id} AND field = ${q.field} AND status = 'pending'`,
      );
      await db.execute(
        sql`INSERT INTO lbs_listing_edits
              (business_id, field, old_value, new_value, requested_by, requested_by_user_id)
            VALUES (${listing.id}, ${q.field}, ${q.from}, ${q.to},
                    ${user.email}, ${user.id})`,
      );
    }
  }

  return result;
}

/* ---------- admin side ---------- */

/** Everything waiting on a decision, oldest first: they have waited longest. */
export async function getPendingEdits(limit = 200): Promise<PendingEditForReview[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT e.id, e.business_id, e.field, e.old_value, e.new_value,
                 e.requested_by, e.created_at,
                 b.business_name, b.slug
          FROM lbs_listing_edits e
          LEFT JOIN directory_businesses b ON b.id = e.business_id
          WHERE e.status = 'pending'
          ORDER BY e.id ASC
          LIMIT ${limit}`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map((r) => ({
      ...editRow(r),
      businessName: str(r.business_name),
      slug: str(r.slug),
    }));
  } catch (e) {
    console.error("[listing-edits] queue lookup failed:", e);
    return [];
  }
}

/** How many are waiting, for the admin dashboard. */
export async function countPendingEdits(): Promise<number> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM lbs_listing_edits WHERE status = 'pending'`,
    )) as unknown as [{ n: number | string }[]];
    return Number(rows[0]?.[0]?.n ?? 0);
  } catch (e) {
    console.error("[listing-edits] count failed:", e);
    return 0;
  }
}

/**
 * Approves or rejects one queued change.
 *
 * Approving writes through updateBusiness, the same path the admin
 * screens use, so a name change here behaves exactly like a name change
 * there: the slug is left alone and the printed URL keeps working.
 *
 * The row is only marked decided after the write succeeds. A failed
 * UPDATE that still cleared the queue would lose the request entirely.
 */
export type ReviewResult =
  | {
      ok: true;
      slug: string;
      /** Everything the advertiser's notification needs, so the caller
       *  does not have to go back to the database to send it. */
      field: ReviewField;
      businessName: string;
      newValue: string;
      requestedBy: string;
      /** What the admin typed when rejecting, for the advertiser's email. */
      note: string;
    }
  | { ok: false; error: string };

/**
 * A note is only meaningful on a rejection.
 *
 * Kept on the row rather than only in the email, because "what did we
 * tell them?" is the first question when they call back about it, and
 * an outbound message we cannot see is not an answer.
 */
export async function reviewEdit(
  id: number,
  decision: "approve" | "reject",
  adminEmail: string,
  note = "",
): Promise<ReviewResult> {
  await ensureTable();
  const { db } = await import("@/lib/db");

  const rows = (await db.execute(
    sql`SELECT e.id, e.business_id, e.field, e.new_value, e.status,
               e.requested_by, b.slug, b.business_name
        FROM lbs_listing_edits e
        LEFT JOIN directory_businesses b ON b.id = e.business_id
        WHERE e.id = ${id} LIMIT 1`,
  )) as unknown as [Record<string, unknown>[]];
  const row = rows[0]?.[0];
  if (!row) return { ok: false, error: "That request no longer exists." };
  if (str(row.status) !== "pending") {
    return { ok: false, error: "That request has already been decided." };
  }

  const field = str(row.field) as EditableField;
  if (!REVIEW.has(field)) {
    return { ok: false, error: "That field is not reviewable." };
  }

  if (decision === "approve") {
    try {
      await updateBusiness(Number(row.business_id), {
        [field]: str(row.new_value),
      } as BusinessPatch);
    } catch (e) {
      console.error("[listing-edits] approve failed to apply:", e);
      return { ok: false, error: "The change could not be applied." };
    }
  }

  // Only on a rejection: a note filed against an approval would never
  // be read, and would make "why was this rejected" a question you have
  // to check the status to answer.
  const stored = decision === "reject" ? note.trim().slice(0, 500) : "";

  await db.execute(
    sql`UPDATE lbs_listing_edits
        SET status = ${decision === "approve" ? "approved" : "rejected"},
            reviewed_by = ${adminEmail},
            reviewed_at = NOW(),
            review_note = ${stored}
        WHERE id = ${id}`,
  );

  return {
    ok: true,
    slug: str(row.slug),
    field: field as ReviewField,
    businessName: str(row.business_name),
    newValue: str(row.new_value),
    requestedBy: str(row.requested_by),
    note: stored,
  };
}
