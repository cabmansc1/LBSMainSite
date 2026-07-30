import "server-only";
import { sql } from "drizzle-orm";

/**
 * Premium directory subscriptions.
 *
 * Stripe knows the truth about billing; this table exists so the site
 * can answer "is this listing Premium right now" without a round trip
 * to Stripe on every page view, and so an admin can see why a listing
 * is or is not featured.
 *
 * The listing's own `plan_type` stays the thing the directory reads,
 * because that is what the public queries and the legacy PHP already
 * use. This table is the record of why it holds the value it does.
 *
 * Premium maps to plan_type 'featured' rather than a new value. The
 * ranking, the badge and the isFeatured flag on the public side all
 * already understand basic/featured/elite, and inventing a fourth would
 * mean teaching every one of them about it. 'elite' stays reserved for
 * whatever we sell above this.
 */

export const PREMIUM_PLAN_TYPE = "featured";
export const FREE_PLAN_TYPE = "basic";

export type SubscriptionTerm = "monthly" | "annual";

/**
 * Whether a listing is entitled to the paid features.
 *
 * Read off plan_type rather than the subscription table, because that
 * column is what the public site already ranks and badges on, and
 * because a listing an admin has put on a paid plan by hand has no
 * subscription row at all. The table records why a plan is what it is;
 * this answers what it is.
 *
 * 'elite' counts: it sits above featured, so anything featured gets it
 * would be absurd to withhold from the tier above.
 */
export const isPremiumPlan = (planType: string | null | undefined): boolean =>
  planType === PREMIUM_PLAN_TYPE || planType === "elite";

/** Stripe statuses that mean we should be giving them Premium. */
const LIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * past_due counts as live on purpose. Stripe retries a failed card for
 * days, and stripping a paying customer's listing the hour their card
 * expired would cost us more than the fortnight of grace costs. It ends
 * at 'canceled' or 'unpaid', which is where Stripe gives up too.
 */
export const isLive = (status: string) => LIVE_STATUSES.has(status);

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_directory_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      email VARCHAR(255) NOT NULL DEFAULT '',
      stripe_customer_id VARCHAR(255) NOT NULL DEFAULT '',
      stripe_subscription_id VARCHAR(255) NOT NULL DEFAULT '',
      term VARCHAR(16) NOT NULL DEFAULT 'monthly',
      status VARCHAR(32) NOT NULL DEFAULT 'incomplete',
      amount_cents INT NOT NULL DEFAULT 0,
      current_period_end DATETIME NULL,
      cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL,
      UNIQUE KEY uq_subscription (stripe_subscription_id),
      INDEX (business_id),
      INDEX (email),
      INDEX (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

export type DirectorySubscription = {
  id: number;
  businessId: number;
  email: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  term: SubscriptionTerm;
  status: string;
  amountCents: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const row = (r: Record<string, unknown>): DirectorySubscription => ({
  id: Number(r.id),
  businessId: Number(r.business_id),
  email: String(r.email ?? ""),
  stripeCustomerId: String(r.stripe_customer_id ?? ""),
  stripeSubscriptionId: String(r.stripe_subscription_id ?? ""),
  term: (String(r.term) === "annual" ? "annual" : "monthly") as SubscriptionTerm,
  status: String(r.status ?? ""),
  amountCents: Number(r.amount_cents ?? 0),
  currentPeriodEnd: r.current_period_end ? String(r.current_period_end) : null,
  cancelAtPeriodEnd: r.cancel_at_period_end === 1 || r.cancel_at_period_end === true,
});

/**
 * Records a subscription and moves the listing onto the right plan.
 *
 * Idempotent on the Stripe subscription id, because Stripe retries
 * webhooks and delivers the same event more than once. The listing's
 * plan follows the status every time rather than only on creation, so a
 * cancellation and a reactivation both land without special cases.
 */
export async function recordSubscription(input: {
  businessId: number;
  email: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  term: SubscriptionTerm;
  status: string;
  amountCents: number;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
}): Promise<void> {
  await ensureTable();
  const { db } = await import("@/lib/db");

  const periodEnd = input.currentPeriodEnd ?? null;

  await db.execute(
    sql`INSERT INTO lbs_directory_subscriptions
          (business_id, email, stripe_customer_id, stripe_subscription_id,
           term, status, amount_cents, current_period_end,
           cancel_at_period_end, updated_at)
        VALUES (${input.businessId}, ${input.email}, ${input.stripeCustomerId},
                ${input.stripeSubscriptionId}, ${input.term}, ${input.status},
                ${input.amountCents}, ${periodEnd},
                ${input.cancelAtPeriodEnd ? 1 : 0}, NOW())
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          term = VALUES(term),
          amount_cents = VALUES(amount_cents),
          current_period_end = VALUES(current_period_end),
          cancel_at_period_end = VALUES(cancel_at_period_end),
          updated_at = NOW()`,
  );

  await applyPlan(input.businessId, input.status);
}

/**
 * Puts the listing on the plan its subscription entitles it to.
 *
 * A lapsed subscription drops to Basic rather than hiding the listing.
 * They stop paying for photos and placement, they do not stop being a
 * local business, and deleting them from the directory over a declined
 * card would be a worse product than a free tier.
 */
export async function applyPlan(
  businessId: number,
  status: string,
): Promise<void> {
  const { db } = await import("@/lib/db");
  const plan = isLive(status) ? PREMIUM_PLAN_TYPE : FREE_PLAN_TYPE;

  // Verified as well, for the paid case: this is the moment a paid
  // listing becomes public, and it is deliberately the webhook's job
  // rather than the signup form's.
  if (isLive(status)) {
    await db.execute(
      sql`UPDATE directory_businesses
          SET plan_type = ${plan}, is_verified = 1, is_active = 1
          WHERE id = ${businessId}`,
    );
  } else {
    await db.execute(
      sql`UPDATE directory_businesses
          SET plan_type = ${plan}
          WHERE id = ${businessId}`,
    );
  }
}

/** The subscription behind a listing, if there is one. */
export async function subscriptionForBusiness(
  businessId: number,
): Promise<DirectorySubscription | undefined> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_directory_subscriptions
          WHERE business_id = ${businessId}
          ORDER BY id DESC LIMIT 1`,
    )) as unknown as [Record<string, unknown>[]];
    const r = rows[0]?.[0];
    return r ? row(r) : undefined;
  } catch (e) {
    console.error("[subscriptions] lookup failed:", e);
    return undefined;
  }
}

/** Subscriptions for a set of listings, for the portal's billing page. */
export async function subscriptionsForBusinesses(
  businessIds: number[],
): Promise<Map<number, DirectorySubscription>> {
  const out = new Map<number, DirectorySubscription>();
  if (businessIds.length === 0) return out;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_directory_subscriptions
          WHERE business_id IN (${sql.join(
            businessIds.map((i) => sql`${i}`),
            sql`, `,
          )})
          ORDER BY id ASC`,
    )) as unknown as [Record<string, unknown>[]];
    // Ascending, so the newest row for a business wins the slot.
    for (const r of rows[0] ?? []) {
      const sub = row(r);
      out.set(sub.businessId, sub);
    }
  } catch (e) {
    console.error("[subscriptions] batch lookup failed:", e);
  }
  return out;
}
