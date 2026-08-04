"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "I have dealt with this" on an advertiser's own message.
 *
 * The same flag the admin sets, so a business answering a customer
 * clears it from the to-do list without anybody here doing anything.
 * That was the missing piece: the to-do could not exist while nothing
 * could ever mark an inquiry finished.
 */
export function InquiryHandledToggle({
  id,
  handled,
}: {
  id: number;
  handled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function set(next: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/inquiry", {
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
    <span className="flex items-center gap-3 flex-wrap">
      {handled ? (
        <>
          <span className="text-[11.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-ok text-white">
            Replied
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => set(false)}
            className="text-[12.5px] font-semibold text-muted hover:text-navy-950 disabled:opacity-40"
          >
            Not yet
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => set(true)}
          className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[8px] border border-line-strong hover:bg-surface disabled:opacity-40"
        >
          {busy ? "Saving..." : "Mark replied"}
        </button>
      )}
      {error && <span className="text-[12.5px] text-danger">{error}</span>}
    </span>
  );
}
