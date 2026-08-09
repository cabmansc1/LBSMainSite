import "server-only";
import { sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { siteOrigin } from "@/lib/origin";
import { SITE_NAME } from "@/lib/seo";
import {
  getCategoryVocabulary,
  getTakenCategoriesForCard,
  getUpcomingCardRoster,
  getUpcomingMailings,
} from "@/lib/mission-control";
import { isBookable } from "@/lib/mailings";
import { ZONES } from "@/lib/zones";
import { pageCopy } from "@/lib/blocks";
import {
  buildAudience,
  optOutsReadable,
  unsubscribeToken,
  type AudienceGroup,
  type Recipient,
} from "@/lib/newsletter-audience";

/**
 * The Spotlight Advertiser Update, out on the 1st and the 15th.
 *
 * Two decisions shape everything here. It is personalised at the top and
 * shared below, so an advertiser sees their own cards and their own
 * artwork deadlines and never sees another business's; and it is only
 * ever assembled automatically, never sent automatically. The schedule
 * builds a draft and tells Andrew. Nothing reaches a hundred businesses
 * until somebody has read it.
 *
 * The assembled content is stored on the issue rather than recomputed at
 * render time. An issue that has gone out is a record of what went out,
 * and an issue from March that redrew itself with today's open zones
 * every time it was opened would be a record of nothing.
 */

export type IssueStatus = "draft" | "sending" | "sent" | "cancelled";

/** A card as it stood when the issue was built. */
export type IssueCard = {
  cardId: string;
  cardName: string;
  zoneName: string;
  mailMonth: string;
  mailDateIso: string;
  spotsLeft: number;
  spotsTotal: number;
  artworkDeadline?: string;
  /** A sample; the full list is usually too long for an email. */
  openCategories: string[];
  moreCategories: number;
};

export type IssueContent = {
  subject: string;
  preheader: string;
  intro: string;
  /** One quiet line saying why this landed in their inbox. */
  why: string;
  cards: IssueCard[];
  story: { title: string; body: string };
  news: string;
  /** Standing offer of print work. Empty drops the section entirely. */
  print: string;
  signoff: string;
};

export type Issue = {
  id: number;
  status: IssueStatus;
  content: IssueContent;
  groups: AudienceGroup[];
  leadsMonths: number;
  /**
   * Zone slugs this issue is for. An advertiser is kept when one of
   * their cards is in one of them, which is what keeps a Lowcountry
   * update out of a Midlands customer's inbox.
   */
  zones: string[];
  builtFor: string;
  sentAt?: string;
  sendCount: number;
  createdAt?: string;
};

/** What one advertiser is told about their own cards. Never stored. */
export type PersonalCard = {
  cardName: string;
  zoneName: string;
  mailMonth: string;
  adSize: string;
  artworkDeadline?: string;
  /** Mission Control's artwork state, already lowercased. */
  artStatus: string;
};

const DEFAULT_GROUPS: AudienceGroup[] = [
  "current",
  "past",
  "directory",
  "leads",
];

/** The zones the site itself publishes: the default reach of an issue. */
const SITE_ZONE_SLUGS = ZONES.map((z) => z.slug);

/** How many categories to name before saying "and N more". */
const CATEGORY_SAMPLE = 8;

let ready = false;

async function ensureTables() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_newsletter_issues (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kind VARCHAR(24) NOT NULL DEFAULT 'advertiser',
      status VARCHAR(16) NOT NULL DEFAULT 'draft',
      content MEDIUMTEXT NOT NULL,
      audience VARCHAR(191) NOT NULL DEFAULT '',
      leads_months INT NOT NULL DEFAULT 12,
      built_for VARCHAR(32) NOT NULL DEFAULT '',
      send_count INT NOT NULL DEFAULT 0,
      sent_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  // The unique key is what makes a send resumable. If the request dies
  // half way through a hundred addresses, pressing Send again skips
  // everyone already in here rather than mailing them twice.
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_newsletter_sends (
      id INT AUTO_INCREMENT PRIMARY KEY,
      issue_id INT NOT NULL,
      email VARCHAR(191) NOT NULL,
      sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ok TINYINT NOT NULL DEFAULT 1,
      UNIQUE KEY issue_email (issue_id, email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  // Added after the table shipped, so CREATE TABLE IF NOT EXISTS will
  // not put it there. Tolerated rather than checked: the only reason it
  // fails is that it is already present, and a newsletter screen must
  // not go down because a column it already has could not be added
  // again.
  try {
    await db.execute(
      sql`ALTER TABLE lbs_newsletter_issues
          ADD COLUMN zones TEXT NULL`,
    );
  } catch {
    /* already there */
  }
  ready = true;
}

const fmtDate = (d: unknown) => {
  const dt = d instanceof Date ? d : new Date(String(d ?? ""));
  return isNaN(dt.getTime())
    ? undefined
    : dt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

/* ---------- assembling a draft ---------- */

/**
 * Builds the issue from whatever is true right now.
 *
 * Open categories are worked out per card as the vocabulary minus what
 * Mission Control says is taken, which is the same subtraction the
 * checkout does, so the email can never offer a category the site would
 * then refuse to sell.
 */
export async function assembleContent(
  label: string,
  zones: string[] = SITE_ZONE_SLUGS,
): Promise<IssueContent> {
  // Spot counts come from the mailing list rather than the roster: the
  // roster carries who is on a card, not how many places it holds, so
  // counting advertiser rows would report a full card as having however
  // many people happened to have bought.
  // Filtered to the issue's own zones as well as to what is bookable.
  // Mission Control holds cards outside the Lowcountry, and an update
  // that opened with a Midlands card would be wrong for almost everyone
  // reading it.
  const want = new Set(zones);
  const mailings = (await getUpcomingMailings().catch(() => [])).filter(
    (m) => isBookable(m.status) && (want.size === 0 || want.has(m.zoneSlug)),
  );
  const vocab = await getCategoryVocabulary().catch(() => null);
  const all = (vocab?.categories ?? []).map((c) =>
    typeof c === "string" ? c : String((c as { name?: string }).name ?? ""),
  );

  const cards: IssueCard[] = [];
  for (const m of mailings) {
    // Same subtraction the checkout does, so the email can never offer a
    // category the site would then refuse to sell.
    const taken = m.cardId
      ? await getTakenCategoriesForCard(m.cardId).catch(() => [])
      : [];
    const takenSet = new Set(taken.map((t) => t.toLowerCase()));
    const open = all.filter((c) => c && !takenSet.has(c.toLowerCase()));
    cards.push({
      cardId: m.cardId ?? "",
      cardName: m.cardName || `${m.zoneName}, ${m.mailMonth}`,
      zoneName: m.zoneName,
      mailMonth: m.mailMonth,
      mailDateIso: "",
      spotsTotal: m.spotsTotal,
      spotsLeft: Math.max(0, m.spotsTotal - m.spotsTaken),
      artworkDeadline: m.artworkDeadline,
      openCategories: open.slice(0, CATEGORY_SAMPLE),
      moreCategories: Math.max(0, open.length - CATEGORY_SAMPLE),
    });
  }

  // How a new issue starts out is editable under Page content, so the
  // wording can be changed once rather than retyped on every issue. It
  // is copied onto the issue here and never read again, so editing it
  // later cannot rewrite something already drafted or sent.
  const copy = await pageCopy("newsletter");

  return {
    subject: copy.t("default.subject").replace("{date}", label),
    preheader: copy.t("default.preheader"),
    intro: copy.t("default.intro"),
    why: copy.t("default.why"),
    cards,
    story: { title: "", body: "" },
    news: "",
    print: copy.t("default.print"),
    signoff: copy.t("default.signoff"),
  };
}

/* ---------- reading and writing issues ---------- */

type IssueRow = {
  id: number;
  status: string;
  content: string;
  audience: string;
  leads_months: number;
  zones?: string | null;
  built_for: string;
  send_count: number;
  sent_at?: unknown;
  created_at?: unknown;
};

const STATUSES = new Set(["draft", "sending", "sent", "cancelled"]);

/**
 * An issue written before zones existed has none stored, and it predates
 * anybody noticing the Midlands customers on the list. Falling back to
 * the site's own zones gives it the answer it should have had.
 */
function parseZones(raw: string | null | undefined): string[] {
  const found = String(raw ?? "")
    .split(",")
    .map((z) => z.trim())
    .filter(Boolean);
  return found.length ? found : SITE_ZONE_SLUGS;
}

/**
 * Fills in anything a stored issue predates.
 *
 * An issue is written once and read for ever, so every field added after
 * the first one was saved is missing from the rows already there.
 * Reading those straight back would put undefined where the renderer
 * expects a string and take the screen down over a section that simply
 * did not exist yet.
 */
function normalizeContent(raw: Partial<IssueContent>): IssueContent {
  return {
    subject: raw.subject ?? "",
    preheader: raw.preheader ?? "",
    intro: raw.intro ?? "",
    why: raw.why ?? "",
    cards: Array.isArray(raw.cards) ? raw.cards : [],
    story: {
      title: raw.story?.title ?? "",
      body: raw.story?.body ?? "",
    },
    news: raw.news ?? "",
    print: raw.print ?? "",
    signoff: raw.signoff ?? "",
  };
}

function toIssue(r: IssueRow): Issue | undefined {
  let content: IssueContent;
  try {
    content = normalizeContent(JSON.parse(r.content) as Partial<IssueContent>);
  } catch {
    // An issue whose body will not parse cannot be rendered or sent, and
    // returning a half-built object would put a broken row on the screen
    // with a live Send button beside it.
    console.error("[newsletter] issue", r.id, "has unreadable content");
    return undefined;
  }
  return {
    id: Number(r.id),
    status: STATUSES.has(r.status) ? (r.status as IssueStatus) : "draft",
    content,
    groups: String(r.audience ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is AudienceGroup =>
        (DEFAULT_GROUPS as string[]).includes(s),
      ),
    leadsMonths: Number(r.leads_months ?? 12),
    // An issue written before zones existed has none stored, and it
    // predates the Midlands problem being noticed. Defaulting it to the
    // site's own zones is the answer it should have had.
    zones: parseZones(r.zones),
    builtFor: String(r.built_for ?? ""),
    sendCount: Number(r.send_count ?? 0),
    sentAt: fmtDate(r.sent_at),
    createdAt: fmtDate(r.created_at),
  };
}

export async function listIssues(limit = 24): Promise<Issue[]> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_newsletter_issues
           WHERE kind = 'advertiser'
           ORDER BY id DESC LIMIT ${limit}`,
    )) as unknown as [IssueRow[]];
    return (rows[0] ?? [])
      .map(toIssue)
      .filter((i): i is Issue => i !== undefined);
  } catch (e) {
    console.error("[newsletter] list failed:", e);
    return [];
  }
}

export async function getIssue(id: number): Promise<Issue | undefined> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_newsletter_issues WHERE id = ${id} LIMIT 1`,
    )) as unknown as [IssueRow[]];
    const r = rows[0]?.[0];
    return r ? toIssue(r) : undefined;
  } catch (e) {
    console.error("[newsletter] read failed:", e);
    return undefined;
  }
}

