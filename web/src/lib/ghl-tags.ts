/**
 * Tags sent with every GoHighLevel push.
 *
 * The payloads already carried a `source` string, but a string is
 * something an automation has to match on, and matching on prose breaks
 * the moment the prose changes. Tags are a fixed vocabulary: a workflow
 * filters on `lbs-lead-quiz` and keeps working however the sentence
 * around it is reworded.
 *
 * Two axes, because they answer different questions. What kind of
 * contact this is decides which workflow runs. Where they came from and
 * what they asked about decides what the first message says.
 *
 * Every tag is lowercase and hyphenated, and every one starts `lbs-`, so
 * a contact carrying tags from elsewhere stays legible and these can be
 * bulk-selected in the GoHighLevel UI.
 */

export type LeadKind =
  | "advertise"
  | "quiz"
  | "roi"
  | "newsletter"
  | "waitlist-category"
  | "waitlist-smaller-card";

/** Tag-safe: lowercase, hyphenated, no punctuation to trip a filter. */
export const tagSlug = (v: string): string =>
  v
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

/** The one tag that says which workflow should pick this contact up. */
const KIND_TAG: Record<LeadKind, string> = {
  advertise: "lbs-lead-advertise",
  quiz: "lbs-lead-quiz",
  roi: "lbs-lead-roi",
  newsletter: "lbs-newsletter",
  "waitlist-category": "lbs-waitlist-category",
  "waitlist-smaller-card": "lbs-waitlist-smaller-card",
};

/**
 * The three that are somebody asking about advertising, as opposed to a
 * newsletter subscriber or somebody waiting for a category to open. One
 * filter to catch every real sales lead without listing them.
 */
const SALES_LEAD: LeadKind[] = ["advertise", "quiz", "roi"];

export function buildTags(input: {
  kind: LeadKind;
  /** Neighborhood, where the form knows one. */
  zoneSlug?: string;
  /** Industry, where the form knows one. */
  category?: string;
  /** Page the form was submitted from, for the newsletter mostly. */
  page?: string;
  /** Ad size a quiz or calculator suggested, so follow-up can lead with it. */
  adSize?: string;
}): string[] {
  const tags = [KIND_TAG[input.kind]];
  if (SALES_LEAD.includes(input.kind)) tags.push("lbs-lead");
  if (input.kind.startsWith("waitlist")) tags.push("lbs-waitlist");

  if (input.zoneSlug?.trim()) tags.push(`lbs-zone-${tagSlug(input.zoneSlug)}`);
  if (input.category?.trim()) tags.push(`lbs-category-${tagSlug(input.category)}`);
  if (input.page?.trim()) tags.push(`lbs-page-${tagSlug(input.page)}`);
  if (input.adSize?.trim()) tags.push(`lbs-size-${tagSlug(input.adSize)}`);

  // Deduped and stable, so the same submission always produces the same
  // set and a workflow comparing against a previous run sees no churn.
  return [...new Set(tags.filter(Boolean))].sort();
}

/**
 * Both shapes, because inbound webhook mapping in GoHighLevel handles
 * arrays inconsistently depending on how the trigger is built. Sending
 * the array and a comma-separated copy means the mapping works whichever
 * way it is set up, and costs a few bytes.
 */
export function tagFields(tags: string[]) {
  return { tags, tags_csv: tags.join(", ") };
}
