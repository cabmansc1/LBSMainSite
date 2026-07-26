"use client";

import { useState } from "react";

type Row = Record<string, unknown>;

const val = (r: Row, ...keys: string[]) => {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "";
};

export function AdminSignups({ rows }: { rows: Row[] }) {
  const [list, setList] = useState(rows);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function setStatus(id: number, status: string) {
    setBusy(id);
    setMessage("");
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "signup-status", id, status }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      setList((l) =>
        l.map((r) => (Number(r.id) === id ? { ...r, status } : r)),
      );
      setMessage(`Marked ${status}`);
    } catch (e) {
      setMessage(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  if (list.length === 0) {
    return (
      <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-8 text-center">
        No directory signups yet.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[820px]">
          <thead>
            <tr>
              {["Business", "Contact", "Category / area", "Received", "Status", ""].map(
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
            {list.map((r) => {
              const id = Number(r.id);
              const status = val(r, "status") || "pending";
              return (
                <tr key={id} className="hover:bg-surface align-top">
                  <td className="px-4 py-3.5 border-b border-line font-semibold">
                    {val(r, "business_name", "name") || "(no name)"}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line text-[12.5px]">
                    {val(r, "email")}
                    <div className="text-muted">{val(r, "phone")}</div>
                  </td>
                  <td className="px-4 py-3.5 border-b border-line text-[12.5px] text-muted">
                    {val(r, "category")}
                    <div>{val(r, "location_area", "city")}</div>
                  </td>
                  <td className="px-4 py-3.5 border-b border-line text-[12.5px] text-muted">
                    {val(r, "created_at", "submitted_at").slice(0, 16)}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border ${
                        status === "approved"
                          ? "bg-[#e5f5ec] border-[#bfe8d2] text-ok"
                          : status === "rejected"
                            ? "bg-[#fde8e8] border-[#f5c2c2] text-[#a33]"
                            : "bg-cta-tint border-[#f3ddbb] text-[#a05e00]"
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 border-b border-line whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setStatus(id, "approved")}
                      disabled={busy === id || status === "approved"}
                      className="text-[13px] font-semibold text-brand-deep hover:underline disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(id, "rejected")}
                      disabled={busy === id || status === "rejected"}
                      className="text-[13px] font-semibold text-muted hover:text-[#a33] ml-3 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {message && (
        <p className="text-[13px] font-semibold text-body mt-3">{message}</p>
      )}
    </>
  );
}
