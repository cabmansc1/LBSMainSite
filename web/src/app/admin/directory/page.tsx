import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAdminBusinesses } from "@/lib/admin-data";
import { AdminDirectory } from "@/components/admin-directory";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Directory listings",
  robots: { index: false, follow: false },
};

/** Successor to admin/manage_directory.php: same tables, same effects. */
export default async function AdminDirectoryPage() {
  await requireAdmin();
  const businesses = await getAdminBusinesses();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          Directory listings
        </h1>
        <p className="text-sm text-muted mt-1">
          Edit any listing, change its plan, and toggle featured, verified, or
          hidden. Changes write to the same tables the live site reads, so they
          appear immediately on both sites.
        </p>
      </div>
      <AdminDirectory businesses={businesses} />
    </div>
  );
}
