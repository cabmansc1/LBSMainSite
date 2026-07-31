import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAdminLeads } from "@/lib/admin-data";
import { AdminLeads } from "@/components/admin-leads";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

/** Successor to admin/leads.php, reading the same leads table. */
export default async function AdminLeadsPage() {
  await requireAdmin();
  const leads = await getAdminLeads();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Leads</h1>
        <p className="text-sm text-muted mt-1">
          Advertising enquiries from the quiz and lead forms. {leads.length} on
          file. Every one was also sent to GoHighLevel when it came in, so
          deleting here does not lose the contact.
        </p>
      </div>

      <AdminLeads leads={leads} />
    </div>
  );
}
