"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Artwork } from "@/lib/artwork";
import { SITE_TZ } from "@/lib/time";

/**
 * Sending artwork for a card.
 *
 * This replaced a mailto: link. A paying customer with a deadline was
 * being handed an email client and no confirmation that anything had
 * arrived, which is why "did you get my file?" was a support question at
 * all.
 *
 * Uploading again adds a version rather than replacing one, so the list
 * grows downward and the newest is on top. Someone who sends a corrected
 * file at midnight should not be able to destroy the one we were about
 * to print.
 */
const size = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

const when = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T"));
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: SITE_TZ,
      });
};

export function ArtworkUpload({
  cardId,
  existing,
  maxBytes,
}: {
  cardId: string;
  existing: Artwork[];
  /** The real limit, which depends on what MySQL will accept, not a
   *  number typed into the copy and left to go stale. */
  maxBytes: number;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(existing.length === 0);

  async function send() {
    const file = input.current?.files?.[0];
    if (!file) {
      setErr("Choose a file first.");
      return;
    }
    setBusy(true);
    setErr("");
    setDone(false);
    try {
      const body = new FormData();
      body.set("cardId", cardId);
      body.set("file", file);
      if (note.trim()) body.set("note", note.trim());
      const res = await fetch("/api/account/artwork", { method: "POST", body });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok !== true) {
        throw new Error(j.error ?? "That upload did not go through.");
      }
      setDone(true);
      setNote("");
      if (input.current) input.current.value = "";
      // The server component above renders the file list, so it has to
      // re-run for the new upload to appear.
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That upload did not go through.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Taking back a file sent by mistake.
   *
   * Confirmed by name: the rows are the same shape and often the same
   * logo twice, so the wrong one is one careless click away, and there is
   * no undo.
   */
  async function remove(id: number, filename: string) {
    if (!window.confirm(`Remove ${filename}? We will no longer have it.`)) {
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/account/artwork?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not remove.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-line pt-3.5 grid gap-3">
      {existing.length > 0 && (
        <div className="grid gap-1.5">
          <div className="text-[10.5px] font-bold uppercase tracking-widest text-muted">
            Artwork we have
          </div>
          {existing.map((a, i) => (
            <div
              key={a.id}
              className="flex items-baseline gap-2.5 flex-wrap text-[13px]"
            >
              <a
                href={`/api/account/artwork/${a.id}`}
                className="font-semibold text-brand-deep hover:underline break-all"
              >
                {a.filename}
              </a>
              <span className="text-[12px] text-muted num">
                {size(a.bytes)}
                {when(a.createdAt) ? ` · ${when(a.createdAt)}` : ""}
              </span>
              {i === 0 && (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ok">
                  Latest
                </span>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(a.id, a.filename)}
                className="ml-auto text-[12px] font-semibold text-danger hover:underline disabled:opacity-40"
              >
                Remove
              </button>
              {a.note && (
                <span className="text-[12px] text-muted basis-full">{a.note}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {!open ? (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[13px] text-muted">
            Need to send a corrected file?
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[13px] font-semibold text-brand-deep hover:underline ml-auto"
          >
            Upload another
          </button>
        </div>
      ) : (
        <div className="grid gap-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[13px] text-muted">
              Send your own artwork, or leave it and we design it free.
            </span>
          </div>
          <input
            ref={input}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.webp,.ai,.eps,.zip"
            className="text-[13px] file:mr-3 file:text-[13px] file:font-semibold file:px-3.5 file:py-2 file:rounded-(--radius-btn) file:border-0 file:bg-navy-950 file:text-white hover:file:bg-navy-800"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything we should know about this file (optional)"
            className="w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="text-[13.5px] font-semibold px-4 py-2.5 rounded-(--radius-btn) bg-cta text-navy-950 hover:bg-cta-hover hover:text-white transition-colors disabled:opacity-60"
            >
              {busy ? "Sending..." : "Send artwork"}
            </button>
            <span className="text-[12px] text-muted">
              PDF, JPG, PNG, TIFF, AI, EPS or a zip, up to{" "}
              {Math.floor(maxBytes / 1024 / 1024)}MB. Print ready at 300 dpi if
              you have it.
            </span>
          </div>
          {err && <p className="text-[12.5px] text-[#b42318]">{err}</p>}
          {done && (
            <p className="text-[12.5px] text-ok">
              Got it. We will be in touch if anything about the file needs
              changing.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
