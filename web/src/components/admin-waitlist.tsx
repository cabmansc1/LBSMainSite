"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/sections";
import type { WaitlistEntry } from "@/lib/waitlist";

/**
 * The waitlist, as a work queue rather than a report.
 *
 * Everyone on this list was told they would hear from us when their
 * category opened. That is a promise with no automation behind it yet,
 * so the only thing that keeps it is somebody working the list. Marking
 * a row notified is what turns it from a growing pile into a queue that
 * can reach empty.
 */
export function AdminWaitlist({
  entries,
  zoneNames,
}: {
  entries: WaitlistEntry[];
  zoneNames: Record<string, string>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  async function act(
    ids: number[],
    action: "notified" | "waiting" | "delete",
    confirmLabel?: string,
  ) {
    if (confirmLabel && !confirm(confirmLabel)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      const j = await res.json().catch(() => ({}));
      // An expired session redirects to the login page, which fetch
      // follows and which answers 200 with HTML. res.ok alone would read
      // that as success.
      if (!res.ok || j.ok !== true) {
        throw new Error(j.error ?? "That did not work. Try signing in again.");
      }
      setSelected([]);
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-8 text-center">
        Nobody is waiting on a category yet.
      </p>
    );
  }

  const waiting = entries.filter((e) => !e.notifiedAt);

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <span className="text-[12.5px] text-muted num">
          {waiting.length} waiting, {entries.length} total
        </span>
        {selected.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[12.5px] text-muted num">
              {selected.length} selected
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => act(selected, "notified")}
              className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[8px] border border-line-strong disabled:opacity-40"
            >
              Mark notified
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => act(selected, "waiting")}
              className="text-[12.5px] font-semibold text-muted hover:text-ink disabled:opacity-40"
            >
              Mark waiting
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                act(
                  selected,
                  "delete",
                  `Delete ${selected.length} waitlist ${
                    selected.length === 1 ? "entry" : "entries"
                  }? This cannot be undone.`,
                )
              }
              className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[8px] border border-line-strong text-danger disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-[13px] text-danger mb-2">{error}</p>}

      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[820px]">
          <thead>
            <tr>
              <th className="w-10 px-4 py-3 border-b border-line bg-surface">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={selected.length === entries.length}
                  onChange={(e) =>
                    setSelected(e.target.checked ? entries.map((x) => x.id) : [])
                  }
                />
              </th>
              {["Business", "Waiting for", "Neighborhood", "Asked", "Status", ""].map(
                (h, i) => (
                  <th
                    key={h || `blank-${i}`}
                    className={`text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface ${
                      i === 5 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.id}
                className={`hover:bg-surface align-top ${
                  e.notifiedAt ? "text-muted" : ""
                }`}
              >
                <td className="px-4 py-3.5 border-b border-line">
                  <input
                    type="checkbox"
                    aria-label={`Select ${e.email}`}
                    checked={selected.includes(e.id)}
                    onChange={() => toggle(e.id)}
                  />
                </td>
                <td className="px-4 py-3.5 border-b border-line">
                  <span className="font-semibold">
                    {e.businessName || "Not given"}
                  </span>
                  <div className="text-[12px]">
                    <a
                      href={`mailto:${e.email}`}
                      className="text-brand-deep hover:underline"
                    >
                      {e.email}
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px]">
                  {e.category}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px]">
                  {zoneNames[e.zoneSlug] ?? e.zoneSlug}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px] num">
                  {e.createdAt?.slice(0, 10) ?? ""}
                </td>
                <td className="px-4 py-3.5 border-b border-line">
                  {e.notifiedAt ? (
                    <StatusChip tone="ok">Notified</StatusChip>
                  ) : (
                    <StatusChip tone="warn">Waiting</StatusChip>
                  )}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      act([e.id], e.notifiedAt ? "waiting" : "notified")
                    }
                    className="text-[12.5px] font-semibold text-brand-deep hover:underline disabled:opacity-40"
                  >
                    {e.notifiedAt ? "Undo" : "Mark notified"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
