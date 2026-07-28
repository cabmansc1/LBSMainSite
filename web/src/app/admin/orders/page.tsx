import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAdminOrders } from "@/lib/admin-data";
import { getPostcardOrders } from "@/lib/orders";
import { checkOrderPlacement, type PlacementCheck } from "@/lib/mission-control";
import { StatusChip } from "@/components/sections";
import { AdminPostcardOrders } from "@/components/admin-postcard-orders";

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
  const [orders, postcardOrders] = await Promise.all([
    getAdminOrders(),
    getPostcardOrders(),
  ]);

  const paid = orders.filter((o) => o.status === "paid");
  const revenue = paid.reduce((sum, o) => sum + o.amountCents, 0);
  const needsAction = orders.filter(
    (o) => o.status === "refund_requested" || (o.status === "paid" && !o.hasArtwork),
  ).length;

  // The placement into Mission Control is fire-and-forget and gets
  // exactly one attempt, so a failure leaves a paid customer off their
  // card with nothing but a log line to show for it. Ask the question
  // here instead, where somebody can fix it in seconds.
  //
  // Newest fifty: this is one MC read shared across all of them, but the
  // page should not grow unbounded, and an unplaced order that is months
  // old has either been handled or has bigger problems.
  const paidPostcards = postcardOrders
    .filter((o) => o.status === "paid")
    .slice(0, 50);
  const placements = await Promise.all(
    paidPostcards.map(async (o) => ({
      order: o,
      check: await checkOrderPlacement({
        cardId: o.cardId || undefined,
        zoneSlug: o.zoneSlug,
        businessName: o.businessName,
        email: o.email,
      }).catch(() => ({ state: "unknown" }) as const),
    })),
  );
  // "unknown" means Mission Control was unreachable, which is not the
  // same as an order gone missing and must not be reported as one.
  const unplaced = placements.filter(
    (p): p is { order: (typeof paidPostcards)[number]; check: PlacementCheck & { state: "missing" | "no-card" } } =>
      p.check.state === "missing" || p.check.state === "no-card",
  );
  const mcUnreachable = placements.some((p) => p.check.state === "unknown");

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

      {mcUnreachable && (
        <p className="mb-6 border border-line bg-surface rounded-(--radius-card) px-5 py-3.5 text-[13px] text-body">
          Mission Control did not answer, so orders could not be checked
          against their cards. This says nothing either way about whether
          they landed. Reload once it is back.
        </p>
      )}

      {unplaced.length > 0 && (
        <section className="mb-6 border border-[#f3c9c4] bg-[#fdf3f2] rounded-(--radius-card) p-5">
          <h2 className="text-[15px] font-bold tracking-tight text-[#8a2318]">
            {unplaced.length} paid{" "}
            {unplaced.length === 1 ? "order is" : "orders are"} not on a card
            in Mission Control
          </h2>
          <p className="text-[13px] text-body mt-1.5 max-w-[70ch]">
            These customers paid, and the write into Mission Control did not
            land. Nothing is lost: add them to the card by hand and the site
            picks it up on the next read. Their category is not locked until
            you do, so a competitor could still buy it.
          </p>
          <ul className="mt-3.5 grid gap-2">
            {unplaced.map(({ order: o, check }) => (
              <li
                key={o.reference}
                className="bg-white border border-line rounded-[10px] px-4 py-3 text-[13px] flex flex-wrap gap-x-4 gap-y-1 items-baseline"
              >
                <b className="num">{o.reference}</b>
                <span className="font-semibold">{o.businessName}</span>
                <span className="text-muted">{o.category}</span>
                <span className="text-muted">
                  {o.spot} · {money(o.amountCents)}
                </span>
                <span className="text-muted num">
                  {check.state === "no-card"
                    ? `no card found for ${o.zoneSlug || "unknown zone"}`
                    : `card ${check.cardName ?? check.cardId}`}
                </span>
                {o.email && <span className="text-faint">{o.email}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AdminPostcardOrders orders={postcardOrders} />

      {postcardOrders.length > 0 && (
        <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mb-3">
          Neighborhood card orders
        </h2>
      )}

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
