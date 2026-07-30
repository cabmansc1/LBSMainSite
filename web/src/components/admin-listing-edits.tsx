"use client";

import { useState } from "react";
import Link from "next/link";
import type { PendingEditForReview } from "@/lib/listing-edits";

/**
 * Changes advertisers asked for, one row per field.
 *
 * Per field rather than per submission because that is how they were
 * queued: someone correcting their category should not have to wait on
 * a decision about their name, and a rejected name should not drag an
 * accepted category down with it.
 */
export function AdminListingEdits({ rows }: { rows: PendingEditForReview[] }) {
  const [list, setList] = useState(rows);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function decide(id: number, decision: "approve" | "reject") {
    setBusy(id);
    setMessage("");
    try {
      const res = await fetch("/api/admin/listing-edits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That could not be saved.");
      setList((l) => l.filter((r) => r.id !== id));
      setMessage(decision === "approve" ? "Approved and live." : "Rejected.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (list.length === 0) {
    return (
      <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-8 text-center">
        Nothing waiting. Advertisers edit their own phone, description,
        website, hours and social links without us.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[860px]">
          <thead>
            <tr>
              {["Business", "Field", "Now", "Asked for", "Requested", ""].map((h) => (
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
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-surface align-top">
                <td className="px-4 py-3.5 border-b border-line font-semibold">
                  {r.slug ? (
                    <Link
                      href={`/business/${r.slug}`}
                      className="text-brand-deep hover:underline"
                    >
                      {r.businessName || "(no name)"}
                    </Link>
                  ) : (
                    r.businessName || "(no name)"
                  )}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px] text-muted">
                  {r.label}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px] text-muted max-w-[220px] break-words">
                  {r.oldValue || <span className="text-faint">(empty)</span>}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px] font-semibold max-w-[220px] break-words">
                  {r.newValue || <span className="text-faint">(empty)</span>}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px] text-muted">
                  {r.requestedBy}
                  <div>{r.createdAt?.slice(0, 16)}</div>
                </td>
                <td className="px-4 py-3.5 border-b border-line whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => decide(r.id, "approve")}
                    disabled={busy === r.id}
                    className="text-[13px] font-semibold text-brand-deep hover:underline disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(r.id, "reject")}
                    disabled={busy === r.id}
                    className="text-[13px] font-semibold text-muted hover:text-[#a33] ml-3 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message && (
        <p className="text-[13px] font-semibold text-body mt-3">{message}</p>
      )}
    </>
  );
}
