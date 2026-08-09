/**
 * Story shapes and the kind list, without the database.
 *
 * The editor is a client component and needs STORY_KINDS to build its
 * dropdown. Importing a value out of stories.ts would drag "server-only"
 * across the boundary and fail the build, so the parts both sides need
 * live here and stories.ts re-exports them.
 */

export type StoryKind =
  | "spotlight"
  | "now_open"
  | "coming_soon"
  | "noteworthy"
  | "guide"
  | "news";

export type StoryStatus = "draft" | "scheduled" | "published" | "archived";

/**
 * The five consumer pillars, plus plain news.
 *
 * One table rather than six, because they differ by what they are about
 * and which template renders them, not by shape. Every one of them is a
 * headline, a picture, some prose, a place and usually a business.
 */
export const STORY_KINDS: {
  value: StoryKind;
  label: string;
  hint: string;
  /** What the reader sees on the card, above the headline. */
  eyebrow: string;
}[] = [
  {
    value: "spotlight",
    label: "Business Spotlight",
    hint: "The signature piece: who they are and why they started",
    eyebrow: "Community Business Spotlight",
  },
  {
    value: "now_open",
    label: "Now Open",
    hint: "Somewhere that has just opened its doors",
    eyebrow: "Now Open",
  },
  {
    value: "coming_soon",
    label: "Coming Soon",
    hint: "Announced, under construction, not open yet",
    eyebrow: "Coming Soon",
  },
  {
    value: "noteworthy",
    label: "New & Noteworthy",
    hint: "Moves, expansions, milestones, a roundup",
    eyebrow: "New & Noteworthy",
  },
  {
    value: "guide",
    label: "Local Guide",
    hint: "Evergreen or seasonal: best happy hours, gift guides",
    eyebrow: "Local Guide",
  },
  {
    value: "news",
    label: "News",
    hint: "Anything else worth telling people",
    eyebrow: "Around the Lowcountry",
  },
];

export const STORY_STATUSES: { value: StoryStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export const kindLabel = (k: StoryKind) =>
  STORY_KINDS.find((x) => x.value === k)?.label ?? "Story";

export const kindEyebrow = (k: StoryKind) =>
  STORY_KINDS.find((x) => x.value === k)?.eyebrow ?? "Around the Lowcountry";

/** How a business is involved, which decides where the story surfaces. */
export type StoryBusinessRole = "subject" | "mentioned";

export type StoryBusiness = {
  businessId: number;
  role: StoryBusinessRole;
  /** Filled in on read, for the admin list and the byline. */
  name?: string;
  slug?: string;
};

export type Story = {
  id: number;
  /** Its address. Fixed once created. */
  slug: string;
  kind: StoryKind;
  title: string;
  /** The standfirst: one or two sentences under the headline. */
  dek: string;
  bodyHtml: string;
  heroMediaId: number | null;
  status: StoryStatus;
  /** ISO date, or empty when it has never been published. */
  publishedAt: string;
  /** Pretty version of the above, for screens. */
  publishedLabel?: string;
  /**
   * Where it sits on the homepage grid. Lower comes first; null means it
   * is not featured at all.
   */
  featuredRank: number | null;
  /**
   * Paid placement. In the model from the first version deliberately.
   *
   * Labelling paid coverage is the thing that makes the free editorial
   * worth anything, and it is close to impossible to retrofit honestly
   * once a few dozen stories exist without it.
   */
  sponsored: boolean;
  sponsorBusinessId: number | null;
  metaTitle: string;
  metaDescription: string;
  /** Place slugs this story belongs to. */
  places: string[];
  businesses: StoryBusiness[];
  updatedAt?: string;
};

export const slugifyStory = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 180);

/**
 * Roughly how long it takes to read, for the "4 min read" line.
 *
 * Tags are stripped first, or a story with a lot of markup reads as
 * twice its length. 220 words a minute is the middle of the range the
 * research puts adult reading at, and the number is rounded up so
 * nothing is ever "0 min".
 */
export function readMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}
