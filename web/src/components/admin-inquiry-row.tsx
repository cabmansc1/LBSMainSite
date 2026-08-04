"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InquiryState } from "@/lib/inquiries";

/**
 * The controls on one inquiry.
 *
 * Only this part is interactive, so the list itself stays a server
 * component and a page of a hundred messages does not ship a hundred
 * copies of React state to render text that never changes.
 *
 * Handled is deliberately reversible. Somebody marking the wrong row and
 * having no way back is how a list stops being trusted, and an inquiry
 * that has been wrongly buried is a customer who never hears from us.
 */
export function AdminInquiryControls({
  id,
  state,
}: {
  id: number;
  state?: InquiryState;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const handled = state?.status === "handled";

  async function set(next: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, handled: next }),
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap border-t border-line pt-2.5">
      {handled ? (
        <>
          <span className="text-[11.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-ok text-white">
            Handled
          </span>
          <span className="text-[12.5px] text-muted">
            {state?.handledBy ? `by ${state.handledBy}` : ""}
            {state?.handledAt ? ` · ${state.handledAt.slice(0, 16)}` : ""}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => set(false)}
            className="ml-auto text-[12.5px] font-semibold text-muted hover:text-navy-950 disabled:opacity-40"
          >
            Reopen
          </button>
        </>
      ) : (
        <>
          <span className="text-[11.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cta-tint text-[#7a4a00]">
            Open
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => set(true)}
            className="ml-auto text-[12.5px] font-semibold px-3 py-1.5 rounded-[8px] border border-line-strong hover:bg-surface disabled:opacity-40"
          >
            {busy ? "Saving..." : "Mark handled"}
          </button>
        </>
      )}
      {error && <span className="text-[12.5px] text-danger">{error}</span>}
    </div>
  );
}
