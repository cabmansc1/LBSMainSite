"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROOF_STATUS_LABEL, type Proof } from "@/lib/proofs-types";

/**
 * Sending an advertiser their proof, and seeing what came back.
 *
 * The row this sits on already knows the advertiser and the card, so
 * neither is typed. Getting either wrong sends somebody else's
 * advertisement to the wrong business.
 *
 * Notify is a checkbox rather than automatic, on by default because
 * sending is the usual reason to upload one. Off is for filing the copy
 * you have already emailed by hand, which is most of the backlog the
 * first time this is used.
 */

export type ProofTarget = {
  email: string;
  cardId: string;
  businessName: string;
  cardLabel: string;
  /** Mission Control's own artwork state, for comparison only. */
  mcStatus?: string;
  proof?: Proof;
};

const TONE: Record<string, string> = {
  sent: "bg-cta-tint text-[#7a4a00]",
  approved: "bg-ok text-white",
  changes: "bg-danger/10 text-danger",
};

export function AdminProofRow({ target }: { target: ProofTarget }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const proof = target.proof;

  // Mission Control is not written to, by design, so the two can drift.
  // Saying so is the whole point: an approval recorded there and not
  // here is the cue to record it here.
  const mcApproved = (target.mcStatus ?? "").toLowerCase() === "approved";
  const disagree = mcApproved && proof?.status !== "approved";

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("email", target.email);
      body.append("cardId", target.cardId);
      body.append("file", file);
      body.append("note", note);
      body.append("notify", notify ? "1" : "0");
      const res = await fetch("/api/admin/proof", { method: "POST", body });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not upload.");
      setFile(null);
      setNote("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <b className="text-[14px]">{target.businessName || target.email}</b>
          <div className="text-[12.5px] text-muted">
            {target.cardLabel}
            {target.email ? ` · ${target.email}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {proof ? (
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                TONE[proof.status] ?? "bg-surface text-body"
              }`}
            >
              v{proof.version} · {PROOF_STATUS_LABEL[proof.status]}
            </span>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-surface text-muted">
              No proof sent
            </span>
          )}
          {proof && (
            <a
              href={`/api/proof/${proof.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-[12.5px] font-semibold text-brand-deep hover:underline"
            >
              View
            </a>
          )}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[8px] border border-line-strong hover:bg-surface"
          >
            {open ? "Close" : proof ? "New version" : "Send a proof"}
          </button>
        </div>
      </div>

      {proof?.response && (
        <p className="text-[12.5px] text-body border-t border-line pt-2">
          <b>They said:</b> {proof.response}
        </p>
      )}

      {disagree && (
        <p className="text-[12.5px] text-[#7a4a00] bg-cta-tint border border-[#f3ddbb] rounded-lg px-3 py-2">
          Mission Control says this artwork is approved, and nothing here
          records that. If they approved it outside the site, send the proof
          and mark it approved here so both agree.
        </p>
      )}

      {open && (
        <div className="border-t border-line pt-3 grid gap-2.5">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-[13px] file:mr-3 file:px-3 file:py-1.5 file:rounded-[8px] file:border file:border-line-strong file:bg-white file:text-[12.5px] file:font-semibold file:cursor-pointer"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything to say with it. Goes in the email if you send one."
            className="w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
          />
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
            />
            Email them that it is ready
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={upload}
              disabled={!file || busy}
              className="bg-cta text-navy-950 text-[13.5px] font-bold px-4 py-2 rounded-(--radius-btn) hover:bg-[#FFA033] disabled:opacity-50"
            >
              {busy ? "Uploading..." : notify ? "Send proof" : "File proof"}
            </button>
            {error && (
              <span className="text-[12.5px] font-semibold text-danger">
                {error}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
