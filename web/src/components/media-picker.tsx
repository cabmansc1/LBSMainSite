"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Choosing a picture, and describing it.
 *
 * The library was built around alt text and then nothing ever asked for
 * any: every upload path set it to an empty string and told whoever was
 * uploading to go and write it on a different screen, which is another
 * way of saying it never got written. Describing a picture is a
 * fifteen-second job at the moment you are looking at it and a research
 * task a week later, so the asking belongs here.
 *
 * It is not enforced. A required field produces "image" and "photo",
 * which is worse than an empty one because it reads as a description to
 * everything that consumes it. Instead the field is focused, the reason
 * is stated in a sentence, and leaving it blank is a deliberate choice
 * with its own checkbox.
 *
 * Picking from the library matters for the same reason: a picture
 * already described should be reusable without describing it again.
 */

export type PickedMedia = {
  id: number;
  alt: string;
  caption: string;
  credit: string;
};

type Item = {
  id: number;
  url: string;
  alt: string;
  caption: string;
  credit: string;
  width: number;
  height: number;
  createdAt?: string;
};

export function MediaPicker({
  open,
  onClose,
  onPick,
  heading = "Add a picture",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (picked: PickedMedia) => void;
  heading?: string;
}) {
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const [items, setItems] = useState<Item[] | null>(null);
  const [chosen, setChosen] = useState<Item | null>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [credit, setCredit] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const altRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setChosen(null);
    setAlt("");
    setCaption("");
    setCredit("");
    setDecorative(false);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  /** Closing is an event, so the clearing happens on the way out. */
  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // Escape closes, as it does everywhere else in the admin.
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, close]);

  // Loaded once the library tab is actually opened, so the common case
  // of uploading a new photograph costs no request at all.
  useEffect(() => {
    if (!open || tab !== "library" || items !== null) return;
    let live = true;
    fetch("/api/admin/media")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => {
        if (live) setItems(j.items ?? []);
      })
      .catch(() => {
        if (live) setItems([]);
      });
    return () => {
      live = false;
    };
  }, [open, tab, items]);

  // The description field is the point of this dialog, so it gets focus
  // the moment there is a picture to describe.
  useEffect(() => {
    if (chosen) altRef.current?.focus();
  }, [chosen]);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not upload.");
      const item: Item = {
        id: Number(j.id),
        url: String(j.url),
        alt: "",
        caption: "",
        credit: "",
        width: Number(j.width ?? 0),
        height: Number(j.height ?? 0),
      };
      setChosen(item);
      // The same file uploaded before comes back as the row it already
      // is, description and all, so nothing written earlier is lost.
      if (j.reused) {
        const known = (items ?? []).find((i) => i.id === item.id);
        if (known) {
          setAlt(known.alt);
          setCaption(known.caption);
          setCredit(known.credit);
          setDecorative(known.alt === "");
        }
      }
      // Dropping the library cache means a fresh upload shows up there
      // next time it is opened.
      setItems(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not upload.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!chosen) return;
    const finalAlt = decorative ? "" : alt.trim();
    setBusy(true);
    setError("");
    try {
      // Saved back to the library, not just handed to the page, so the
      // next thing to use this picture inherits the description.
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chosen.id,
          alt: finalAlt,
          caption: caption.trim(),
          credit: credit.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "That did not save.");
      }
      onPick({
        id: chosen.id,
        alt: finalAlt,
        caption: caption.trim(),
        credit: credit.trim(),
      });
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const field =
    "w-full text-[14px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";
  const label = "text-[12px] font-semibold text-ink";

  return (
    <div
      className="fixed inset-0 z-[100] bg-navy-950/55 flex items-start justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bg-white rounded-(--radius-card) border border-line w-full max-w-[720px] my-8 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-line">
          <b className="text-[15px]">{heading}</b>
          <button
            type="button"
            onClick={close}
            className="text-[13px] font-semibold text-muted hover:text-ink"
          >
            Close
          </button>
        </div>

        {!chosen && (
          <div className="flex gap-1.5 px-5 pt-4">
            {(["upload", "library"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full border ${
                  tab === t
                    ? "bg-navy-950 text-white border-navy-950"
                    : "bg-white border-line-strong"
                }`}
              >
                {t === "upload" ? "Upload a new one" : "Already uploaded"}
              </button>
            ))}
          </div>
        )}

        <div className="p-5">
          {error && (
            <p className="mb-4 text-[13px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-3.5 py-2">
              {error}
            </p>
          )}

          {!chosen && tab === "upload" && (
            <div className="grid gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                disabled={busy}
                aria-label="Choose a picture to upload"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                }}
                className="text-[13px] file:text-[13px] file:font-semibold file:mr-3 file:px-3.5 file:py-2 file:rounded-[9px] file:border file:border-line-strong file:bg-white"
              />
              <p className="text-[12.5px] text-muted">
                {busy
                  ? "Uploading and resizing…"
                  : "Resized to 2000px and stored once. You will be asked to describe it next."}
              </p>
            </div>
          )}

          {!chosen && tab === "library" && (
            <>
              {items === null ? (
                <p className="text-[13.5px] text-muted">Looking…</p>
              ) : items.length === 0 ? (
                <p className="text-[13.5px] text-muted">
                  Nothing in the library yet. Upload one instead.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[420px] overflow-y-auto">
                  {items.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => {
                        setChosen(i);
                        setAlt(i.alt);
                        setCaption(i.caption);
                        setCredit(i.credit);
                        setDecorative(false);
                      }}
                      className="group text-left"
                      title={i.alt || "No description yet"}
                    >
                      <span className="relative block aspect-square rounded-[9px] overflow-hidden border border-line bg-surface group-hover:border-navy-950">
                        <Image
                          src={i.url}
                          alt=""
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      </span>
                      {/* Which ones still need describing, visible at a
                          glance rather than one click in. */}
                      {!i.alt && (
                        <span className="block mt-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#7a4a00]">
                          Needs alt text
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {chosen && (
            <div className="grid sm:grid-cols-[180px_1fr] gap-5">
              <span className="relative block aspect-square rounded-[10px] overflow-hidden border border-line bg-surface">
                <Image
                  src={chosen.url}
                  alt=""
                  fill
                  sizes="180px"
                  className="object-cover"
                />
              </span>

              <div className="grid gap-3.5 content-start">
                <label className="grid gap-1.5">
                  <span className={label}>Describe this picture</span>
                  <input
                    ref={altRef}
                    value={alt}
                    disabled={decorative}
                    onChange={(e) => setAlt(e.target.value)}
                    placeholder="Sarah behind the counter at Bell Bakery"
                    className={`${field} disabled:bg-surface disabled:text-muted`}
                  />
                  <span className="text-[12px] text-muted">
                    Say what is in it, as you would to somebody on the phone.
                    This is read aloud to anybody who cannot see it, and it is
                    what search engines have to go on.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-[13px]">
                  <input
                    type="checkbox"
                    checked={decorative}
                    onChange={(e) => setDecorative(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    It is decorative and adds nothing
                    <span className="block text-[12px] text-muted">
                      Leaves the description empty on purpose, so a screen
                      reader skips it rather than reading a filename.
                    </span>
                  </span>
                </label>

                <label className="grid gap-1.5">
                  <span className={label}>Caption, if it needs one</span>
                  <input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Printed under the picture"
                    className={field}
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className={label}>Credit</span>
                  <input
                    value={credit}
                    onChange={(e) => setCredit(e.target.value)}
                    placeholder="Who took it"
                    className={field}
                  />
                </label>

                {!decorative && !alt.trim() && (
                  <p className="text-[12.5px] text-[#7a4a00] bg-cta-tint border border-[#f3ddbb] rounded-lg px-3.5 py-2">
                    No description yet. You can go on without one, but this is
                    the moment it takes fifteen seconds instead of ten minutes.
                  </p>
                )}

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={busy}
                    className="text-[14px] font-semibold px-4 py-2.5 rounded-[10px] bg-navy-950 text-white disabled:opacity-50"
                  >
                    {busy ? "Saving" : "Use this picture"}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    disabled={busy}
                    className="text-[13px] font-semibold text-muted hover:text-ink"
                  >
                    Pick a different one
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
