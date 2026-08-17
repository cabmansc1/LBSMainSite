import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/sections";
import { requireAdmin } from "@/lib/admin";
import { getDashboardStats } from "@/lib/admin-stats";
import { markSeen, recentActivity } from "@/lib/admin-activity";
import { AdminActivityFeed } from "@/components/admin-activity-feed";
import { AdminPushToggle } from "@/components/admin-push-toggle";
import { findPaymentGaps } from "@/lib/payment-reconcile";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

/**
 * A dash means the query failed, not that the answer is zero. Rendering
 * a 0 for an unreachable table is how a dashboard talks you out of
 * checking something that is actually broken.
 */
const num = (n: number | null) => (n === null ? "-" : n.toLocaleString("en-US"));
const money = (cents: number | null) =>
  cents === null ? "-" : `$${Math.round(cents / 100).toLocaleString("en-US")}`;

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const [s, feed, gaps] = await Promise.all([
    getDashboardStats(),
    recentActivity(session.email),
    // Money taken that Mission Control never heard about. Worked out on
    // the way in rather than stored, because the answer changes the
    // moment somebody fixes one by hand in MC, and a stored list would
    // keep showing it.
    findPaymentGaps().catch(() => []),
  ]);

  // Marked against what this render actually contains, not against the
  // newest row at the time of writing: something arriving between the
  // two would otherwise be marked read without ever being on screen.
  // After the read, so the divider still shows on this page load.
  if (feed.rows.length > 0) {
    await markSeen(session.email, feed.rows[0].id);
  }

  const stats = [
    {
      label: "Paid postcard orders (30d)",
      value: num(s.paidOrders30d),
      href: "/admin/orders",
    },
    {
      label: "Revenue collected (30d)",
      value: money(s.revenue30dCents),
      href: "/admin/orders",
    },
    {
      label: "Advertisers awaiting artwork",
      value: num(s.awaitingArtwork),
      href: "/admin/artwork",
    },
    { label: "New leads (7d)", value: num(s.newLeads7d), href: "/admin/leads" },
    {
      label: "Directory signups pending",
      value: num(s.signupsPending),
      // /admin/signups reads directory_signups, which is the legacy
      // form's table and no longer where a signup arrives. The queue
      // this number counts is the one on /admin/directory.
      href: "/admin/directory",
    },
    {
      label: "Listing changes to approve",
      value: num(s.listingEditsPending),
      href: "/admin/listing-edits",
    },
    {
      label: "Waiting on a category",
      value: num(s.waiting),
      href: "/admin/waitlist",
    },
  ];

  const anyFailed = Object.values(s).some((v) => v === null);

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <h1 className="text-[21px] font-bold tracking-[-0.02em] mb-1">Dashboard</h1>
      <p className="text-sm text-muted mb-6">
        Cross-system stats. Pipeline board and advertiser ledger remain in the
        legacy admin until they are ported.
      </p>

      {anyFailed && (
        <p className="mb-5 border border-line bg-surface rounded-(--radius-card) px-5 py-3.5 text-[13px] text-body">
          A dash means that figure could not be read, which is not the same as
          zero. The reason is in the server log.
        </p>
      )}

      {/* Above the figures, because this is money already taken and the
          figures are only ever information. */}
      {gaps.length > 0 && (
        <Card className="mb-5 p-5 grid gap-3 border-l-[3px] border-l-danger">
          <div>
            <h2 className="text-[15.5px] font-bold">
              {gaps.length === 1
                ? "A payment Mission Control has not got"
                : `${gaps.length} payments Mission Control has not got`}
            </h2>
            <p className="text-[13px] text-body mt-1 max-w-[74ch] leading-relaxed">
              Paid here and not settled there, which is what a Stripe webhook
              that failed to deliver looks like. The advertiser sees the card as
              paid, because their page falls back to our receipt. Mission
              Control does not, so the ledger and the card are both wrong until
              somebody puts it right there.
            </p>
          </div>
          <ul className="grid gap-2">
            {gaps.slice(0, 6).map((g) => (
              <li
                key={g.reference}
                className="flex items-baseline gap-3 flex-wrap text-[13px] border-b border-line pb-2 last:border-b-0 last:pb-0"
              >
                <b className="font-semibold">{g.businessName || g.email}</b>
                <span className="text-muted num">
                  {money(g.amountCents)} · {g.paidAt?.slice(0, 10) ?? ""} ·{" "}
                  {g.reference}
                </span>
                <span
                  className={`ml-auto text-[11px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${
                    g.problem === "missing"
                      ? "bg-[#fdeeee] text-danger border-[#f5c9c9]"
                      : "bg-cta-tint text-[#7a4a00] border-[#f3ddbb]"
                  }`}
                >
                  {/* Not on the card is worse than on it and unpaid: one
                      is a wrong number, the other is an advertiser who
                      will not be printed. */}
                  {g.problem === "missing" ? "Not on the card" : "Shows unpaid"}
                </span>
              </li>
            ))}
          </ul>
          {gaps.length > 6 && (
            <p className="text-[12.5px] text-muted">
              and {gaps.length - 6} more.
            </p>
          )}
          <Link
            href="/admin/orders"
            className="text-[13px] font-semibold text-brand-deep hover:underline"
          >
            See the orders
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="p-5 grid gap-1 hover:border-faint transition-colors">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                {s.label}
              </span>
              <b className="text-[26px] font-bold tracking-[-0.025em] num">
                {s.value}
              </b>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 mt-6 items-start">
        <AdminActivityFeed feed={feed} />
        <AdminPushToggle />
      </div>

      <p className="text-[12.5px] text-muted mt-4 max-w-[70ch]">
        Artwork counts neighborhood card orders only. Spotlight Postcard
        advertisers have no way to upload artwork yet, so none of them can be
        counted here.
      </p>
    </div>
  );
}
