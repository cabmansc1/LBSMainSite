import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getDirectorySignups } from "@/lib/admin-data";
import { AdminSignups } from "@/components/admin-signups";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Directory signups",
  robots: { index: false, follow: false },
};

/** Successor to admin/directory_signups.php, same table and statuses. */
export default async function AdminSignupsPage() {
  await requireAdmin();
  const rows = await getDirectorySignups();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          Directory signups
        </h1>
        <p className="text-sm text-muted mt-1">
          Businesses that requested a listing. Approve or reject each one; the
          same statuses the legacy admin writes.
        </p>
      </div>
      <AdminSignups rows={rows} />
    </div>
  );
}
