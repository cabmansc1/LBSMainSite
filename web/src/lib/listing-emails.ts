import "server-only";
import { alertsTo, sendEmail } from "@/lib/email";
import { FIELD_LABELS, type ReviewField } from "@/lib/listing-edits";
import { CONTACT_PHONE } from "@/lib/seo";

/**
 * Notifications for the half of a listing edit that waits on a person.
 *
 * The portal already tells an advertiser on screen that a change went
 * to us for review, and the field carries a "waiting on us" note until
 * it is decided, so there is no receipt email here: the pending state
 * is visible where they left it. What was missing is the other two
 * moments, and both were promises with nothing behind them.
 *
 * The form says "we will email you when it is live", so approving has
 * to send something. Rejecting has to send something too, or that
 * promise turns into an advertiser waiting on a message that is never
 * coming, which is worse than having said nothing at all.
 *
 * And nothing told us a request had arrived. A review queue you have
 * to remember to visit is a review queue that goes stale, and a change
 * sitting unnoticed for a week is indistinguishable to the advertiser
 * from one we ignored.
 */

export type QueuedChange = { field: ReviewField; from: string; to: string };

export type QueuedFacts = {
  businessName: string;
  slug: string;
  /** The advertiser who asked, so a reply in the inbox reaches them. */
  advertiserEmail: string;
  changes: QueuedChange[];
  siteOrigin?: string;
};

const shown = (v: string) => (v.trim() === "" ? "(empty)" : v);

/**
 * Turns stored values into ones a person recognises.
 *
 * Category and location area are stored as slugs, so an advertiser who
 * picked "Plumbing" off a dropdown would otherwise be emailed
 * "plumbing", and an area would arrive as "mount-pleasant". Built once
 * per message rather than per value, and it falls back to the raw slug
 * so a taxonomy lookup that fails costs clarity rather than the email.
 */
async function labeller(): Promise<(f: ReviewField, v: string) => string> {
  const { getFilterOptions } = await import("@/lib/directory");
  const options = await getFilterOptions().catch((e) => {
    console.error("[listing-email] taxonomy lookup failed:", e);
    return null;
  });
  const cat = new Map((options?.categories ?? []).map((c) => [c.slug, c.name]));
  const loc = new Map((options?.locations ?? []).map((l) => [l.slug, l.name]));
  return (field, value) =>
    field === "category"
      ? (cat.get(value) ?? value)
      : field === "locationArea"
        ? (loc.get(value) ?? value)
        : value;
}

/** Waiting on you. Written to be actionable from the notification alone. */
export function composeQueuedAlert(f: QueuedFacts) {
  const lines = f.changes.map(
    (c) => `${FIELD_LABELS[c.field]}: ${shown(c.from)} -> ${shown(c.to)}`,
  );
  const one = f.changes.length === 1;

  return {
    subject: `Listing change to approve: ${f.businessName}`,
    text: [
      `${f.businessName} asked to change ${one ? "one thing" : `${f.changes.length} things`} on their directory listing.`,
      lines.join("\n"),
      `Asked by ${f.advertiserEmail}.`,
      // Said explicitly because it is the reason this needs a person:
      // everything an advertiser can publish themselves has already
      // published by the time this email exists.
      "Their public page still shows the current details until you approve.",
      f.siteOrigin
        ? `Approve or reject: ${f.siteOrigin}/admin/listing-edits`
        : "Approve or reject at /admin/listing-edits",
    ].join("\n\n"),
  };
}

export type DecisionFacts = {
  field: ReviewField;
  /** The listing's name as stored before the decision. */
  businessName: string;
  slug: string;
  advertiserEmail: string;
  newValue: string;
  approved: boolean;
  /** What the admin typed when rejecting. Empty is normal. */
  reason?: string;
  siteOrigin?: string;
};

/**
 * The answer to "we will email you when it is live".
 *
 * A rejection says why when we said why. Without a note it says
 * nothing about the cause rather than guessing at one: an email that
 * explains a decision incorrectly is worse than one that asks the
 * advertiser to get in touch, because they act on the wrong
 * explanation instead of calling.
 */
export function composeDecision(f: DecisionFacts) {
  const label = FIELD_LABELS[f.field];
  // Named, because an advertiser can have more than one listing and
  // "your listing" would not say which. On an approved name change the
  // stored name is still the old one, so it is identified by what it is
  // called now that we have said yes.
  const business =
    f.approved && f.field === "name" ? f.newValue : f.businessName;
  const page = f.siteOrigin ? `${f.siteOrigin}/business/${f.slug}` : undefined;

  if (f.approved) {
    return {
      subject: `Your ${label.toLowerCase()} change is live`,
      text: [
        `We have made the change you asked for on your listing for ${business}.`,
        `${label} is now: ${shown(f.newValue)}`,
        page ? `See it: ${page}` : undefined,
        // Worth repeating here, because this email is the moment
        // somebody learns how the split works.
        "Your phone, description, website, hours and social links you can change yourself at any time, and those go live straight away. Only your name, category and area come to us first.",
        `Lowcountry Business Spotlight\n${CONTACT_PHONE}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  const reason = f.reason?.trim();
  return {
    subject: `About the ${label.toLowerCase()} change you asked for`,
    text: [
      `We have not made this change to ${business}'s listing:`,
      `${label}: ${shown(f.newValue)}`,
      reason,
      "Your listing is unchanged and still live.",
      reason
        ? `If that does not sound right, reply to this email or call us on ${CONTACT_PHONE}.`
        : `Reply to this email or call us on ${CONTACT_PHONE} and we will explain and sort it out.`,
      "Lowcountry Business Spotlight",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

/**
 * Neither of these may fail the thing that triggered them. A saved edit
 * is saved and an approved change is live whatever the mail server
 * does; failing the request would report the opposite.
 */
export async function sendQueuedAlert(f: QueuedFacts): Promise<void> {
  if (f.changes.length === 0) return;
  const label = await labeller();
  await sendEmail({
    to: alertsTo(),
    ...composeQueuedAlert({
      ...f,
      changes: f.changes.map((c) => ({
        field: c.field,
        from: label(c.field, c.from),
        to: label(c.field, c.to),
      })),
    }),
    replyTo: f.advertiserEmail,
  }).catch((e) => console.error("[listing-email] queue alert failed:", e));
}

export async function sendDecision(f: DecisionFacts): Promise<void> {
  if (!f.advertiserEmail) return;
  const label = await labeller();
  await sendEmail({
    to: f.advertiserEmail,
    ...composeDecision({ ...f, newValue: label(f.field, f.newValue) }),
  }).catch((e) => console.error("[listing-email] decision failed:", e));
}
