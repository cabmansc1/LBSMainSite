import "server-only";
import { siteOrigin } from "@/lib/origin";
import { getPastCard, recordCardShare, type PastCard } from "@/lib/past-cards";

/**
 * Posting a mailed card to the Facebook Page.
 *
 * The post is a link share, not an image upload. That is the whole
 * reason this file is short: Facebook fetches the card page and reads
 * its og:image, which /cards/[slug]/opengraph-image already composes at
 * 1200x630, so there is no artwork pipeline here, no aspect-ratio
 * arithmetic, and no second copy of the picture to keep in step with
 * the first.
 *
 * Credentials come from the environment, the same as Slack and Twilio,
 * and the integrations screen reports whether they are set. A Page
 * access token, not a user one: user tokens expire in hours and would
 * have this quietly stop working a week after it was set up.
 */

/**
 * Meta retires a Graph version roughly two years after it ships, and
 * calls against a retired one fail outright. Pinning rather than
 * tracking "latest" keeps the response shape stable, and the override
 * exists so a version bump is an env change instead of a deploy.
 */
const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION?.trim() || "v23.0";

const pageId = () => process.env.FACEBOOK_PAGE_ID?.trim();
const pageToken = () => process.env.FACEBOOK_PAGE_TOKEN?.trim();

export const facebookEnabled = () => !!pageId() && !!pageToken();

export type ShareResult =
  | { ok: true; postId: string; url: string }
  | { ok: false; error: string };

/** The card's public URL, which is both what gets posted and what ranks. */
export const cardShareUrl = (slug: string) => `${siteOrigin()}/cards/${slug}`;

/**
 * The caption we suggest. The admin can rewrite it before posting, so
 * this is a starting point rather than a template to be defended: it
 * names the neighborhood and the month, because that is what makes
 * somebody scrolling recognise their own mailbox.
 */
export function defaultShareMessage(card: Pick<PastCard, "cardName" | "zoneName" | "mailMonth">) {
  const name = card.cardName ?? card.zoneName;
  return `The ${name} Spotlight Postcard is in mailboxes for ${card.mailMonth}. See the card and the local businesses on it.`;
}

/**
 * Post one card to the Page feed.
 *
 * Refuses an unpublished card: the link would 404, and a dead link is
 * worse on a Page than no post at all. Refuses a second post of the
 * same card unless asked again explicitly, because the button is one
 * click and a duplicate is public.
 */
export async function shareCardToFacebook(
  slug: string,
  opts: { message?: string; allowRepost?: boolean } = {},
): Promise<ShareResult> {
  const id = pageId();
  const token = pageToken();
  if (!id || !token) {
    return { ok: false, error: "Facebook is not configured. Set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_TOKEN." };
  }

  const card = await getPastCard(slug);
  if (!card) return { ok: false, error: "That card no longer exists." };
  if (!card.published) {
    return { ok: false, error: "Publish the card first — the link would 404 on Facebook." };
  }
  if (card.fbPostId && !opts.allowRepost) {
    return { ok: false, error: "That card has already been shared." };
  }

  const link = cardShareUrl(slug);
  const message = (opts.message ?? "").trim() || defaultShareMessage(card);

  let res: Response;
  try {
    res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${id}/feed`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ message, link, access_token: token }),
      // A Page post that hangs should fail the click, not the request
      // handler, so the admin can try again rather than watch a spinner.
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    const reason = e instanceof Error && e.name === "TimeoutError" ? "timed out" : "could not be reached";
    return { ok: false, error: `Facebook ${reason}. Nothing was posted.` };
  }

  const body = (await res.json().catch(() => null)) as
    | { id?: string; error?: { message?: string; code?: number } }
    | null;

  if (!res.ok || body?.error || !body?.id) {
    // Graph puts the useful part in error.message; the status alone is
    // almost always 400 and says nothing about what to fix.
    const detail = body?.error?.message ?? `HTTP ${res.status}`;
    return { ok: false, error: detail };
  }

  await recordCardShare(slug, body.id);
  return { ok: true, postId: body.id, url: `https://www.facebook.com/${body.id}` };
}
