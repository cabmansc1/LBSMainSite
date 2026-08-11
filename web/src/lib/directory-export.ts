import "server-only";
import { sql } from "drizzle-orm";
import { usingSampleData, getBusinesses } from "@/lib/directory";
import { richTextToPlain } from "@/lib/rich-text";

/**
 * The directory as a CSV somebody else can import.
 *
 * The column names and their order are fixed by the receiving panel's
 * template, not by us, so they are written out literally rather than
 * derived from our own field names. Only `name` is required over there;
 * everything else may be blank, which is why nothing here invents a
 * value to fill a gap.
 *
 * This reads the legacy tables directly instead of going through
 * getBusinesses(). That helper composes `address` into one display
 * string ("123 Main St, Summerville, SC 29483") and never surfaces
 * email, so an export built on it could not fill address_line1,
 * postal_code or email — the four columns most worth having.
 *
 * Images come out as URLs rather than bytes, since a CSV cell cannot
 * hold a picture. Whatever imports this has to fetch them while this
 * app and the legacy host are both still up, which is the one part of
 * the export with an expiry date on it.
 */

/**
 * Fixed by the destination's template. Order is part of the contract.
 *
 * The order follows the destination's own documentation. Nothing reads
 * a CSV by position when it has a header row, so this is for whoever
 * opens the file in a spreadsheet before uploading it.
 */
export const EXPORT_COLUMNS = [
  "name",
  "category",
  "community",
  "short_description",
  "description",
  "address_line1",
  "city",
  "state",
  "postal_code",
  "phone",
  "email",
  "website_url",
  "image_url",
  "logo_url",
  // The destination documents the bare names as canonical and treats
  // facebook_url / facebook_link / facebook_page as variants of them.
  // No reason to rely on the alias matching when the real name is known.
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "tags",
  "locally_owned",
  // Not one of theirs. Last, so an importer reading by header name
  // ignores it and a spreadsheet can drop it off the end without
  // disturbing a column before it.
  "photo_urls",
] as const;

export type ExportRow = Record<(typeof EXPORT_COLUMNS)[number], string>;

/** Promoted to its own column, so it is not repeated in `tags`. */
const LOCALLY_OWNED = "locally-owned";

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const prettify = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * A blurb for listings that have only one description.
 *
 * Cut on a sentence when there is one inside the limit, because half a
 * sentence with an ellipsis reads like the data is damaged. Otherwise
 * cut on a word.
 */
function shorten(text: string, limit = 200): string {
  if (text.length <= limit) return text;
  const window = text.slice(0, limit);
  const sentence = window.search(/[.!?](?=\s|$)(?!.*[.!?](?=\s|$))/);
  if (sentence >= 60) return window.slice(0, sentence + 1);
  const word = window.lastIndexOf(" ");
  return `${window.slice(0, word > 60 ? word : limit).trimEnd()}…`;
}

/** Where a bare handle lives, per platform. */
const SOCIAL_HOSTS = {
  facebook: (h: string) => `https://www.facebook.com/${h}`,
  instagram: (h: string) => `https://www.instagram.com/${h}`,
  tiktok: (h: string) => `https://www.tiktok.com/@${h}`,
  youtube: (h: string) => `https://www.youtube.com/@${h}`,
} as const;

/**
 * A social field as something that can actually be opened.
 *
 * These columns have been filled in by hand through the legacy admin
 * for years and hold whatever was pasted: full URLs, bare domains, and
 * handles with or without an @. The listing page uses the value
 * directly as an href, so anything that is not already a URL has been
 * a broken link there too — this does not make the export worse, it
 * just stops carrying the breakage into the next database.
 *
 * Only two guesses are made, both conservative: a scheme-less domain
 * gets https://, and a bare handle gets the platform's canonical
 * profile URL. Anything already absolute passes through untouched.
 */
function socialUrl(
  platform: keyof typeof SOCIAL_HOSTS,
  raw: unknown,
): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  // Protocol-relative, which browsers accept and importers usually do not.
  if (v.startsWith("//")) return `https:${v}`;
  // Looks like a host: has a dot, no spaces, and nothing that would
  // make it a sentence someone typed into the wrong box.
  if (/^[^\s@]+\.[^\s]+$/.test(v)) return `https://${v}`;
  // A handle. Strip the @ the platform adds back itself.
  const handle = v.replace(/^@+/, "");
  if (/^[A-Za-z0-9._-]+$/.test(handle)) return SOCIAL_HOSTS[platform](handle);
  // Something else entirely — a note, a phone number, a sentence.
  // Passed through rather than mangled into a URL that resolves
  // somewhere real and wrong.
  return v;
}

