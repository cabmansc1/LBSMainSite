import "server-only";
import { sql } from "drizzle-orm";
import { countWaitingEntries } from "@/lib/waitlist";

/**
 * Dashboard figures.
 *
 * These were hardcoded sample strings until now, which is worse than
 * showing nothing: "$4,188" looked like revenue and was never connected
 * to a query. So the rule here is that a number is either measured or
 * it is absent. Every stat is `number | null`, each one is caught on
 * its own, and a failure renders as a dash rather than a zero. A zero
 * means "none", and a dash means "could not tell", and a dashboard that
 * confuses the two is not worth having.
 *
 * Each figure is its own COUNT or SUM rather than length of a fetched
 * list. The admin list queries cap at 200 rows, so counting them would
 * quietly understate any total that grew past the cap.
 */

export type DashboardStats = {
  paidOrders30d: number | null;
  revenue30dCents: number | null;
  awaitingArtwork: number | null;
  newLeads7d: number | null;
  signupsPending: number | null;
  waiting: number | null;
  listingEditsPending: number | null;
};

/** One stat, isolated: a missing legacy table must not blank the rest. */
async function stat(
  label: string,
  run: () => Promise<number>,
): Promise<number | null> {
  try {
    return await run();
  } catch (e) {
    console.error(`[admin-stats] ${label} failed:`, e);
    return null;
  }
}

const scalar = async (query: ReturnType<typeof sql>): Promise<number> => {
  const { db } = await import("@/lib/db");
  const rows = (await db.execute(query)) as unknown as [{ n: number | null }[]];
  return Number(rows[0]?.[0]?.n ?? 0);
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    paidOrders30d,
    revenue30dCents,
    awaitingArtwork,
    newLeads7d,
    signupsPending,
    waiting,
    listingEditsPending,
  ] = await Promise.all([
    // Paid only. A pending row is an abandoned Stripe session more often
    // than it is a sale in progress, and refunded money is not revenue.
    stat("paid orders 30d", () =>
      scalar(
        sql`SELECT COUNT(*) AS n FROM lbs_orders
            WHERE status = 'paid' AND created_at >= NOW() - INTERVAL 30 DAY`,
      ),
    ),
    stat("revenue 30d", () =>
      scalar(
        sql`SELECT COALESCE(SUM(amount_cents), 0) AS n FROM lbs_orders
            WHERE status = 'paid' AND created_at >= NOW() - INTERVAL 30 DAY`,
      ),
    ),
    // Everyone on a card that has not printed, from the Mission Control
    // roster rather than from an order table. This used to count rows in
    // directory_card_orders, which only saw neighborhood cards bought
    // online; most advertisers are sold over the phone and never appear
    // there, so the figure understated the thing it was named after.
    // Null when Mission Control cannot be read, so it renders as a dash.
    stat("awaiting artwork", async () => {
      const { getArtworkGaps } = await import("@/lib/artwork");
      const report = await getArtworkGaps();
      if (report === null) throw new Error("Mission Control unavailable");
      return report.gaps.length;
    }),
    // `leads`, not `directory_leads`: process_form.php and
    // save-quiz-lead.php both insert into the unprefixed table.
    stat("new leads 7d", () =>
      scalar(
        sql`SELECT COUNT(*) AS n FROM leads
            WHERE created_at >= NOW() - INTERVAL 7 DAY`,
      ),
    ),
    /**
     * Listings waiting to be looked at, counted where they actually
     * land.
     *
     * This used to read directory_signups, matching admin/dashboard.php
     * so the two admins could not disagree. That was right until the
     * signup itself moved: /directory-signup sends people to /register,
     * and registerBusiness writes a row straight into
     * directory_businesses with is_verified = 0. Nothing in this app has
     * ever inserted into directory_signups, so the figure sat still
     * while /admin/directory filled up and the email went out.
     *
     * Counted the way /admin/directory decides what is pending, so the
     * dashboard and the queue it links to agree.
     */
    stat("signups pending", async () => {
      const { countAwaitingReview } = await import("@/lib/listing-review");
      return countAwaitingReview();
    }),
    stat("waitlist", () => countWaitingEntries()),
    // Advertisers can edit most of their own listing now. What lands
    // here is only the part that waits on a person, so a number above
    // zero always means somebody is waiting on us.
    stat("listing edits pending", async () => {
      const { countPendingEdits } = await import("@/lib/listing-edits");
      return countPendingEdits();
    }),
  ]);

  return {
    paidOrders30d,
    revenue30dCents,
    awaitingArtwork,
    newLeads7d,
    signupsPending,
    waiting,
    listingEditsPending,
  };
}
