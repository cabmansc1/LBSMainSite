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
  ignored: number;
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
  const [running, setRunning] = useState("");

  /**
   * One request per feed, not one request for all of them.
   *
   * Doing the lot in a single call meant a run of three fetches — one
   * of which takes the better part of ten seconds — plus a few hundred
   * sequential writes, all inside one HTTP request. Whatever sits in
   * front of the app cut it off partway, and since the feeds ran in
   * order the result was the first one landing and the rest silently
   * not. Splitting it bounds each request to a single feed, and means
   * a slow or broken source can no longer take the others with it.
   *
   * It also reports as it goes, which is the difference between
   * watching something work and waiting to find out.
   */
  async function run() {
    setBusy(true);
    setError("");
    setReports([]);
    for (const s of sources) {
      setRunning(s.label);
      try {
        const res = await fetch("/api/admin/events/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sources: [s.key] }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "That did not run.");
        setReports((cur) => [...(cur ?? []), ...(j.reports ?? [])]);
      } catch (e) {
        // Reported in the list rather than thrown away, so a feed that
        // fails is visible beside the ones that worked.
        setReports((cur) => [
          ...(cur ?? []),
          {
            source: s.key,
            label: s.label,
            found: 0,
            added: 0,
            updated: 0,
            skipped: 0,
            ignored: 0,
            error: e instanceof Error ? e.message : "That did not run.",
          },
        ]);
      }
    }
    setRunning("");
    setBusy(false);
    router.refresh();
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

      {running && (
        <p className="mt-3 text-[12.5px] text-muted">Reading {running}…</p>
      )}

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
                  {r.added} new · {r.updated} refreshed · {r.skipped} left alone
                  {r.ignored > 0 && ` · ${r.ignored} council business ignored`}
                  {r.found === 0 && r.ignored === 0 && " · nothing upcoming"}
                </span>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
