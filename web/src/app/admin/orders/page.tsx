import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAdminOrders } from "@/lib/admin-data";
import { StatusChip } from "@/components/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

function statusChip(status: string) {
  if (status === "paid") return <StatusChip tone="ok">Paid</StatusChip>;
  if (status === "pending") return <StatusChip tone="warn">Pending</StatusChip>;
  if (status === "refund_requested")
    return <StatusChip tone="warn">Refund asked</StatusChip>;
  if (status === "refunded") return <StatusChip tone="info">Refunded</StatusChip>;
  if (status === "cancelled") return <StatusChip tone="info">Cancelled</StatusChip>;
  return <StatusChip tone="info">{status}</StatusChip>;
}

/** Successor to admin/card_orders.php, reading the same joined tables. */
export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await getAdminOrders();

  const paid = orders.filter((o) => o.status === "paid");
  const revenue = paid.reduce((sum, o) => sum + o.amountCents, 0);
  const needsAction = orders.filter(
    (o) => o.status === "refund_requested" || (o.status === "paid" && !o.hasArtwork),
  ).length;

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Orders</h1>
        <p className="text-sm text-muted mt-1">
          Neighborhood card orders, the same records the legacy admin shows.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3.5 mb-5">
        <div className="border border-line rounded-(--radius-card) bg-white p-5">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Paid orders
          </div>
          <div className="text-[24px] font-bold tracking-tight num mt-1">
            {paid.length}
          </div>
        </div>
        <div className="border border-line rounded-(--radius-card) bg-white p-5">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Collected
          </div>
          <div className="text-[24px] font-bold tracking-tight num mt-1">
            {money(revenue)}
          </div>
        </div>
        <div className="border border-line rounded-(--radius-card) bg-white p-5">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Needs attention
          </div>
          <div className="text-[24px] font-bold tracking-tight num mt-1">
            {needsAction}
          </div>
          <div className="text-[12px] text-muted mt-0.5">
            Refund requests and missing artwork
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-8 text-center">
          No orders yet.
        </p>
      ) : (
        <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
          <table className="w-full border-collapse text-[13.5px] min-w-[900px]">
            <thead>
              <tr>
                {["Order", "Customer", "Card", "Spot", "Amount", "Artwork", "Status"].map(
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
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-surface align-top">
                  <td className="px-4 py-3.5 border-b border-line">
                    <b className="num">#{o.id}</b>
                    <div className="text-[12px] text-muted">
                      {o.createdAt?.slice(0, 10) ?? ""}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 border-b border-line">
                    {o.customer || "-"}
                    <div className="text-[12px] text-muted">{o.email}</div>
                  </td>
                  <td className="px-4 py-3.5 border-b border-line">
                    {o.cardName}
                    {o.printDeadline && (
                      <div className="text-[12px] text-muted">
                        Print {o.printDeadline.slice(0, 10)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line text-[12.5px]">
                    {o.spotName}
                    {o.categoryName && (
                      <div className="text-muted">{o.categoryName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line num font-semibold">
                    {money(o.amountCents)}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line">
                    {!o.hasArtwork ? (
                      <StatusChip tone="warn">Missing</StatusChip>
                    ) : o.adminApproved ? (
                      <StatusChip tone="ok">Approved</StatusChip>
                    ) : (
                      <StatusChip tone="info">To review</StatusChip>
                    )}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line">
                    {statusChip(o.status)}
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
