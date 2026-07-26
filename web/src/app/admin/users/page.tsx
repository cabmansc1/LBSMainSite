import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAdminUsers } from "@/lib/admin-data";
import { AdminUsers } from "@/components/admin-users";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Accounts",
  robots: { index: false, follow: false },
};

/**
 * Advertiser account management. The legacy admin had no screen for this,
 * so a business who lost their password had no path back in.
 */
export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await getAdminUsers();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Accounts</h1>
        <p className="text-sm text-muted mt-1">
          Business logins for the advertiser portal. Set a password to help an
          owner back in, or to sign in yourself and test what they see.
        </p>
      </div>
      <AdminUsers users={users} />
    </div>
  );
}
