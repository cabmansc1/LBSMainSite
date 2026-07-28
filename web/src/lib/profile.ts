import "server-only";
import { sql } from "drizzle-orm";

/**
 * Contact details we need from an advertiser but do not have.
 *
 * Checkout asks for a phone number and lets people skip it, which is the
 * right trade on a paid form: friction there costs sales. The cost of
 * skipping lands later, when the artwork deadline approaches and the
 * only way to reach someone is an email they have not opened.
 *
 * So the portal asks for what is missing, once the sale is already
 * banked and a form field costs nothing.
 *
 * Only fields with a real consumer belong here. A prompt for a detail
 * nothing uses is a nag, and it teaches people to dismiss the prompt
 * that matters.
 */

export type MissingField = {
  key: "phone";
  label: string;
  /** Shown to the advertiser. Why we are asking, in their terms. */
  why: string;
};

/**
 * What we are missing for this advertiser.
 *
 * Reads the order rows rather than the directory listing on purpose:
 * the listing phone is a published business line, and the deadline
 * texts want whatever number reaches the person who approves artwork.
 * Those are often the same and sometimes very much not.
 */
export async function missingProfileFields(email: string): Promise<MissingField[]> {
  if (!email) return [];
  const missing: MissingField[] = [];

  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT COUNT(*) AS total,
                 SUM(CASE WHEN phone <> '' THEN 1 ELSE 0 END) AS withPhone
          FROM lbs_orders WHERE email = ${email}`,
    )) as unknown as [{ total: number | string; withPhone: number | string | null }[]];
    const total = Number(rows[0]?.[0]?.total ?? 0);
    const withPhone = Number(rows[0]?.[0]?.withPhone ?? 0);
    // Nothing to chase means nothing to ask for. Someone who has not
    // bought yet should not be met with a form on their first visit.
    if (total > 0 && withPhone === 0) {
      missing.push({
        key: "phone",
        label: "Mobile number",
        why: "So we can text you about your artwork deadline and your proof. Those are the only two things we text about.",
      });
    }
  } catch (e) {
    // A prompt we cannot substantiate is worse than no prompt: it would
    // ask everyone for something they may already have given us.
    console.error("[profile] could not check for missing fields:", e);
    return [];
  }

  return missing;
}

/**
 * Store a phone number against this advertiser's orders.
 *
 * Written onto the order rows because that is where the artwork chase
 * will read it: a deadline belongs to a card, and so does the reminder.
 * Denormalised across their orders on purpose, so a number given today
 * covers the campaign already in flight rather than only the next one.
 *
 * Not synced to Mission Control. MC's API has no account-update endpoint
 * in the contract we hold, and inventing one that quietly fails would be
 * worse than leaving it. The number is captured at checkout for new
 * orders, which is the path that reaches MC.
 */
export async function saveProfilePhone(email: string, phone: string): Promise<boolean> {
  const clean = phone.trim().slice(0, 40);
  if (!email || !clean) return false;
  try {
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`UPDATE lbs_orders SET phone = ${clean}
          WHERE email = ${email} AND phone = ''`,
    );
    return true;
  } catch (e) {
    console.error("[profile] could not save phone:", e);
    return false;
  }
}

/**
 * Enough digits to be a real number, loose enough for the ways people
 * type them. Rejecting a valid number is worse than accepting a typo we
 * can see and fix.
 */
export const looksLikePhone = (v: string) =>
  (v.match(/\d/g) ?? []).length >= 10;
