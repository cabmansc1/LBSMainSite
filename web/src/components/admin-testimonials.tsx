"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Testimonial } from "@/lib/testimonial-types";

/**
 * Add, edit, approve and remove customer quotes.
 *
 * Replaces a screen whose Add, Edit and Remove buttons had no handlers
 * at all: it listed three hardcoded samples and looked like a working
 * CRUD, which is worse than looking unfinished, because nobody thinks
 * to ask why their review never appeared.
 *
 * Approval is deliberately separate from saving. A quote typed in and
 * not yet checked should not appear on the home page the moment the
 * form is submitted.
 */

const field =
  "w-full text-[14px] px-3.5 py-2.5 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950";
const label = "text-[12.5px] font-semibold text-body block mb-1.5";

const BLANK: Testimonial = {
  quote: "",
  author: "",
  detail: "",
  placements: ["home"],
  rating: 5,
  approved: false,
  pinned: false,
};

export function AdminTestimonials({
  initial,
  placements,
}: {
  initial: Testimonial[];
  placements: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function post(body: unknown, after?: () => void) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      after?.();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  const toggleP = (p: string) =>
    setEditing((t) =>
      t === null
        ? t
        : {
            ...t,
            placements: t.placements.includes(p)
              ? t.placements.filter((x) => x !== p)
              : [...t.placements, p],
          },
    );

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setEditing({ ...BLANK })}
          className="bg-navy-950 text-white font-semibold text-[13px] px-4 py-2 rounded-(--radius-btn) hover:bg-navy-800"
        >
          Add testimonial
        </button>
        {err && !editing && (
          <span className="text-[13px] text-[#b42318]">{err}</span>
        )}
      </div>

      {editing && (
        <div className="border border-line-strong rounded-(--radius-card) bg-white p-6 grid gap-3.5">
          <div>
            <label htmlFor="t-quote" className={label}>
              What they said
            </label>
            <textarea
              id="t-quote"
              rows={3}
              value={editing.quote}
              onChange={(e) => setEditing({ ...editing, quote: e.target.value })}
              className={field}
              placeholder="Paste the review, in their words."
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="t-author" className={label}>
                Who said it
              </label>
              <input
                id="t-author"
                value={editing.author}
                onChange={(e) => setEditing({ ...editing, author: e.target.value })}
                placeholder="Sarah M."
                className={field}
              />
            </div>
            <div>
              <label htmlFor="t-detail" className={label}>
                Business and area
              </label>
              <input
                id="t-detail"
                value={editing.detail}
                onChange={(e) => setEditing({ ...editing, detail: e.target.value })}
                placeholder="RLD, Summerville"
                className={field}
              />
            </div>
          </div>

          <div>
            <label htmlFor="t-rating" className={label}>
              Stars
            </label>
            <select
              id="t-rating"
              value={editing.rating ?? ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  rating: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className={`${field} max-w-[220px]`}
            >
              {/* Blank is a real answer: a quote from an email has no
                  star rating, and drawing five would be inventing it. */}
              <option value="">No rating</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className={label}>Show on</span>
            <div className="flex flex-wrap gap-2">
              {placements.map((p) => (
                <button
                  key={p.value}
                  onClick={() => toggleP(p.value)}
                  className={`text-[12.5px] px-3 py-1.5 rounded-full border capitalize ${
                    editing.placements.includes(p.value)
                      ? "bg-navy-950 text-white border-navy-950 font-semibold"
                      : "bg-white border-line-strong text-body hover:border-navy-950"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <label className="flex items-center gap-2.5 text-[13.5px]">
              <input
                type="checkbox"
                checked={!!editing.approved}
                onChange={(e) =>
                  setEditing({ ...editing, approved: e.target.checked })
                }
              />
              Approved, and live on the site
            </label>
            <label className="flex items-center gap-2.5 text-[13.5px]">
              <input
                type="checkbox"
                checked={!!editing.pinned}
                onChange={(e) =>
                  setEditing({ ...editing, pinned: e.target.checked })
                }
              />
              Pin to the top, ahead of the rotation
            </label>
          </div>

          {err && (
            <p className="text-[13px] text-[#b42318] bg-[#fdf3f2] border border-[#f3c6c2] rounded-lg px-3.5 py-2.5">
              {err}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              disabled={busy || editing.quote.trim().length < 10}
              onClick={() =>
                post({ action: "save", testimonial: editing }, () =>
                  setEditing(null),
                )
              }
              className="bg-navy-950 text-white font-semibold text-[13.5px] px-4 py-2.5 rounded-(--radius-btn) hover:bg-navy-800 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="text-[13px] font-semibold text-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {initial.length === 0 ? (
        <div className="border border-line rounded-(--radius-card) bg-white p-6">
          <p className="text-sm text-body">
            No testimonials yet. Until there is at least one approved quote for
            a placement, that section does not appear on the site at all.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {initial.map((t) => (
            <div
              key={t.id}
              className="border border-line rounded-(--radius-card) bg-white p-5.5 grid md:grid-cols-[1fr_auto] gap-4 items-start"
            >
              <div>
                <blockquote className="text-[14.5px] leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <p className="text-[12.5px] text-muted mt-2">
                  {[
                    t.author,
                    t.detail,
                    typeof t.rating === "number" ? `${t.rating} stars` : null,
                    t.pinned ? "pinned" : null,
                    t.placements.length
                      ? `shown on: ${t.placements.join(", ")}`
                      : "not shown anywhere yet",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {t.pinned && (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-brand-tint border-[#c2e4fb] text-brand-deep">
                    Pinned
                  </span>
                )}
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    t.approved
                      ? "bg-[#f2faf4] border-[#c9e6cf] text-[#1c5230]"
                      : "bg-cta-tint border-[#f3ddbb] text-[#7a4a00]"
                  }`}
                >
                  {t.approved ? "Live" : "Draft"}
                </span>
                <button
                  onClick={() => setEditing(t)}
                  className="text-[13px] font-semibold text-brand-deep hover:underline"
                >
                  Edit
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(`Remove this quote from ${t.author || "the site"}?`)
                    ) {
                      void post({ action: "delete", id: t.id });
                    }
                  }}
                  className="text-[13px] font-semibold text-muted hover:text-[#b42318]"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
