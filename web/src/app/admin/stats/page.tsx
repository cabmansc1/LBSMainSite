import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getSiteStats } from "@/lib/admin-data";
import { AdminStats } from "@/components/admin-stats";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Homepage stats",
  robots: { index: false, follow: false },
};

/** Successor to admin/site_stats.php, writing the same site_stats table. */
export default async function AdminStatsPage() {
  await requireAdmin();
  const stats = await getSiteStats();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          Homepage stats
        </h1>
        <p className="text-sm text-muted mt-1">
          The numbers in the stats bar. Same table the legacy admin writes, so
          edits from either place show up on both sites.
        </p>
      </div>
      <AdminStats stats={stats} />
    </div>
  );
}
