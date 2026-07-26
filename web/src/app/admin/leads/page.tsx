import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAdminLeads } from "@/lib/admin-data";

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
          file.
        </p>
      </div>

      {leads.length === 0 ? (
        <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-8 text-center">
          No leads captured yet.
        </p>
      ) : (
        <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
          <table className="w-full border-collapse text-[13.5px] min-w-[820px]">
            <thead>
              <tr>
                {["Business", "Contact", "Area", "Interested in", "Received"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-surface align-top">
                  <td className="px-4 py-3.5 border-b border-line font-semibold">
                    {l.company || "-"}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line text-[12.5px]">
                    {l.contact}
                    <div>
                      {l.email && (
                        <a
                          href={`mailto:${l.email}`}
                          className="text-brand-deep hover:underline"
                        >
                          {l.email}
                        </a>
                      )}
                    </div>
                    {l.phone && <div className="text-muted num">{l.phone}</div>}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line text-[12.5px] text-muted">
                    {l.location || "-"}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line text-[12.5px]">
                    {l.interest || "-"}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line text-[12.5px] text-muted">
                    {l.createdAt?.slice(0, 16) ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
