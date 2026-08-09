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
  cards: IssueCard[];
  story: { title: string; body: string };
  news: string;
  signoff: string;
};

export type Issue = {
  id: number;
  status: IssueStatus;
  content: IssueContent;
  groups: AudienceGroup[];
  leadsMonths: number;
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
export async function assembleContent(label: string): Promise<IssueContent> {
  // Spot counts come from the mailing list rather than the roster: the
  // roster carries who is on a card, not how many places it holds, so
  // counting advertiser rows would report a full card as having however
  // many people happened to have bought.
  const mailings = (await getUpcomingMailings().catch(() => [])).filter((m) =>
    isBookable(m.status),
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

  return {
    subject: `Spotlight Advertiser Update, ${label}`,
    preheader: "Open zones, artwork deadlines and what is still available.",
    intro:
      "Here is where things stand across the Lowcountry this fortnight: what is open, what is closing, and what is coming next.",
    cards,
    story: { title: "", body: "" },
    news: "",
    signoff: "Andrew\nLowcountry Business Spotlight",
  };
}

/* ---------- reading and writing issues ---------- */

type IssueRow = {
  id: number;
  status: string;
  content: string;
  audience: string;
  leads_months: number;
  built_for: string;
  send_count: number;
  sent_at?: unknown;
  created_at?: unknown;
};

const STATUSES = new Set(["draft", "sending", "sent", "cancelled"]);

function toIssue(r: IssueRow): Issue | undefined {
  let content: IssueContent;
  try {
    content = JSON.parse(r.content) as IssueContent;
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
 * Creates the fortnight's draft, unless one already exists.
 *
 * built_for is the fortnight label, and a second call with the same
 * label returns the issue already there rather than making another. The
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
            (kind, status, content, audience, leads_months, built_for)
          VALUES ('advertiser', 'draft', ${JSON.stringify(content)},
                  ${DEFAULT_GROUPS.join(",")}, 12, ${label})`,
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
                 status = ${patch.status ?? issue.status}
           WHERE id = ${id}`,
    );
    return { ok: true };
  } catch (e) {
    console.error("[newsletter] save failed:", e);
    return { ok: false, error: "That did not save." };
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
  const lines: string[] = [greeting, "", content.intro, ""];

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
    `<p style="margin:0 0 14px">${esc(greeting)}</p>`,
    `<p style="margin:0 0 20px">${esc(content.intro)}</p>`,
  );

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

  h.push(
    `<p style="margin:22px 0"><a href="${origin}/pricing" style="display:inline-block;background:#0a1622;color:#fff;text-decoration:none;padding:11px 18px;border-radius:9px;font-weight:600">Reserve a spot</a></p>`,
    `<p style="margin:0 0 18px;white-space:pre-wrap;color:#5e7183">${esc(content.signoff)}</p>`,
    `<hr style="border:0;border-top:1px solid #dbe4ec;margin:20px 0">`,
    `<p style="margin:0;font-size:12px;color:#5e7183">You are getting this because you advertise with ${esc(SITE_NAME)}, have a listing in our directory, or asked us about advertising. <a href="${unsub}" style="color:#1478b8">Unsubscribe</a>.</p>`,
    `</div>`,
  );

  return { subject: content.subject, text: lines.join("\n"), html: h.join("") };
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

  const audience = await buildAudience(issue.groups, issue.leadsMonths);
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

/** The fortnight label a draft is built for, e.g. "Aug 1 2026". */
export function issueLabel(d: Date): string {
  const half = d.getDate() >= 15 ? 15 : 1;
  return new Date(d.getFullYear(), d.getMonth(), half).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
}
