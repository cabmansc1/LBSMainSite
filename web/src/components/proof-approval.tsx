"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The advertiser saying yes, or saying what is wrong.
 *
 * Approving is one click and asking for changes is not, on purpose. A
 * change needs to say what to change, or it costs the phone call this
 * whole thing exists to save. Approving needs nothing, because a proof
 * that is right needs no explanation.
 *
 * The proof opens in a new tab rather than being embedded. It is a print
 * PDF, browsers disagree about how to show one inline, and an approval
 * given without seeing it clearly is worse than no approval.
 */
export function ProofApproval({
  id,
  version,
  status,
  note,
  response,
}: {
  id: number;
  version: number;
  status: "sent" | "approved" | "changes";
  note?: string;
  response?: string;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function respond(next: "approved" | "changes") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next, response: text }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      setAsking(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <b className="text-[15px]">Your ad proof</b>
          <div className="text-[12.5px] text-muted">
            Version {version}
            {status === "approved" && " · approved"}
            {status === "changes" && " · changes asked for"}
          </div>
        </div>
        <a
          href={`/api/proof/${id}`}
          target="_blank"
          rel="noreferrer"
          className="text-[13px] font-semibold px-4 py-2 rounded-(--radius-btn) border border-line-strong hover:bg-surface"
        >
          Open the proof
        </a>
      </div>

      {note && <p className="text-[13.5px] text-body">{note}</p>}

      {status === "sent" && !asking && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            disabled={busy}
            onClick={() => respond("approved")}
            className="bg-cta text-navy-950 text-[14px] font-bold px-5 py-2.5 rounded-(--radius-btn) hover:bg-[#FFA033] disabled:opacity-50"
          >
            {busy ? "Saving..." : "Approve it"}
          </button>
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="text-[13px] font-semibold text-brand-deep hover:underline"
          >
            Ask for a change
          </button>
          <span className="text-[12.5px] text-muted">
            Approving is what lets it go to print.
          </span>
        </div>
      )}

      {status === "sent" && asking && (
        <div className="grid gap-2.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            autoFocus
            placeholder="What needs changing? The more exact, the fewer rounds this takes."
            className="w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              disabled={busy || text.trim().length < 3}
              onClick={() => respond("changes")}
              className="bg-navy-950 text-white text-[13.5px] font-bold px-4 py-2 rounded-(--radius-btn) hover:bg-navy-800 disabled:opacity-40"
            >
              {busy ? "Sending..." : "Send the change"}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="text-[13px] font-semibold text-muted hover:text-navy-950"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status !== "sent" && response && (
        <p className="text-[13px] text-body border-t border-line pt-2.5">
          <b>You said:</b> {response}
        </p>
      )}

      {status === "changes" && (
        <p className="text-[12.5px] text-muted">
          We are on it. You will get the next version here.
        </p>
      )}

      {error && (
        <p className="text-[13px] font-semibold text-danger">{error}</p>
      )}
    </div>
  );
}
