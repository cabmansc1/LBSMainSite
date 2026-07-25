import type { Metadata } from "next";
import { StatusChip } from "@/components/sections";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

/** Reads leads + directory_signups + waitlist_entries on staging. */
const LEADS = [
  {
    name: "Coastal Turf Care",
    contact: "mike@example.com",
    source: "Zone page form · Summerville",
    when: "2 hours ago",
    status: <StatusChip tone="warn">New</StatusChip>,
  },
  {
    name: "Harborview Fitness",
    contact: "amy@example.com",
    source: "Quiz · recommended Medium 5k",
    when: "Yesterday",
    status: <StatusChip tone="info">Contacted</StatusChip>,
  },
  {
    name: "Sweetgrass Bakery",
    contact: "orders@example.com",
    source: "Waitlist · Restaurants · Mount Pleasant",
    when: "2 days ago",
    status: <StatusChip tone="ok">Waitlist</StatusChip>,
  },
  {
    name: "Ashley River Auto Spa",
    contact: "info@example.com",
    source: "Directory signup · Premium",
    when: "3 days ago",
    status: <StatusChip tone="warn">Review signup</StatusChip>,
  },
];

export default async function AdminLeadsPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Leads</h1>
        <p className="text-sm text-muted mt-1">
          Advertising leads, quiz results, waitlist entries, and directory
          signups in one queue. Each also pushes to GoHighLevel.
        </p>
      </div>
      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[680px]">
          <thead>
            <tr>
              {["Business", "Contact", "Source", "Received", "Status", ""].map((h) => (
                <th
                  key={h}
                  className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEADS.map((l) => (
              <tr key={l.name} className="hover:bg-surface">
                <td className="px-4 py-3.5 border-b border-line font-semibold">{l.name}</td>
                <td className="px-4 py-3.5 border-b border-line">{l.contact}</td>
                <td className="px-4 py-3.5 border-b border-line">{l.source}</td>
                <td className="px-4 py-3.5 border-b border-line text-muted">{l.when}</td>
                <td className="px-4 py-3.5 border-b border-line">{l.status}</td>
                <td className="px-4 py-3.5 border-b border-line">
                  <button className="text-brand-deep font-semibold hover:underline">
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12.5px] text-muted mt-3">
        Sample rows until the staging database connects.
      </p>
    </div>
  );
}
