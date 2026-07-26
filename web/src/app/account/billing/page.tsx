import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPortalContext } from "@/lib/portal";
import { getOrdersForEmail } from "@/lib/orders";
import { Card, StatusChip } from "@/components/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Billing",
  robots: { index: false, follow: false },
};

const money = (cents?: number) =>
  cents === undefined ? "-" : `$${(cents / 100).toLocaleString("en-US")}`;

export default async function AccountBillingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const [{ cards, listings }, orders] = await Promise.all([
    getPortalContext(session),
    getOrdersForEmail(session.email),
  ]);

  const plan = listings[0]?.planType ?? "basic";

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.025em]">Billing</h1>
        <p className="text-sm text-muted mt-1">
          What you have booked, and your listing plan.
        </p>
      </div>

      <Card className="p-6 grid gap-2 mb-5">
        <div className="text-[10.5px] font-bold uppercase tracking-widest text-muted">
          Directory plan
        </div>
        <div className="text-[19px] font-bold capitalize">{plan}</div>
        <p className="text-[13px] text-muted">
          Featured placement comes with a postcard campaign.
        </p>
        <Link
          href="/pricing"
          className="text-[13px] font-semibold text-brand-deep hover:underline"
        >
          See what a Spotlight Postcard costs
        </Link>
      </Card>

      {orders.length > 0 && (
        <>
          <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mb-3">
            Your payments
          </h2>
          <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white mb-6">
            <table className="w-full border-collapse text-[13.5px] min-w-[520px]">
              <thead>
                <tr>
                  {["Reference", "For", "Amount", "Status"].map((h) => (
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
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface">
                    <td className="px-4 py-3.5 border-b border-line num font-semibold">
                      {o.reference}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line text-[12.5px]">
                      {o.zoneSlug} {o.spot}
                      <div className="text-muted">
                        {o.createdAt?.slice(0, 10) ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 border-b border-line num">
                      {money(o.amountCents)}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line">
                      {o.status === "paid" ? (
                        <StatusChip tone="ok">Paid</StatusChip>
                      ) : o.status === "refunded" ? (
                        <StatusChip tone="info">Refunded</StatusChip>
                      ) : (
                        <StatusChip tone="warn">Pending</StatusChip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mb-3">
        Card bookings
      </h2>
      {cards.length === 0 ? (
        <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-6">
          Nothing booked yet.
        </p>
      ) : (
        <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
          <table className="w-full border-collapse text-[13.5px] min-w-[560px]">
            <thead>
              <tr>
                {["Card", "Mails", "Spot", "Amount", "Payment"].map((h) => (
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
              {cards.map((c) => (
                <tr key={c.cardId} className="hover:bg-surface">
                  <td className="px-4 py-3.5 border-b border-line font-semibold">
                    {c.zoneName}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line">
                    {c.mailMonth}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line text-muted">
                    {c.adSize}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line num font-semibold">
                    {money(c.amountCents)}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line">
                    {c.paymentStatus === "paid" ? (
                      <StatusChip tone="ok">Paid</StatusChip>
                    ) : c.paymentStatus === "partial" ? (
                      <StatusChip tone="warn">Part paid</StatusChip>
                    ) : (
                      <StatusChip tone="info">
                        {c.paymentStatus ?? "On file"}
                      </StatusChip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[12.5px] text-muted mt-4">
        Card receipts and saved payment methods arrive with the new checkout.
        For a copy of any invoice today,{" "}
        <Link href="/contact" className="text-brand-deep font-semibold hover:underline">
          just ask
        </Link>
        .
      </p>
    </>
  );
}
