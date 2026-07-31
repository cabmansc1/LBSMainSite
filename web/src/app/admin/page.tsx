import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/sections";
import { requireAdmin } from "@/lib/admin";
import { getDashboardStats } from "@/lib/admin-stats";

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
  await requireAdmin();
  const s = await getDashboardStats();

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
      href: "/admin/signups",
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

      <p className="text-[12.5px] text-muted mt-4 max-w-[70ch]">
        Artwork counts neighborhood card orders only. Spotlight Postcard
        advertisers have no way to upload artwork yet, so none of them can be
        counted here.
      </p>
    </div>
  );
}
