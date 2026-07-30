"use client";

import { Fragment, useState } from "react";
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
  // Rejecting is two steps, approving is one. The asymmetry is the
  // point: approving needs no explanation, and rejecting without one
  // leaves the advertiser guessing.
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  async function decide(id: number, decision: "approve" | "reject") {
    setBusy(id);
    setMessage("");
    try {
      const res = await fetch("/api/admin/listing-edits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          decision,
          ...(decision === "reject" ? { reason } : {}),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That could not be saved.");
      setList((l) => l.filter((r) => r.id !== id));
      setRejecting(null);
      setReason("");
      setMessage(
        decision === "approve"
          ? "Approved and live. They have been emailed."
          : reason.trim()
            ? "Rejected. They have been emailed your reason."
            : "Rejected. They have been emailed and asked to get in touch.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const startReject = (id: number) => {
    setRejecting(id);
    setReason("");
    setMessage("");
  };

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
              <Fragment key={r.id}>
              <tr className="hover:bg-surface align-top">
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
                    onClick={() => startReject(r.id)}
                    disabled={busy === r.id || rejecting === r.id}
                    className="text-[13px] font-semibold text-muted hover:text-[#a33] ml-3 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </td>
              </tr>

              {rejecting === r.id && (
                <tr className="bg-surface">
                  <td colSpan={6} className="px-4 py-4 border-b border-line">
                    <label
                      htmlFor={`reason-${r.id}`}
                      className="text-[12.5px] font-semibold text-body block mb-1.5"
                    >
                      Why not? This is emailed to {r.requestedBy}.
                    </label>
                    <textarea
                      id={`reason-${r.id}`}
                      rows={2}
                      autoFocus
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={500}
                      placeholder="Plumbing is taken on the October card. Staying in HVAC keeps your exclusivity."
                      className="w-full max-w-[560px] text-[13.5px] px-3 py-2 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950"
                    />
                    <p className="text-[12px] text-muted mt-1.5 max-w-[560px]">
                      {/* Said here rather than enforced, because a
                          rejection you cannot send without writing an
                          essay is one that sits in the queue instead. */}
                      Optional. Without it they are told their listing is
                      unchanged and asked to get in touch, and we do not guess
                      at a reason on your behalf.
                    </p>
                    <div className="flex items-center gap-3 mt-2.5">
                      <button
                        type="button"
                        onClick={() => decide(r.id, "reject")}
                        disabled={busy === r.id}
                        className="text-[13px] font-semibold px-3.5 py-2 rounded-(--radius-btn) bg-navy-950 text-white hover:bg-navy-800 disabled:opacity-60"
                      >
                        {busy === r.id ? "Sending..." : "Reject and email"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejecting(null)}
                        disabled={busy === r.id}
                        className="text-[13px] font-semibold text-muted hover:text-navy-950 disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
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
