"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OptOutEntry } from "@/lib/newsletter-audience";

/**
 * The people the advertiser update will not go to.
 *
 * A paste box rather than one field at a time, because the request
 * arrives as a list — a reply-all, a column out of a spreadsheet, a
 * handful of bounces — and retyping nine addresses into nine fields is
 * how the tenth gets missed.
 *
 * The result is reported per address rather than as a total. Added,
 * already on the list, and not an email address are three different
 * things, and the last one is a typo that would otherwise vanish
 * quietly into a success message.
 */

const SOURCE_LABEL: Record<string, string> = {
  link: "Pressed unsubscribe",
  admin: "Removed here",
};

type Result = { added: string[]; already: string[]; invalid: string[] };

export function AdminOptOuts({ entries }: { entries: OptOutEntry[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/newsletter/optouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", emails: text }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      setResult({ added: j.added ?? [], already: j.already ?? [], invalid: j.invalid ?? [] });
      // Cleared only on success, so a failed paste is still there to
      // retry rather than something to reconstruct from memory.
      setText("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  async function putBack(email: string) {
    if (
      !window.confirm(
        `Put ${email} back on the list? They will start receiving the advertiser update again.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/newsletter/optouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", email }),
      });
      if (!res.ok) throw new Error("That did not save.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3">
        <div>
          <label
            htmlFor="optout-paste"
            className="text-[13px] font-semibold block"
          >
            Remove addresses from the list
          </label>
          <p className="text-[12.5px] text-muted mt-1 max-w-[72ch] leading-relaxed">
            One per line, or separated by commas — paste as many as you like.
            Duplicates and blank lines are fine. This stops the advertiser
            update reaching them; it does not delete their listing, their
            orders, or anything else.
          </p>
        </div>
        <textarea
          id="optout-paste"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"someone@example.com\nanother@example.com"}
          className="w-full text-[13.5px] font-mono px-3 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={add}
            disabled={busy || !text.trim()}
            className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-navy-950 text-white disabled:opacity-40"
          >
            {busy ? "Removing…" : "Remove from list"}
          </button>
          {error && <span className="text-[12.5px] text-danger">{error}</span>}
        </div>

        {result && (
          <div className="text-[12.5px] grid gap-1.5 border-t border-line pt-3">
            {result.added.length > 0 && (
              <p>
                <b>
                  Removed {result.added.length}{" "}
                  {result.added.length === 1 ? "address" : "addresses"}:
                </b>{" "}
                <span className="text-body">{result.added.join(", ")}</span>
              </p>
            )}
            {result.already.length > 0 && (
              <p className="text-muted">
                Already off the list: {result.already.join(", ")}
              </p>
            )}
            {/* Loudest of the three. An address that did not parse is
                somebody still receiving the update who was meant not to
                be, and that is the failure worth noticing. */}
            {result.invalid.length > 0 && (
              <p className="text-danger">
                <b>Not an email address, so not removed:</b>{" "}
                {result.invalid.join(", ")}
              </p>
            )}
            {result.added.length === 0 &&
              result.already.length === 0 &&
              result.invalid.length === 0 && (
                <p className="text-muted">Nothing to do.</p>
              )}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-[15px] font-semibold tracking-tight mb-2">
          Off the list{" "}
          <span className="num text-muted font-normal">({entries.length})</span>
        </h2>
        {entries.length === 0 ? (
          <p className="text-[13px] text-muted">
            Nobody has unsubscribed and nobody has been removed here.
          </p>
        ) : (
          <div className="border border-line rounded-(--radius-card) bg-white overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">Email</th>
                  <th className="text-left font-semibold px-4 py-2.5">How</th>
                  <th className="text-left font-semibold px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.email} className="border-t border-line">
                    <td className="px-4 py-2.5 break-all">{e.email}</td>
                    <td className="px-4 py-2.5 text-muted">
                      {SOURCE_LABEL[e.source] ?? e.source}
                    </td>
                    <td className="px-4 py-2.5 text-muted num">
                      {e.optedOutAt
                        ? new Date(e.optedOutAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => putBack(e.email)}
                        disabled={busy}
                        className="text-[12.5px] font-semibold text-brand-deep hover:underline disabled:opacity-40"
                      >
                        Put back
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
