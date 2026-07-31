import "server-only";
import { sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/seo";
import {
  annualSavingCents,
  getLiveDirectoryPricing,
  money,
} from "@/lib/directory-pricing";

/**
 * The same offer as the banner in the portal, for the advertisers who
 * never open the portal.
 *
 * That is most of them. Somebody buys a spot, gets their receipt, sends
 * their artwork by reply and never signs in once, so a banner behind a
 * login reaches the smaller half of the audience. The offer is worth
 * making to the other half, and it is the one email in this app that is
 * a pitch rather than a notice, which is why the rules around it are
 * tighter than anywhere else.
 *
 * Never automatic. It is sent from the admin, to a list you can see
 * before you send it, because a pitch that goes out on a timer is how a
 * business ends up mailing somebody the week they asked to be left
 * alone.
 */

export type InviteCandidate = {
  userId: number;
  email: string;
  businessName: string;
  /** How many spots they have bought. Context for who is worth asking. */
  orders: number;
  /** Null when they have never been sent this. */
  lastSentAt: string | null;
  /** They pressed "not right now" on the banner this recently. */
  dismissedAt: string | null;
};

/**
 * Long enough that a second ask is a fresh conversation rather than a
 * follow-up. This is a pitch, and the cost of over-asking is not a
 * complaint, it is somebody deciding our mail is not worth opening.
 */
export const RESEND_AFTER_DAYS = 120;

/** Dismissing the banner is an answer. It counts here too. */
export const RESPECT_DISMISSAL_DAYS = 60;

/**
 * Advertisers who have paid for a spot and have no directory listing.
 *
 * Matched on email, which is what ties an order to a login and to a
 * listing everywhere else in this app.
 */
export async function getInviteCandidates(): Promise<InviteCandidate[]> {
  try {
    const { db } = await import("@/lib/db");
    const { ensureAdvertiserBusinessTable } = await import(
      "@/lib/advertiser-business"
    );
    await ensureAdvertiserBusinessTable();

    const rows = (await db.execute(
      sql`SELECT u.id            AS userId,
                 o.email         AS email,
                 MAX(o.business_name) AS businessName,
                 COUNT(*)        AS orders,
                 MAX(b.directory_invite_emailed_at) AS lastSentAt,
                 MAX(b.directory_invite_dismissed_at) AS dismissedAt
          FROM lbs_orders o
          JOIN directory_users u ON u.email = o.email
          LEFT JOIN directory_businesses d ON d.email = o.email
          LEFT JOIN lbs_advertiser_business b ON b.user_id = u.id
          WHERE o.status = 'paid'
            AND o.email <> ''
            AND d.id IS NULL
          GROUP BY u.id, o.email
          ORDER BY orders DESC, o.email`,
    )) as unknown as [Record<string, unknown>[]];

    return (rows[0] ?? []).map((r) => ({
      userId: Number(r.userId),
      email: String(r.email ?? ""),
      businessName: String(r.businessName ?? ""),
      orders: Number(r.orders ?? 0),
      lastSentAt: r.lastSentAt ? String(r.lastSentAt) : null,
      dismissedAt: r.dismissedAt ? String(r.dismissedAt) : null,
    }));
  } catch (e) {
    console.error("[directory-invite] candidate lookup failed:", e);
    return [];
  }
}

const daysSince = (iso: string | null) =>
  iso === null ? Infinity : (Date.now() - new Date(iso).getTime()) / 86_400_000;

/**
 * Whether this one should be offered for sending, and why not.
 *
 * Returned rather than filtered out, so the admin sees the whole list
 * and understands why somebody is not on it. A list that silently
 * shortens is one nobody trusts.
 */
export function inviteEligibility(c: InviteCandidate): {
  ok: boolean;
  reason?: string;
} {
  if (daysSince(c.lastSentAt) < RESEND_AFTER_DAYS) {
    return {
      ok: false,
      reason: `Emailed ${Math.round(daysSince(c.lastSentAt))} days ago`,
    };
  }
  if (daysSince(c.dismissedAt) < RESPECT_DISMISSAL_DAYS) {
    return {
      ok: false,
      reason: `Said not right now ${Math.round(daysSince(c.dismissedAt))} days ago`,
    };
  }
  return { ok: true };
}

export async function composeInvite(c: InviteCandidate): Promise<{
  subject: string;
  text: string;
}> {
  const pricing = await getLiveDirectoryPricing();
  const saving = annualSavingCents(pricing);
  const who = c.businessName.trim() || "your business";

  const premium: string[] = [];
  if (pricing.monthlyCents > 0 || pricing.annualCents > 0) {
    const price =
      pricing.monthlyCents > 0 && pricing.annualCents > 0
        ? `${money(pricing.monthlyCents)} a month, or ${money(pricing.annualCents)} a year${saving ? `, which saves you ${money(saving)}` : ""}`
        : pricing.monthlyCents > 0
          ? `${money(pricing.monthlyCents)} a month`
          : `${money(pricing.annualCents)} a year`;
    premium.push(
      "",
      `If you want more than the basics, Premium is ${price}. It adds photos, a special offer shown on your listing and on your card in the directory, and puts you above the free listings in your category.`,
    );
  }

  return {
    subject: `${who} is not in the Lowcountry directory yet`,
    text: [
      `You advertise with us on the postcard, but ${who} is not listed in our online directory, and the listing is free.`,
      "",
      "It puts your name, phone, website and category in front of people already searching the Lowcountry for what you do. We have your details from your order, so it is a couple of clicks rather than a form.",
      ...premium,
      "",
      `Add your listing: ${SITE_URL}/register`,
      "",
      "If you would rather not, ignore this and we will not chase it.",
    ].join("\n"),
  };
}

export type InviteSendResult = {
  email: string;
  sent: boolean;
  error?: string;
};

/**
 * Sends to the ones chosen, and records who was sent to.
 *
 * The send happens before the record, and only what actually sent is
 * recorded: a timestamp for an email nobody received would retire the
 * candidate and the offer would never be made.
 */
export async function sendDirectoryInvites(
  userIds: number[],
): Promise<InviteSendResult[]> {
  const chosen = new Set(userIds.map(Number).filter(Number.isInteger));
  if (chosen.size === 0) return [];

  const candidates = (await getInviteCandidates()).filter((c) =>
    chosen.has(c.userId),
  );
  const results: InviteSendResult[] = [];

  for (const c of candidates) {
    // Re-checked at send time, not just when the list was drawn. The
    // page may have been open a while, and this is the one email where
    // sending twice costs goodwill rather than patience.
    const { ok, reason } = inviteEligibility(c);
    if (!ok) {
      results.push({ email: c.email, sent: false, error: reason });
      continue;
    }

    const { subject, text } = await composeInvite(c);
    const res = await sendEmail({ to: c.email, subject, text });
    results.push({
      email: c.email,
      sent: res.sent,
      error: res.sent ? undefined : (res.error ?? "did not send"),
    });

    if (!res.sent) continue;
    try {
      const { db } = await import("@/lib/db");
      await db.execute(
        sql`INSERT INTO lbs_advertiser_business
              (user_id, email, directory_invite_emailed_at, directory_invite_emails)
            VALUES (${c.userId}, ${c.email}, NOW(), 1)
            ON DUPLICATE KEY UPDATE
              directory_invite_emailed_at = NOW(),
              directory_invite_emails = directory_invite_emails + 1`,
      );
    } catch (e) {
      console.error("[directory-invite] could not record send:", e);
    }
  }

  return results;
}
