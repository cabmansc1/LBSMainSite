"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Report = {
  source: string;
  label: string;
  found: number;
  added: number;
  updated: number;
  skipped: number;
  error?: string;
};

/**
 * Fetching the town calendars, on demand.
 *
 * The result is reported per feed rather than as one number, because
 * "nothing came in" and "that feed is down" are different problems and
 * a single total hides the second one behind the first.
 */
export function EventImportButton({
  sources,
}: {
  sources: { key: string; label: string; hint: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    setReports(null);
    try {
      const res = await fetch("/api/admin/events/import", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not run.");
      setReports(j.reports ?? []);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not run.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-line rounded-(--radius-card) bg-white p-5 mb-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-[58ch]">
          <b className="text-[14.5px]">Pull in the town calendars</b>
          <p className="text-[13px] text-muted mt-1">
            Reads the feeds these towns publish and files whatever is coming up
            as pending. Nothing goes on the site until you approve it, and
            anything you have already published or turned down is left alone.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-line-strong bg-white disabled:opacity-50"
        >
          {busy ? "Reading" : "Fetch now"}
        </button>
      </div>

      <ul className="mt-3 grid gap-1">
        {sources.map((s) => (
          <li key={s.key} className="text-[12.5px] text-muted">
            <b className="text-ink font-semibold">{s.label}</b> — {s.hint}
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-3 text-[13px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-3.5 py-2">
          {error}
        </p>
      )}

      {reports && (
        <div className="mt-3 grid gap-1.5">
          {reports.map((r) => (
            <p key={r.source} className="text-[12.5px]">
              <b>{r.label}:</b>{" "}
              {r.error ? (
                <span className="text-danger">{r.error}</span>
              ) : (
                <span className="text-muted num">
                  {r.found} upcoming · {r.added} new · {r.updated} refreshed ·{" "}
                  {r.skipped} left alone
                </span>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
