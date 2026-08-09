"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Builds this fortnight's draft by hand.
 *
 * The schedule normally does this on the 1st and the 15th. The button is
 * for the first one, for a fortnight the scheduler missed, and for
 * having a look at what an issue would say right now. It cannot make a
 * duplicate: a draft already built for this fortnight is opened rather
 * than replaced.
 */
export function AdminNewsletterBuild() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function build() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "build" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Could not build the draft.");
      router.push(`/admin/newsletter/${j.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the draft.");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2 justify-items-start">
      <button
        type="button"
        disabled={busy}
        onClick={() => void build()}
        className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-navy-950 text-white disabled:opacity-50"
      >
        {busy ? "Building" : "Build this fortnight's draft"}
      </button>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
