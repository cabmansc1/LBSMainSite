"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BlockKind } from "@/lib/blocks-registry";

export type BlockRowView = {
  page: string;
  key: string;
  label: string;
  kind: BlockKind;
  hint?: string;
  fallback: string | string[];
  override: string | null;
  updatedAt?: string;
  updatedBy?: string;
};

/**
 * The words on a page, each with the version the site ships with beside
 * it.
 *
 * Showing the code value matters more than it looks. Without it an
 * editor cannot tell whether a line is the original or something they
 * changed six months ago, and Reset becomes a button nobody dares press.
 * With it, Reset is obviously safe: it puts back the text printed right
 * there.
 *
 * A list is edited as one item per line rather than as a repeater. Every
 * list here is short and flat, and a textarea is faster to correct a
 * typo in than three inputs with add and remove buttons around them.
 */
export function AdminBlocks({ blocks }: { blocks: BlockRowView[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const asText = (v: string | string[]) =>
    Array.isArray(v) ? v.join("\n") : v;

  // What the field starts as: the saved override if there is one, else
  // the words the page currently renders from code.
  const valueOf = (b: BlockRowView) => {
    const d = drafts[b.key];
    if (d !== undefined) return d;
    if (b.override !== null) {
      return b.kind === "list"
        ? asText(safeList(b.override) ?? asText(b.fallback))
        : b.override;
    }
    return asText(b.fallback);
  };

  const dirty = (b: BlockRowView) => valueOf(b) !== originalOf(b);

  const originalOf = (b: BlockRowView) => {
    if (b.override !== null) {
      return b.kind === "list"
        ? asText(safeList(b.override) ?? asText(b.fallback))
        : b.override;
    }
    return asText(b.fallback);
  };

  async function send(b: BlockRowView, action: "save" | "reset") {
    setBusy(b.key);
    setError("");
    try {
      // A list travels as JSON, so blank lines do not become empty
      // bullets on the page.
      const raw = valueOf(b);
      const value =
        b.kind === "list"
          ? JSON.stringify(
              raw
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean),
            )
          : raw;
      const res = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, page: b.page, key: b.key, value }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      setDrafts((d) => {
        const next = { ...d };
        delete next[b.key];
        return next;
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy("");
    }
  }

  const field =
    "w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950 font-mono";

  return (
    <div className="grid gap-3">
      {error && (
        <p className="text-[13px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      {blocks.map((b) => {
        const edited = b.override !== null;
        const lines = b.kind === "list" ? 4 : valueOf(b).length > 90 ? 3 : 2;
        return (
          <div
            key={b.key}
            className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-2.5"
          >
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <b className="text-[14.5px]">{b.label}</b>
              <span className="text-[11.5px] text-muted num">{b.key}</span>
              {edited ? (
                <span className="text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-brand-tint text-brand-deep">
                  Edited
                </span>
              ) : (
                <span className="text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-surface text-muted">
                  Original
                </span>
              )}
              {edited && b.updatedAt && (
                <span className="text-[11.5px] text-muted">
                  {b.updatedBy ? `${b.updatedBy}, ` : ""}
                  {b.updatedAt}
                </span>
              )}
            </div>

            <textarea
              value={valueOf(b)}
              rows={lines}
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [b.key]: e.target.value }))
              }
              className={field}
            />

            {b.hint && <p className="text-[12px] text-muted">{b.hint}</p>}

            {edited && (
              <details className="text-[12px] text-muted">
                <summary className="cursor-pointer">
                  What the site ships with
                </summary>
                <p className="mt-1.5 whitespace-pre-wrap font-mono text-[12px] bg-surface border border-line rounded-lg p-2.5">
                  {asText(b.fallback)}
                </p>
              </details>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={busy === b.key || !dirty(b)}
                onClick={() => send(b, "save")}
                className="text-[13px] font-semibold px-4 py-2 rounded-[9px] bg-navy-950 text-white disabled:opacity-40"
              >
                {busy === b.key ? "Saving" : "Save"}
              </button>
              {edited && (
                <button
                  type="button"
                  disabled={busy === b.key}
                  onClick={() => send(b, "reset")}
                  className="text-[13px] font-semibold px-4 py-2 rounded-[9px] border border-line-strong bg-white disabled:opacity-40"
                >
                  Put the original back
                </button>
              )}
              {dirty(b) && (
                <button
                  type="button"
                  onClick={() =>
                    setDrafts((d) => {
                      const next = { ...d };
                      delete next[b.key];
                      return next;
                    })
                  }
                  className="text-[13px] px-3 py-2 rounded-[9px] text-muted"
                >
                  Undo
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function safeList(raw: string): string[] | undefined {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => String(x)) : undefined;
  } catch {
    return undefined;
  }
}