/**
 * Creates the issue for this date, unless one already exists.
 *
 * built_for is the issue date, and a second call with the same label
 * returns the issue already there rather than making another. The
 * schedule can therefore fire twice, or be nudged by hand, without
 * producing two drafts nobody can tell apart.
 */
export async function buildDraftFor(
  label: string,
): Promise<{ id: number; created: boolean } | { error: string }> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const existing = (await db.execute(
      sql`SELECT id FROM lbs_newsletter_issues
           WHERE kind = 'advertiser' AND built_for = ${label} LIMIT 1`,
    )) as unknown as [{ id: number }[]];
    const found = existing[0]?.[0];
    if (found) return { id: Number(found.id), created: false };

    const content = await assembleContent(label);
    await db.execute(
      sql`INSERT INTO lbs_newsletter_issues
            (kind, status, content, audience, leads_months, built_for, zones)
          VALUES ('advertiser', 'draft', ${JSON.stringify(content)},
                  ${DEFAULT_GROUPS.join(",")}, 12, ${label},
                  ${SITE_ZONE_SLUGS.join(",")})`,
    );
    const row = (await db.execute(
      sql`SELECT id FROM lbs_newsletter_issues
           WHERE kind = 'advertiser' AND built_for = ${label} LIMIT 1`,
    )) as unknown as [{ id: number }[]];
    const id = Number(row[0]?.[0]?.id ?? 0);
    if (!id) return { error: "The draft saved but could not be read back." };
    return { id, created: true };
  } catch (e) {
    console.error("[newsletter] draft build failed:", e);
    return { error: "Could not build the draft." };
  }
}

