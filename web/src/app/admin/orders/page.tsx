import type { Metadata } from "next";
import { StatusChip } from "@/components/sections";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

/**
 * Order review: mirrors card_orders + postcard_orders on staging.
 * Approve artwork, review refunds (refund execution calls Stripe with
 * the same issueRefund flow the legacy admin used).
 */
const ORDERS = [
  {
    business: "Palmetto Plumbing Co.",
    category: "plumbing",
    where: "Summerville · Sept",
    spot: "Medium 3×4",
    paid: "$349",
    status: <StatusChip tone="ok">Paid</StatusChip>,
    artwork: <StatusChip tone="warn">Needed</StatusChip>,
  },
  {
    business: "Lowcountry Smiles Dental",
    category: "dental",
    where: "Summerville · Sept",
    spot: "Large 4×6",
    paid: "$599",
    status: <StatusChip tone="ok">Paid</StatusChip>,
    artwork: <StatusChip tone="ok">Approved</StatusChip>,
  },
  {
    business: "Marsh View Roofing",
    category: "roofing",
    where: "Goose Creek · Oct",
    spot: "Small 3×2",
    paid: "$249",
    status: <StatusChip tone="warn">Pending hold</StatusChip>,
    artwork: null,
  },
  {
    business: "Tidal Wave Car Wash",
    category: "auto",
    where: "Summerville · Sept",
    spot: "Medium 3×4",
    paid: "$349",
    status: <StatusChip tone="danger">Refund requested</StatusChip>,
    artwork: <StatusChip tone="ok">Received</StatusChip>,
  },
];

export default async function AdminOrdersPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-[21px] font-bold tracking-[-0.02em]">
            Postcard orders: September mailings
          </h1>
          <p className="text-sm text-muted mt-1 num">
            4 orders · $1,546 collected · 2 awaiting artwork
          </p>
        </div>
        <button className="bg-white text-ink border border-line-strong font-semibold text-[13px] px-4 py-2 rounded-(--radius-btn) hover:border-faint">
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[760px]">
          <thead>
            <tr>
              {["Business", "Zone / mailing", "Spot", "Paid", "Status", "Artwork", ""].map((h) => (
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
            {ORDERS.map((o) => (
              <tr key={o.business} className="hover:bg-surface">
                <td className="px-4 py-3.5 border-b border-line">
                  <b className="font-semibold">{o.business}</b>
                  <small className="block text-muted">{o.category}</small>
                </td>
                <td className="px-4 py-3.5 border-b border-line">{o.where}</td>
                <td className="px-4 py-3.5 border-b border-line">{o.spot}</td>
                <td className="px-4 py-3.5 border-b border-line num">{o.paid}</td>
                <td className="px-4 py-3.5 border-b border-line">{o.status}</td>
                <td className="px-4 py-3.5 border-b border-line">{o.artwork ?? "—"}</td>
                <td className="px-4 py-3.5 border-b border-line">
                  <button className="text-brand-deep font-semibold hover:underline">
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12.5px] text-muted mt-3">
        Sample rows until the staging database connects. Actions write to the
        same order tables the buyer flow uses.
      </p>
    </div>
  );
}
