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
 */

/** Fixed by the destination's template. Order is part of the contract. */
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
  "tags",
  "locally_owned",
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
};

/** Everything the CSV needs, in the destination's shape. */
export async function exportRows(
  opts: ExportOptions = {},
): Promise<ExportRow[]> {
  if (usingSampleData()) return sampleRows();

  const { db } = await import("@/lib/db");
  const gate = opts.includeHidden
    ? sql`1 = 1`
    : sql`b.is_active = 1 AND b.is_verified = 1 AND b.is_hidden = 0`;

  const [rows] = (await db.execute(
    sql`SELECT b.id, b.business_name, b.category, b.location_area, b.address,
               b.city, b.state, b.zip_code, b.phone, b.email, b.website,
               b.description, b.extended_description
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
    };
  });
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
async function sampleRows(): Promise<ExportRow[]> {
  const businesses = await getBusinesses();
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
    };
  });
}