export type IssuePatch = {
  content?: Partial<IssueContent>;
  groups?: AudienceGroup[];
  leadsMonths?: number;
  zones?: string[];
  status?: IssueStatus;
};

export async function saveIssue(
  id: number,
  patch: IssuePatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const issue = await getIssue(id);
  if (!issue) return { ok: false, error: "That issue is not here." };
  if (issue.status === "sent" && patch.status !== "cancelled") {
    return { ok: false, error: "That issue has already gone out." };
  }
  try {
    const { db } = await import("@/lib/db");
    const content: IssueContent = { ...issue.content, ...(patch.content ?? {}) };
    await db.execute(
      sql`UPDATE lbs_newsletter_issues
             SET content = ${JSON.stringify(content)},
                 audience = ${(patch.groups ?? issue.groups).join(",")},
                 leads_months = ${patch.leadsMonths ?? issue.leadsMonths},
                 zones = ${(patch.zones ?? issue.zones).join(",")},
                 status = ${patch.status ?? issue.status}
           WHERE id = ${id}`,
    );
    return { ok: true };
  } catch (e) {
    console.error("[newsletter] save failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

/**
 * Throws away a draft.
 *
 * Only ever a draft. An issue that has gone out, in whole or in part, is
 * the record of what a hundred businesses were told, and the delivery
 * rows underneath it are what stop somebody being mailed twice if a send
 * is resumed. Deleting either would trade a tidy list for the ability to
 * answer "what did we actually send them" and "have they had this
 * already", which are the two questions worth being able to answer.
 *
 * A cancelled issue is fair game: cancelling is how you decide not to
 * send something, so nothing went anywhere.
 */
export async function deleteIssue(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const issue = await getIssue(id);
  if (!issue) return { ok: false, error: "That issue is not here." };
  if (issue.status === "sent" || issue.status === "sending") {
    return {
      ok: false,
      error:
        "That issue has gone out, so it stays as the record of what was sent.",
    };
  }
  if (issue.sendCount > 0) {
    return {
      ok: false,
      error: `That issue reached ${issue.sendCount} ${
        issue.sendCount === 1 ? "address" : "addresses"
      }, so it stays as the record of what was sent.`,
    };
  }
  try {
    const { db } = await import("@/lib/db");
    // Nothing should be here for a draft, but a cancelled issue that was
    // once mid-send could have rows. Cleared first so a future issue
    // cannot inherit them by id reuse.
    await db
      .execute(sql`DELETE FROM lbs_newsletter_sends WHERE issue_id = ${id}`)
      .catch(() => {});
    await db.execute(sql`DELETE FROM lbs_newsletter_issues WHERE id = ${id}`);
    return { ok: true };
  } catch (e) {
    console.error("[newsletter] delete failed:", e);
    return { ok: false, error: "That did not delete." };
  }
}

/* ---------- the personal block ---------- */

/**
 * Each advertiser's own cards, indexed by address.
 *
 * Built once for a whole send rather than looked up per recipient. A
 * hundred separate Mission Control reads would be slow, would fall out
 * of its cache part way through, and would let two people in the same
 * send be told different things about the same card.
 */
export async function personalIndex(): Promise<Map<string, PersonalCard[]>> {
  const roster = await getUpcomingCardRoster();
  const out = new Map<string, PersonalCard[]>();
  if (!roster) return out;
  for (const card of roster) {
    for (const a of card.advertisers) {
      if (a.isProspect) continue;
      const email = a.email.trim().toLowerCase();
      if (!email) continue;
      const list = out.get(email) ?? [];
      list.push({
        cardName: card.cardName,
        zoneName: card.zoneName,
        mailMonth: card.mailMonth,
        adSize: a.adSize,
        artworkDeadline: card.artworkDeadline,
        artStatus: a.artStatus,
      });
      out.set(email, list);
    }
  }
  return out;
}

/** Whether this advertiser still owes us a file for this card. */
const artworkOutstanding = (status: string) =>
  status !== "approved" && status !== "received";

/* ---------- rendering ---------- */

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export type RenderedIssue = { subject: string; text: string; html: string };

/**
 * One recipient's copy of the issue.
 *
 * The personal block is built from that person's cards alone. No other
 * business appears in it, by construction rather than by filtering: the
 * only rows that reach this function are the ones indexed under this
 * address.
 */
export function renderIssue(
  content: IssueContent,
  to: Recipient,
  personal: PersonalCard[],
): RenderedIssue {
  const origin = siteOrigin();
  const unsub = `${origin}/unsubscribe?e=${encodeURIComponent(to.email)}&t=${unsubscribeToken(to.email)}`;

  const greeting = to.contactName
    ? `Hi ${to.contactName},`
    : to.businessName
      ? `Hi ${to.businessName},`
      : "Hi,";

  /* ---- plain text ---- */
  const lines: string[] = [greeting, ""];
  if (content.why.trim()) lines.push(content.why, "");
  lines.push(content.intro, "");

  if (personal.length) {
    lines.push("YOUR CARDS", "");
    for (const c of personal) {
      lines.push(`  ${c.cardName} - mails ${c.mailMonth} - ${c.adSize}`);
      if (artworkOutstanding(c.artStatus)) {
        lines.push(
          c.artworkDeadline
            ? `  Artwork still needed, due ${c.artworkDeadline}`
            : "  Artwork still needed",
        );
      } else {
        lines.push("  Artwork received");
      }
      lines.push("");
    }
  }

  if (content.cards.length) {
    lines.push("OPEN NOW", "");
    for (const c of content.cards) {
      lines.push(
        `  ${c.cardName} - mails ${c.mailMonth}` +
          (c.spotsTotal > 0
            ? ` - ${c.spotsLeft} of ${c.spotsTotal} spots left`
            : ""),
      );
      if (c.artworkDeadline) lines.push(`  Artwork deadline ${c.artworkDeadline}`);
      if (c.openCategories.length) {
        const more = c.moreCategories ? ` and ${c.moreCategories} more` : "";
        lines.push(`  Categories open: ${c.openCategories.join(", ")}${more}`);
      }
      lines.push("");
    }
  }

  if (content.story.title.trim() || content.story.body.trim()) {
    lines.push(content.story.title.toUpperCase(), "", content.story.body, "");
  }
  if (content.news.trim()) lines.push("WHAT'S NEW", "", content.news, "");
  if (content.print.trim()) lines.push("PRINTING", "", content.print, "");

  lines.push(
    content.signoff,
    "",
    `Reserve a spot: ${origin}/pricing`,
    `Unsubscribe: ${unsub}`,
  );

  /* ---- html ---- */
  const h: string[] = [];
  h.push(
    `<div style="display:none;max-height:0;overflow:hidden">${esc(content.preheader)}</div>`,
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#22323f;max-width:600px;margin:0 auto;padding:24px">`,
    /*
     * A table, not a flex row. Email clients are a decade behind on
     * layout and Outlook in particular ignores flexbox entirely, so two
     * cells side by side is the only arrangement that holds everywhere.
     *
     * The name is text beside the mark rather than part of an image,
     * because most clients block remote images until the reader allows
     * them. With images off this still reads as being from us; a
     * wordmark graphic would leave a blank box and an alt attribute.
     *
     * Width and height are set as attributes as well as styles. Outlook
     * ignores CSS sizing on images and will otherwise draw the file at
     * its natural 269 by 320.
     */
    /*
     * On a dark plate, because the mark is a light one.
     *
     * It was drawn for the navy site header: 80% luminance with a
     * transparent ground. On the white background of an email it was
     * pale blue on white and all but invisible, which is how it shipped
     * and how Andrew spotted it. The bar is the same navy as the site
     * chrome, so the email opens the way the site does.
     *
     * bgcolor as well as the style, because Outlook ignores background
     * shorthand on a table and would otherwise draw a light mark on
     * nothing at all. Rounded corners degrade to square there, which is
     * fine.
     */
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a1622" style="background-color:#0a1622;border-radius:10px;margin:0 0 22px">`,
    `<tr>`,
    `<td style="padding:14px 16px">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0">`,
    `<tr>`,
    `<td style="padding-right:11px;vertical-align:middle">`,
    `<img src="${origin}/brand/lb-spotlight.png" width="38" height="45" alt="" style="display:block;border:0;width:38px;height:45px" />`,
    `</td>`,
    `<td style="vertical-align:middle">`,
    `<span style="font-size:15px;font-weight:700;color:#ffffff;letter-spacing:-0.01em">${esc(SITE_NAME)}</span>`,
    `</td>`,
    `</tr>`,
    `</table>`,
    `</td>`,
    `</tr>`,
    `</table>`,
    `<p style="margin:0 0 14px">${esc(greeting)}</p>`,
  );
  if (content.why.trim()) {
    h.push(
      `<p style="margin:0 0 16px;font-size:13px;line-height:1.55;color:#5e7183">${esc(content.why)}</p>`,
    );
  }
  h.push(`<p style="margin:0 0 20px">${esc(content.intro)}</p>`);

  const heading = (t: string) =>
    `<p style="margin:26px 0 10px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#5e7183;font-weight:600">${esc(t)}</p>`;

  if (personal.length) {
    h.push(heading("Your cards"));
    for (const c of personal) {
      const late = artworkOutstanding(c.artStatus);
      h.push(
        `<div style="border-left:3px solid ${late ? "#c56a00" : "#1f6b45"};background:#f4f7fa;padding:12px 14px;margin:0 0 10px;border-radius:0 8px 8px 0">`,
        `<b>${esc(c.cardName)}</b><br>`,
        `<span style="color:#5e7183">Mails ${esc(c.mailMonth)} &middot; ${esc(c.adSize)}</span><br>`,
        late
          ? `<span style="color:#c56a00;font-weight:600">Artwork still needed${
              c.artworkDeadline ? `, due ${esc(c.artworkDeadline)}` : ""
            }</span>`
          : `<span style="color:#1f6b45">Artwork received</span>`,
        `</div>`,
      );
    }
  }

  if (content.cards.length) {
    h.push(heading("Open now"));
    for (const c of content.cards) {
      h.push(
        `<div style="border:1px solid #dbe4ec;border-radius:8px;padding:12px 14px;margin:0 0 10px">`,
        `<b>${esc(c.cardName)}</b><br>`,
        `<span style="color:#5e7183">Mails ${esc(c.mailMonth)}`,
        c.spotsTotal > 0
          ? ` &middot; ${c.spotsLeft} of ${c.spotsTotal} spots left`
          : "",
        c.artworkDeadline
          ? ` &middot; artwork deadline ${esc(c.artworkDeadline)}`
          : "",
        `</span>`,
      );
      if (c.openCategories.length) {
        const more = c.moreCategories ? ` and ${c.moreCategories} more` : "";
        h.push(
          `<br><span style="color:#5e7183">Categories open: ${esc(
            c.openCategories.join(", ") + more,
          )}</span>`,
        );
      }
      h.push(`</div>`);
    }
  }

  if (content.story.title.trim() || content.story.body.trim()) {
    h.push(heading(content.story.title || "Success story"));
    h.push(
      `<p style="margin:0 0 16px;white-space:pre-wrap">${esc(content.story.body)}</p>`,
    );
  }
  if (content.news.trim()) {
    h.push(heading("What's new"));
    h.push(
      `<p style="margin:0 0 16px;white-space:pre-wrap">${esc(content.news)}</p>`,
    );
  }

  if (content.print.trim()) {
    h.push(heading("Printing"));
    h.push(
      `<p style="margin:0 0 16px;white-space:pre-wrap">${esc(content.print)}</p>`,
    );
  }

  h.push(
    `<p style="margin:22px 0"><a href="${origin}/pricing" style="display:inline-block;background:#0a1622;color:#fff;text-decoration:none;padding:11px 18px;border-radius:9px;font-weight:600">Reserve a spot</a></p>`,
    `<p style="margin:0 0 18px;white-space:pre-wrap;color:#5e7183">${esc(content.signoff)}</p>`,
    `<hr style="border:0;border-top:1px solid #dbe4ec;margin:20px 0">`,
    `<p style="margin:0;font-size:12px;color:#5e7183">You are getting this because you advertise with ${esc(SITE_NAME)}, have a listing in our directory, or asked us about advertising. <a href="${unsub}" style="color:#1478b8">Unsubscribe</a>.</p>`,
    `</div>`,
  );

  return { subject: content.subject, text: lines.join("\n"), html: h.join("") };
}

/* ---------- test sends ---------- */

/**
 * Sends one copy to whoever is reading the screen.
 *
 * Three things it deliberately does not do. It never writes to
 * lbs_newsletter_sends, because a test that marked an address as
 * delivered would make the real send skip it. It never moves the
 * issue's status. And it never renders under the recipient's own
 * address.
 *
 * That last one matters more than it sounds. The email carries a signed
 * unsubscribe link built from whoever it is addressed to, so a test
 * rendered as Rainbow Cleaning but delivered to Andrew would put
 * Rainbow's unsubscribe link in Andrew's inbox, one click away from
 * quietly removing a paying advertiser from the list. So the test
 * borrows the chosen advertiser's name and cards, which is what makes
 * the formatting worth checking, and keeps the reader's own address for
 * anything a click could act on.
 */
export async function sendTestIssue(
  id: number,
  toEmail: string,
  asEmail?: string,
): Promise<{ ok: true; as: string } | { ok: false; error: string }> {
  const to = toEmail.trim().toLowerCase();
  if (!to) return { ok: false, error: "No address to send the test to." };

  const issue = await getIssue(id);
  if (!issue) return { ok: false, error: "That issue is not here." };

  // Borrow a real advertiser's name and cards so the personal block is
  // exercised. Falling back to whoever has cards means a test is worth
  // reading even when nobody was picked.
  const personal = await personalIndex();
  const wanted = (asEmail ?? "").trim().toLowerCase();
  const audience = await buildAudience(
    issue.groups,
    issue.leadsMonths,
    issue.zones,
  );
  const borrowed =
    audience.recipients.find((r) => r.email === wanted) ??
    audience.recipients.find((r) => (personal.get(r.email) ?? []).length > 0);

  const asRecipient: Recipient = {
    email: to,
    businessName: borrowed?.businessName ?? "",
    contactName: borrowed?.contactName ?? "",
    groups: borrowed?.groups ?? [],
  };
  const cards = borrowed ? (personal.get(borrowed.email) ?? []) : [];

  const mail = renderIssue(issue.content, asRecipient, cards);
  const res = await sendEmail({
    to,
    // Marked, so a test can never be mistaken for the real thing sitting
    // in the same inbox.
    subject: `[TEST] ${mail.subject}`,
    text:
      `This is a test copy. Nobody else received it.\n` +
      (borrowed
        ? `It is rendered as ${borrowed.businessName || borrowed.email}, using their cards.\n`
        : `No advertiser with cards was available, so there is no personal section.\n`) +
      `\n----------------------------------------\n\n` +
      mail.text,
    html:
      `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;background:#FFF3E2;color:#7a4a00;padding:12px 16px;border-radius:8px;max-width:600px;margin:16px auto 0">` +
      `<b>Test copy.</b> Nobody else received this. ` +
      (borrowed
        ? `Rendered as ${esc(borrowed.businessName || borrowed.email)}, using their cards.`
        : `No advertiser with cards was available, so there is no personal section.`) +
      `</div>` +
      mail.html,
  });

  if (!res.sent) {
    return {
      ok: false,
      error:
        res.error ??
        "Sending is switched off, so nothing went out. Check RESEND_API_KEY.",
    };
  }
  return { ok: true, as: borrowed?.businessName || borrowed?.email || "nobody" };
}

/* ---------- sending ---------- */

export type SendReport = {
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  done: boolean;
  error?: string;
};

/** Kind to the provider, and slow enough that a long list does not burst. */
const GAP_MS = 120;
/** A ceiling on one pass, so a huge list cannot hold a request open forever. */
const MAX_PER_RUN = 500;

/**
 * Sends an issue.
 *
 * Resumable on purpose. Every successful send is recorded against the
 * issue before the next one starts, and this skips anyone already there,
 * so a request that times out half way through a hundred addresses is
 * fixed by pressing Send again rather than by working out who got it.
 *
 * Refuses rather than guesses in two cases. If Mission Control cannot be
 * read, the advertiser groups are missing rather than empty and the
 * email would tell current advertisers they have no cards. If the
 * opt-out list cannot be read, somebody who unsubscribed would be mailed
 * again, which is the one mistake here with a legal edge to it.
 */
export async function sendIssue(id: number): Promise<SendReport> {
  const blank: SendReport = {
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    done: false,
  };

  const issue = await getIssue(id);
  if (!issue) return { ...blank, error: "That issue is not here." };
  if (issue.status === "sent") {
    return { ...blank, error: "That issue has already gone out." };
  }
  if (issue.status === "cancelled") {
    return { ...blank, error: "That issue was cancelled." };
  }

  if (!(await optOutsReadable())) {
    return {
      ...blank,
      error:
        "The unsubscribe list could not be read, so nothing was sent. Try again shortly.",
    };
  }

  const audience = await buildAudience(
    issue.groups,
    issue.leadsMonths,
    issue.zones,
  );
  if (!audience.mcReadable && issue.groups.some((g) => g === "current" || g === "past")) {
    return {
      ...blank,
      error:
        "Mission Control could not be reached, so advertiser details are missing. Nothing was sent.",
    };
  }

  const { db } = await import("@/lib/db");
  await ensureTables();
  await db.execute(
    sql`UPDATE lbs_newsletter_issues SET status = 'sending' WHERE id = ${id}`,
  );

  const already = (await db
    .execute(sql`SELECT email FROM lbs_newsletter_sends WHERE issue_id = ${id}`)
    .catch(() => [[]] as unknown)) as [{ email: string }[]];
  const done = new Set((already[0] ?? []).map((r) => String(r.email).toLowerCase()));

  const personal = await personalIndex();

  const report: SendReport = { ...blank };
  for (const to of audience.recipients) {
    if (done.has(to.email)) {
      report.skipped += 1;
      continue;
    }
    if (report.attempted >= MAX_PER_RUN) break;
    report.attempted += 1;

    const mail = renderIssue(issue.content, to, personal.get(to.email) ?? []);
    let ok = false;
    try {
      const res = await sendEmail({
        to: to.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      // Preview mode returns sent:false and logs the body. That is a
      // successful dry run, not a failure, and it must not be recorded
      // as delivered or the real send would skip the address later.
      ok = res.sent;
    } catch (e) {
      console.error("[newsletter] send to", to.email, "failed:", e);
    }

    if (ok) {
      report.sent += 1;
      await db
        .execute(
          sql`INSERT IGNORE INTO lbs_newsletter_sends (issue_id, email, ok)
              VALUES (${id}, ${to.email}, 1)`,
        )
        .catch(() => {});
    } else {
      report.failed += 1;
    }

    await new Promise((r) => setTimeout(r, GAP_MS));
  }

  const remaining =
    audience.recipients.length - done.size - report.attempted;
  report.done = remaining <= 0;

  await db.execute(
    sql`UPDATE lbs_newsletter_issues
           SET status = ${report.done ? "sent" : "sending"},
               send_count = ${done.size + report.sent}
         WHERE id = ${id}`,
  );
  // Stamped separately, and only once, so a resumed send does not keep
  // moving the date the issue went out.
  if (report.done) {
    await db.execute(
      sql`UPDATE lbs_newsletter_issues
             SET sent_at = NOW()
           WHERE id = ${id} AND sent_at IS NULL`,
    );
  }

  return report;
}

/** The date a draft is filed under, e.g. "Aug 1, 2026". Issues go out\n *  on the 1st and the 15th, so a build lands on whichever has passed. */
export function issueLabel(d: Date): string {
  const half = d.getDate() >= 15 ? 15 : 1;
  return new Date(d.getFullYear(), d.getMonth(), half).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
}
