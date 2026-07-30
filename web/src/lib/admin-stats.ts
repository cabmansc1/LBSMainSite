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
    // Deliberately the same predicate as admin/dashboard.php, so the two
    // admins cannot disagree about how many signups are waiting.
    stat("signups pending", () =>
      scalar(
        sql`SELECT COUNT(*) AS n FROM directory_signups WHERE status = 'pending'`,
      ),
    ),
    stat("waitlist", () => countWaitingEntries()),
  ]);

  return {
    paidOrders30d,
    revenue30dCents,
    awaitingArtwork,
    newLeads7d,
    signupsPending,
    waiting,
  };
}
