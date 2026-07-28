"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/sections";
import type { Order } from "@/lib/orders";

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

function chip(status: string) {
  if (status === "paid") return <StatusChip tone="ok">Paid</StatusChip>;
  if (status === "pending") return <StatusChip tone="warn">Pending</StatusChip>;
  if (status === "refunded") return <StatusChip tone="info">Refunded</StatusChip>;
  if (status === "cancelled") return <StatusChip tone="info">Cancelled</StatusChip>;
  return <StatusChip tone="info">{status}</StatusChip>;
}

/**
 * Spotlight Postcard orders, with the ability to remove them.
 *
 * Deleting an order is not something a real business does often: the
 * row is the record that somebody paid. It exists because the table
 * fills with test purchases during a build, and a page full of fake
 * orders makes the real ones harder to see and the totals meaningless.
 *
 * Deleting does not refund. Stripe holds the money and the webhook is
 * what reflects a refund back here, so the confirmation says the amount
 * out loud rather than letting someone bin a live payment by reflex.
 */
export function AdminPostcardOrders({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const chosen = orders.filter((o) => selected.includes(o.id));
  const liveMoney = chosen
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.amountCents, 0);

  async function remove(ids: number[], label: string) {
    const paid = orders.filter((o) => ids.includes(o.id) && o.status === "paid");
    const warning = paid.length
      ? `\n\n${paid.length} of these are marked PAID (${money(
          paid.reduce((s, o) => s + o.amountCents, 0),
        )}). Deleting does not refund anything in Stripe.`
      : "";
    if (!confirm(`Delete ${label}? This cannot be undone.${warning}`)) return;

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const j = await res.json().catch(() => ({}));
      // An expired session sends the request to /admin/login, which fetch
      // follows and which answers 200 with HTML. Checking res.ok alone
      // would read that as a successful delete and refresh onto a page
      // where nothing had been removed.
      if (!res.ok || j.ok !== true) {
        throw new Error(j.error ?? "Could not delete those. Try signing in again.");
      }
      setSelected([]);
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  if (orders.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted">
          Spotlight Postcard orders
        </h2>
        <span className="text-[12.5px] text-muted num">{orders.length}</span>
        {selected.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[12.5px] text-muted num">
              {selected.length} selected
              {liveMoney > 0 ? ` · ${money(liveMoney)} paid` : ""}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                remove(selected, `${selected.length} order${selected.length === 1 ? "" : "s"}`)
              }
              className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[8px] border border-line-strong text-danger disabled:opacity-40"
            >
              {busy ? "Deleting..." : "Delete selected"}
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-[13px] text-danger mb-2">{error}</p>}

      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white mb-8">
        <table className="w-full border-collapse text-[13.5px] min-w-[860px]">
          <thead>
            <tr>
              <th className="w-10 px-4 py-3 border-b border-line bg-surface">
                <input
                  type="checkbox"
                  aria-label="Select all orders"
                  checked={selected.length === orders.length && orders.length > 0}
                  onChange={(e) =>
                    setSelected(e.target.checked ? orders.map((o) => o.id) : [])
                  }
                />
              </th>
              {["Reference", "Business", "Zone", "Spot", "Amount", "Status", ""].map(
                (h, i) => (
                  <th
                    key={h || `blank-${i}`}
                    className={`text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface ${
                      i === 6 ? "text-right" : "text-left"
                    }`}
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
                  <input
                    type="checkbox"
                    aria-label={`Select ${o.reference}`}
                    checked={selected.includes(o.id)}
                    onChange={() => toggle(o.id)}
                  />
                </td>
                <td className="px-4 py-3.5 border-b border-line">
                  <b className="num">{o.reference}</b>
                  <div className="text-[12px] text-muted">
                    {o.createdAt?.slice(0, 10) ?? ""}
                  </div>
                </td>
                <td className="px-4 py-3.5 border-b border-line">
                  {o.businessName}
                  <div className="text-[12px] text-muted">{o.email}</div>
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px]">
                  {o.zoneSlug}
                  {o.category && <div className="text-muted">{o.category}</div>}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px]">
                  {o.spot} {o.reach}
                </td>
                <td className="px-4 py-3.5 border-b border-line num font-semibold">
                  {money(o.amountCents)}
                </td>
                <td className="px-4 py-3.5 border-b border-line">{chip(o.status)}</td>
                <td className="px-4 py-3.5 border-b border-line text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove([o.id], o.reference)}
                    className="text-[12.5px] font-semibold text-muted hover:text-danger disabled:opacity-40"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