/**
 * RFC 4180. Quote anything containing a delimiter, a quote, a newline
 * or edge whitespace; double the quotes inside.
 *
 * No UTF-8 BOM. Excel wants one to render accents, but an importer
 * matching header names literally sees the first column as "﻿name"
 * and drops every row. Matching headers is what this file is for.
 */
const cell = (v: string) =>
  /[",\r\n]|^\s|\s$/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

export function toCsv(rows: ExportRow[]): string {
  const lines = [EXPORT_COLUMNS.join(",")];
  for (const r of rows) {
    lines.push(EXPORT_COLUMNS.map((c) => cell(r[c] ?? "")).join(","));
  }
  // CRLF: the spec's line ending, and the one Excel does not argue with.
  return lines.join("\r\n") + "\r\n";
}

export type ExportOptions = {
  /**
   * Include listings the public directory hides — unverified, inactive
   * or explicitly hidden. Off by default: the export is meant to carry
   * the directory as it is published, and an unapproved listing has not
   * been published anywhere yet.
   */
  includeHidden?: boolean;
  /**
   * Absolute origin for images this app serves out of the database.
   *
   * Whatever reads this CSV is on another machine, so a relative
   * "/api/business-image/12" resolves against *their* host and 404s.
   * The caller passes the origin the request arrived on, which is by
   * definition a hostname that reaches this app.
   */
  origin?: string;
};

/** Everything the CSV needs, in the destination's shape. */
export async function exportRows(
  opts: ExportOptions = {},
): Promise<ExportRow[]> {
  if (usingSampleData()) return sampleRows(opts.origin);

  const { db } = await import("@/lib/db");
  const gate = opts.includeHidden
    ? sql`1 = 1`
    : sql`b.is_active = 1 AND b.is_verified = 1 AND b.is_hidden = 0`;

  const [rows] = (await db.execute(
    sql`SELECT b.id, b.business_name, b.category, b.location_area, b.address,
               b.city, b.state, b.zip_code, b.phone, b.email, b.website,
               b.description, b.extended_description,
               b.facebook_url, b.instagram_url, b.tiktok_url, b.youtube_url
        FROM directory_businesses b
        WHERE ${gate}
        ORDER BY b.business_name`,
  )) as unknown as [Record<string, unknown>[]];

  const list = rows ?? [];
  if (list.length === 0) return [];

  // Category and location are stored as slugs; the taxonomy tables hold
  // the label a human reads. Falling back to a prettified slug means a
  // listing filed under something the taxonomy has since dropped still
  // exports as "Lawn Care" rather than "lawn-care".
  const [catRows] = (await db.execute(
    sql`SELECT slug, display_name FROM directory_categories`,
  )) as unknown as [Record<string, unknown>[]];
  const [locRows] = (await db.execute(
    sql`SELECT slug, display_name FROM directory_locations`,
  )) as unknown as [Record<string, unknown>[]];
  const catLabel = new Map(
    (catRows ?? []).map((c) => [String(c.slug), String(c.display_name)]),
  );
  const locLabel = new Map(
    (locRows ?? []).map((l) => [String(l.slug), String(l.display_name)]),
  );

  const [tagRows] = (await db.execute(
    sql`SELECT bt.business_id, t.display_name, t.slug
        FROM directory_business_tags bt
        INNER JOIN directory_tags t ON t.id = bt.tag_id
        WHERE bt.business_id IN (${sql.join(
          list.map((r) => sql`${Number(r.id)}`),
          sql`, `,
        )})
        ORDER BY t.display_order, t.display_name`,
  )) as unknown as [Record<string, unknown>[]];

  const tagsByBiz = new Map<number, { name: string; slug: string }[]>();
  for (const t of tagRows ?? []) {
    const id = Number(t.business_id);
    const list = tagsByBiz.get(id) ?? [];
    list.push({ name: String(t.display_name), slug: String(t.slug) });
    tagsByBiz.set(id, list);
  }

  const imagesByBiz = await imageUrls(
    list.map((r) => Number(r.id)),
    opts.origin,
  );

  return list.map((r) => {
    const tags = tagsByBiz.get(Number(r.id)) ?? [];
    const locallyOwned = tags.some(
      (t) => norm(t.slug) === LOCALLY_OWNED || norm(t.name) === LOCALLY_OWNED,
    );

    // The listing body, then whatever the legacy "extended" field holds.
    // Both are stored as the editor's markup, which no importer should
    // be asked to parse.
    const body = richTextToPlain(String(r.description ?? ""));
    const extended = richTextToPlain(String(r.extended_description ?? ""));
    const full = [body, extended].filter(Boolean).join(" ");

    const category = r.category ? String(r.category) : "";
    const community = r.location_area ? String(r.location_area) : "";

    return {
      name: String(r.business_name ?? "").trim(),
      category: category
        ? (catLabel.get(category) ?? prettify(category))
        : "",
      community: community
        ? (locLabel.get(community) ?? prettify(community))
        : String(r.city ?? ""),
      short_description: shorten(body || full),
      description: full,
      address_line1: String(r.address ?? "").trim(),
      city: String(r.city ?? "").trim(),
      // Every listing in this directory is in South Carolina, but the
      // column exists so a stored value wins over the assumption.
      state: String(r.state ?? "").trim() || "SC",
      postal_code: String(r.zip_code ?? "").trim(),
      phone: String(r.phone ?? "").trim(),
      email: String(r.email ?? "").trim(),
      website_url: String(r.website ?? "").trim(),
      tags: tags
        .filter(
          (t) =>
            norm(t.slug) !== LOCALLY_OWNED && norm(t.name) !== LOCALLY_OWNED,
        )
        .map((t) => t.name)
        .join(";"),
      locally_owned: locallyOwned ? "true" : "false",
      ...pictures(imagesByBiz.get(Number(r.id))),
      facebook: socialUrl("facebook", r.facebook_url),
      instagram: socialUrl("instagram", r.instagram_url),
      tiktok: socialUrl("tiktok", r.tiktok_url),
      youtube: socialUrl("youtube", r.youtube_url),
    };
  });
}

/**
 * Split what a listing has into the destination's two picture slots.
 *
 * image_url is the big photo on the card and the profile; logo_url is
 * the mark. They are different things over there, and here the first
 * real photograph is the former and the uploaded logo is the latter.
 *
 * A listing with a logo and no photographs still needs something on
 * its card, so the logo stands in. That is better than a blank card,
 * and it is what our own listing pages already do.
 */
function pictures(
  imgs: { logo: string; photos: string[] } | undefined,
): { image_url: string; logo_url: string; photo_urls: string } {
  const logo = imgs?.logo ?? "";
  const photos = imgs?.photos ?? [];
  return {
    image_url: photos[0] ?? logo,
    logo_url: logo,
    photo_urls: photos.slice(1).join(";"),
  };
}

/**
 * Every image a listing has, as URLs something else can fetch.
 *
 * Two stores, because the move to this app split them. The legacy site
 * keeps files on the PHP host's disk and records the filename; this app
 * cannot write there, so anything uploaded since is a row in
 * lbs_business_images served by /api/business-image. A listing can have
 * both, and the public page already merges them — this matches that
 * merge so the export carries what a visitor sees.
 *
 * Ordering follows the listing page: the uploaded logo wins if there is
 * one, then legacy photos in their own order, then uploaded gallery
 * shots. Banners are skipped; they are page furniture, not pictures of
 * the business.
 */
async function imageUrls(
  ids: number[],
  origin?: string,
): Promise<Map<number, { logo: string; photos: string[] }>> {
  const out = new Map<number, { logo: string; photos: string[] }>();
  if (ids.length === 0) return out;

  const { db } = await import("@/lib/db");
  const base = (origin ?? "").replace(/\/+$/, "");
  // Database-backed images are served by this app; legacy filenames are
  // already absolute on the PHP host, so only these need the prefix.
  const served = (id: number) => `${base}/api/business-image/${id}`;

  const legacy = new Map<number, string[]>();
  try {
    const [photoRows] = (await db.execute(
      sql`SELECT business_id, filename, photo_type
          FROM directory_business_photos
          WHERE business_id IN (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`, `,
          )})
          ORDER BY is_primary DESC, sort_order ASC, uploaded_at ASC, id ASC`,
    )) as unknown as [Record<string, unknown>[]];

    const uploads =
      (
        process.env.UPLOADS_BASE_URL ??
        "https://www.lowcountrybusinessspotlight.com/uploads"
      ).replace(/\/$/, "") + "/business_photos/";

    for (const p of photoRows ?? []) {
      if (!p.filename) continue;
      if (String(p.photo_type ?? "") === "banner") continue;
      const id = Number(p.business_id);
      const urls = legacy.get(id) ?? [];
      urls.push(uploads + String(p.filename).replace(/^\//, ""));
      legacy.set(id, urls);
    }
  } catch (e) {
    // A migration missing a photo is recoverable; a migration that
    // never ran because of one is not.
    console.error("[directory-export] legacy photo read failed:", e);
  }

  const { getBusinessImageIds, getGalleryImages } = await import(
    "@/lib/business-images"
  );
  const [logos, gallery] = await Promise.all([
    getBusinessImageIds(ids),
    getGalleryImages(ids),
  ]);

  for (const id of ids) {
    const legacyUrls = legacy.get(id) ?? [];
    const uploadedLogo = logos.get(id);
    const uploadedGallery = (gallery.get(id) ?? []).map((g) => served(g.id));

    // An uploaded logo displaces the legacy primary as the logo, but
    // that primary is still a real photo of the business, so it moves
    // into the gallery rather than being dropped.
    const logo = uploadedLogo ? served(uploadedLogo) : (legacyUrls[0] ?? "");
    const rest = uploadedLogo ? legacyUrls : legacyUrls.slice(1);

    out.set(id, { logo, photos: [...rest, ...uploadedGallery] });
  }
  return out;
}

/**
 * No database configured, so this is the sample directory.
 *
 * Worth exporting anyway: it is how the format can be checked without
 * production credentials. The sample listings carry the composed
 * address string and no email, so the street and postcode are split
 * back out and email comes out blank — accurate for sample data, and
 * never reached once DB_HOST is set.
 */
async function sampleRows(origin?: string): Promise<ExportRow[]> {
  const businesses = await getBusinesses();
  const base = (origin ?? "").replace(/\/+$/, "");
  // getBusinesses already merged both image stores, so the only thing
  // left is making the app-served ones absolute.
  const absolute = (u: string) => (u.startsWith("/") ? base + u : u);

  return businesses.map((b) => {
    const parts = (b.address ?? "").split(",").map((p) => p.trim());
    const zip = parts[2]?.match(/(\d{5}(?:-\d{4})?)/)?.[1] ?? "";
    const tags = b.tags ?? [];
    const locallyOwned = tags.some((t) => norm(t.name) === LOCALLY_OWNED);
    const body = richTextToPlain(b.description ?? "");

    return {
      name: b.name,
      category: b.category,
      community: b.locationArea,
      short_description: shorten(body),
      description: body,
      address_line1: parts[0] ?? "",
      city: b.city || (parts[1] ?? ""),
      state: parts[2]?.replace(/\s*\d{5}(-\d{4})?$/, "").trim() || "SC",
      postal_code: zip,
      phone: b.phone ?? "",
      email: "",
      website_url: b.website ?? "",
      tags: tags
        .filter((t) => norm(t.name) !== LOCALLY_OWNED)
        .map((t) => t.name)
        .join(";"),
      locally_owned: locallyOwned ? "true" : "false",
      ...pictures({
        logo: b.logoUrl ? absolute(b.logoUrl) : "",
        photos: (b.photos ?? [])
          .map((p) => absolute(p.url))
          .filter((u) => u !== (b.logoUrl ? absolute(b.logoUrl) : "")),
      }),
      facebook: socialUrl("facebook", b.socials?.facebook),
      instagram: socialUrl("instagram", b.socials?.instagram),
      tiktok: socialUrl("tiktok", b.socials?.tiktok),
      youtube: socialUrl("youtube", b.socials?.youtube),
    };
  });
}
