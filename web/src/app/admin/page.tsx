import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/sections";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

/** Stats read from the shared database on staging; sample values here. */
const STATS = [
  { label: "Postcard orders (30d)", value: "12", href: "/admin/orders" },
  { label: "Revenue collected (30d)", value: "$4,188", href: "/admin/orders" },
  { label: "Awaiting artwork", value: "3", href: "/admin/orders" },
  { label: "New leads (7d)", value: "9", href: "/admin/leads" },
  { label: "Directory signups pending", value: "2", href: "/admin/leads" },
  { label: "Waitlist entries", value: "5", href: "/admin/leads" },
];

export default async function AdminDashboardPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <h1 className="text-[21px] font-bold tracking-[-0.02em] mb-1">Dashboard</h1>
      <p className="text-sm text-muted mb-6">
        Cross-system stats. Pipeline board and advertiser ledger remain in the
        legacy admin until they are ported.
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {STATS.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="p-5 grid gap-1 hover:border-faint transition-colors">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                {s.label}
              </span>
              <b className="text-[26px] font-bold tracking-[-0.025em] num">{s.value}</b>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
