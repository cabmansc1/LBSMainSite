import "server-only";
import { tentativelyMails } from "@/lib/mailings";
import { PLANNED_REACH } from "@/lib/pricing";
import { zoneBySlug } from "@/lib/zones";
import { SITE_URL } from "@/lib/seo";

/**
 * The message the waitlist promised.
 *
 * Everyone on the list was told they would hear from us when something
 * opened, so this is the only mail on the site that exists to keep a
 * promise rather than to confirm a transaction. That sets the bar for
 * the copy: it can only say things that are true at the moment it
 * sends, which rules out reach figures, prices and firm dates. A mail
 * month is the one date we have, and it is always tentative, so it goes
 * out in the words the rest of the site uses for it.
 *
 * Two waits share the table and they are not the same message. One is
 * "your category came open", which has a card behind it. The other is
 * "tell me about the smaller card", which has no card, no price and no
 * date, and sending it a category-freed notice would be a lie about a
 * product that does not exist yet.
 */

const PHONE = "(843) 212-2969";

/**
 * Duplicated from the public waitlist route, which owns the writing of
 * it. Matching on the stored string rather than importing keeps a route
 * handler out of this module's import graph, and the loose form below
 * catches the near misses if that string is ever reworded.
 */
const SMALLER_CARD_INTEREST = "Interest: 2,500 household card";

const isSmallerCardInterest = (category: string) => {
  const c = category.trim().toLowerCase();
  return (
    c === SMALLER_CARD_INTEREST.toLowerCase() ||
    /^interest:\s*2,?500/.test(c)
  );
};

export type WaitlistNotice = { subject: string; text: string; html: string };

export type WaitlistNoticeInput = {
  zoneSlug: string;
  category: string;
  businessName?: string;
  /**
   * Mail month of the soonest card in that neighborhood, when one is
   * known. Left out rather than guessed: a date nobody can stand behind
   * is worse than no date, because the reader will plan around it.
   */
  mailMonth?: string;
};

export function composeWaitlistNotice(input: WaitlistNoticeInput): WaitlistNotice {
  const zone = zoneBySlug(input.zoneSlug);
  const zoneName = zone?.name || input.zoneSlug;
  // Zone pages live at /<slug>-direct-mail-marketing. A row whose slug
  // is not in the zone list gets the calendar instead of a link that
  // 404s on someone we already kept waiting.
  const zoneHref = zone
    ? `${SITE_URL}/${zone.slug}-direct-mail-marketing`
    : `${SITE_URL}/mailing-calendar`;
  const greeting = `Hi ${input.businessName?.trim() || "there"},`;

  const body = isSmallerCardInterest(input.category)
    ? smallerCardBody(zoneName)
    : categoryOpenBody(zoneName, zoneHref, input.category.trim(), input.mailMonth);

  return {
    subject: body.subject,
    text: asText(greeting, body),
    html: asHtml(greeting, body),
  };
}

type NoticeBody = {
  subject: string;
  paragraphs: string[];
  action: { href: string; label: string };
};

function categoryOpenBody(
  zoneName: string,
  zoneHref: string,
  category: string,
  mailMonth?: string,
): NoticeBody {
  const paragraphs = [
    `You asked us to let you know when ${category} came open in ${zoneName}. It is open on an upcoming card.`,
  ];
  if (mailMonth) {
    paragraphs.push(
      `${tentativelyMails(mailMonth)}. Mail dates move while a card fills, so treat that as tentative until we confirm it with you.`,
    );
  }
  paragraphs.push(
    `One business per category per card, so that is the only ${category} ad on it. We are not able to hold it, so it goes to whoever books first.`,
    `If you want it, reply to this email or call ${PHONE} and we will get you set up.`,
  );
  return {
    subject: `Your category is open on an upcoming ${zoneName} card`,
    paragraphs,
    action: { href: zoneHref, label: `See the ${zoneName} card` },
  };
}

function smallerCardBody(zoneName: string): NoticeBody {
  return {
    subject: `About the ${PLANNED_REACH.attributive} card in ${zoneName}`,
    paragraphs: [
      `You asked to hear from us about the smaller ${PLANNED_REACH.attributive} card in ${zoneName}. This is that follow-up.`,
      `There is no price or mail date in this email because we do not have ones we can stand behind yet, and a number we would have to take back later is worth less to you than none. What we can do is tell you exactly where that card stands and what is running in ${zoneName} in the meantime.`,
      `Reply to this email or call ${PHONE} and we will go through it with you.`,
    ],
    action: { href: `${SITE_URL}/contact`, label: "Get in touch" },
  };
}

const SIGNOFF = ["Lowcountry Business Spotlight", PHONE];

function asText(greeting: string, body: NoticeBody) {
  return [
    greeting,
    "",
    ...body.paragraphs.flatMap((p) => [p, ""]),
    body.action.href,
    "",
    ...SIGNOFF,
  ].join("\n");
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Flat, hairline, no images. Transactional mail is read in a preview
 * pane, and every remote asset is one more thing a client can block.
 */
function asHtml(greeting: string, body: NoticeBody) {
  const p = (t: string) =>
    `<p style="margin:0 0 14px">${esc(t)}</p>`;
  return [
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0a1622;font-size:15px;line-height:1.55;max-width:560px">`,
    p(greeting),
    ...body.paragraphs.map(p),
    `<p style="margin:22px 0 4px"><a href="${esc(body.action.href)}" style="display:inline-block;background:#ff8c00;color:#0a1622;font-weight:700;text-decoration:none;padding:11px 18px;border-radius:10px">${esc(body.action.label)}</a></p>`,
    `<hr style="border:0;border-top:1px solid #dfe6ec;margin:26px 0 14px" />`,
    `<p style="margin:0;font-size:13px;color:#5b6b7a">${SIGNOFF.map(esc).join("<br />")}</p>`,
    `</div>`,
  ].join("");
}
