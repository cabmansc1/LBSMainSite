"use client";

import { useState } from "react";

/**
 * Pick who gets the directory invite, then send.
 *
 * Every eligible advertiser is ticked to start with, because the common
 * case is sending to all of them. The ones who cannot be emailed are
 * shown greyed with the reason instead of being dropped, so the count on
 * the page and the number of businesses you can see always agree.
 */

export type InviteRow = {
  userId: number;
  email: string;
  businessName: string;
  orders: number;
  ok: boolean;
  reason?: string;
};

export function AdminDirectoryInvites({ rows }: { rows: InviteRow[] }) {
  const eligible = rows.filter((r) => r.ok);
  const [picked, setPicked] = useState<Set<number>>(
    () => new Set(eligible.map((r) => r.userId)),
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ sent: number; failed: string[] } | null>(
    null,
  );
  const [err, setErr] = useState("");

  const toggle = (id: number) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function send() {
    setBusy(true);
    setErr("");
    setDone(null);
    try {
      const res = await fetch("/api/admin/directory-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [...picked] }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not send.");
      const results: { email: string; sent: boolean; error?: string }[] =
        j.results ?? [];
      setDone({
        sent: results.filter((r) => r.sent).length,
        failed: results
          .filter((r) => !r.sent)
          .map((r) => `${r.email}: ${r.error ?? "did not send"}`),
      });
      setPicked(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not send.");
    } finally {
      setBusy(false);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="border border-line rounded-(--radius-card) bg-white p-6">
        <p className="text-sm text-body">
          Every advertiser who has bought a spot is already in the directory.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[620px]">
          <thead>
            <tr>
              {["", "Business", "Email", "Spots", "Status"].map((h, i) => (
                <th
                  key={h || i}
                  className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.userId}
                className={r.ok ? "hover:bg-surface" : "text-muted"}
              >
                <td className="px-4 py-3 border-b border-line">
                  <input
                    type="checkbox"
                    disabled={!r.ok || busy}
                    checked={picked.has(r.userId)}
                    onChange={() => toggle(r.userId)}
                    aria-label={`Email ${r.businessName || r.email}`}
                  />
                </td>
                <td className="px-4 py-3 border-b border-line font-semibold">
                  {r.businessName || "(no name on the order)"}
                </td>
                <td className="px-4 py-3 border-b border-line">{r.email}</td>
                <td className="px-4 py-3 border-b border-line num">{r.orders}</td>
                <td className="px-4 py-3 border-b border-line text-[12.5px]">
                  {r.ok ? "Ready" : r.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3.5 flex-wrap">
        <button
          onClick={send}
          disabled={busy || picked.size === 0}
          className="text-[14px] font-semibold px-5 py-2.5 rounded-(--radius-btn) bg-navy-950 text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {busy
            ? "Sending..."
            : `Send to ${picked.size} ${picked.size === 1 ? "advertiser" : "advertisers"}`}
        </button>
        {done && (
          <span className="text-[13px] text-ok">
            Sent {done.sent}.{done.failed.length > 0 ? ` ${done.failed.length} did not go.` : ""}
          </span>
        )}
        {err && <span className="text-[13px] text-[#b42318]">{err}</span>}
      </div>

      {done && done.failed.length > 0 && (
        <ul className="text-[12.5px] text-[#b42318] grid gap-1">
          {done.failed.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
