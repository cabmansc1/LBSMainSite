"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/sections";
import type { WaitlistEntry, WaitlistSendOutcome } from "@/lib/waitlist";

/**
 * The waitlist, as a work queue rather than a report.
 *
 * Everyone on this list was told they would hear from us when their
 * category opened. Marking a row notified is what turns the list from a
 * growing pile into a queue that can reach empty, so the mark has to
 * mean an email actually went: "Send notice" writes the timestamp, and
 * it writes it only for the addresses that took the mail.
 *
 * The quiet flag-only action stays for the case the send cannot cover,
 * which is the admin having already phoned them. It is deliberately not
 * the button your eye lands on, and neither is it shaped like the one
 * that mails twenty people.
 */
type Action = "notify" | "notified" | "waiting" | "delete";

export function AdminWaitlist({
  entries,
  zoneNames,
  emailConfigured,
}: {
  entries: WaitlistEntry[];
  zoneNames: Record<string, string>;
  emailConfigured: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcomes, setOutcomes] = useState<WaitlistSendOutcome[]>([]);

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  async function act(ids: number[], action: Action, confirmLabel?: string) {
    if (confirmLabel && !confirm(confirmLabel)) return;
    setBusy(true);
    setError("");
    setOutcomes([]);
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
      if (action === "notify") {
        setOutcomes(Array.isArray(j.outcomes) ? j.outcomes : []);
      }
      setSelected([]);
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  const sendTo = (ids: number[], who: string) =>
    act(
      ids,
      "notify",
      `Email ${who} now?\n\nThis sends the waitlist notice to their inbox. Only the addresses that go through will be marked notified.`,
    );

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-8 text-center">
        Nobody is waiting on a category yet.
      </p>
    );
  }

  const waiting = entries.filter((e) => !e.notifiedAt);
  const failed = outcomes.filter((o) => !o.sent);

  return (
    <>
      {!emailConfigured && (
        <p className="mb-3 border border-[#f3ddbb] bg-cta-tint rounded-(--radius-card) px-4 py-3 text-[13px] text-body">
          Email sending is off in this environment because there is no
          Resend key. Sending a notice will print it to the server log and
          leave the row waiting, which is the honest outcome: nothing was
          delivered.
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap mb-3">
        <span className="text-[12.5px] text-muted num">
          {waiting.length} waiting, {entries.length} total
        </span>
        {selected.length > 0 && (
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            <span className="text-[12.5px] text-muted num">
              {selected.length} selected
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                sendTo(
                  selected,
                  `${selected.length} ${
                    selected.length === 1 ? "person" : "people"
                  }`,
                )
              }
              className="bg-cta text-navy-950 text-[12.5px] font-bold px-4 py-2 rounded-(--radius-btn) hover:bg-[#FFA033] disabled:opacity-40"
            >
              Send notice to {selected.length}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                act(
                  selected,
                  "notified",
                  `Mark ${selected.length} notified without sending anything?`,
                )
              }
              className="text-[12.5px] font-semibold text-muted hover:text-ink disabled:opacity-40"
            >
              Flag notified, no email
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

      {outcomes.length > 0 && (
        <div className="mb-3 border border-line rounded-(--radius-card) bg-white px-4 py-3">
          <p className="text-[12.5px] font-semibold mb-2">
            {outcomes.length - failed.length} sent, {failed.length} not sent.{" "}
            {failed.length > 0 && (
              <span className="font-normal text-muted">
                Anything that did not send is still waiting, so it can be tried
                again.
              </span>
            )}
          </p>
          <ul className="text-[12.5px] space-y-1">
            {outcomes.map((o) => (
              <li key={o.id} className="flex gap-2 flex-wrap">
                <span className={o.sent ? "text-muted" : "text-danger"}>
                  {o.sent ? "Sent" : "Not sent"}
                </span>
                <span className="font-semibold">{o.email}</span>
                {o.error && <span className="text-muted">{o.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[880px]">
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
                <td className="px-4 py-3.5 border-b border-line text-right whitespace-nowrap">
                  {e.notifiedAt ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act([e.id], "waiting")}
                      className="text-[12.5px] font-semibold text-muted hover:text-ink disabled:opacity-40"
                    >
                      Undo
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => sendTo([e.id], e.email)}
                        className="bg-cta text-navy-950 text-[12px] font-bold px-3 py-1.5 rounded-[8px] hover:bg-[#FFA033] disabled:opacity-40"
                      >
                        Send notice
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          act(
                            [e.id],
                            "notified",
                            `Mark ${e.email} notified without sending anything?`,
                          )
                        }
                        className="text-[12px] font-semibold text-muted hover:text-ink disabled:opacity-40"
                      >
                        Flag only
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
