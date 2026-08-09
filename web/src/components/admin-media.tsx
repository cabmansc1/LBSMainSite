"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type MediaView = {
  id: number;
  url: string;
  width: number;
  height: number;
  bytes: number;
  alt: string;
  caption: string;
  credit: string;
  createdAt?: string;
};

/**
 * The picture library.
 *
 * Alt text is the reason this exists, so the screen is built to make a
 * missing one visible rather than to look tidy: anything without it
 * carries a warning chip, and the count sits at the top. A library where
 * nobody notices the gap is how a site ends up with four hundred
 * undescribed images.
 */
export function AdminMedia({ items }: { items: MediaView[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<MediaView>>({});

  const field =
    "w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";
  const label = "text-[11px] uppercase tracking-wider text-muted font-semibold";

  const missing = items.filter((i) => !i.alt.trim()).length;

  const kb = (n: number) =>
    n >= 1024 * 1024
      ? `${(n / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(n / 1024))} KB`;

  async function upload(file: File) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const body = new FormData();
      body.append("file", file);
      // No content-type header: the browser has to set the multipart
      // boundary itself.
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not upload.");
      setNote(
        j.reused
          ? "That picture was already here, so it was not stored twice."
          : "Uploaded. Add alt text describing what is in it.",
      );
      if (!j.reused) {
        setOpen(Number(j.id));
        setDraft({ id: Number(j.id), alt: "", caption: "", credit: "" });
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not upload.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveText(id: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          alt: draft.alt ?? "",
          caption: draft.caption ?? "",
          credit: draft.credit ?? "",
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      setOpen(null);
      setDraft({});
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5">
      {error && (
        <p className="text-[13px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}
      {note && (
        <p className="text-[13px] text-brand-deep bg-brand-tint border border-line rounded-lg px-4 py-2.5">
          {note}
        </p>
      )}

      <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3">
        <b className="text-[15px]">Add a picture</b>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          aria-label="Picture file"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
          className="text-[13.5px]"
        />
        <p className="text-[12px] text-muted">
          Resized to 2000px on the long edge and saved as WebP. The same picture
          uploaded twice is stored once.
        </p>
      </div>

      {items.length > 0 && (
        <p className="text-[12.5px] text-muted">
          {items.length} {items.length === 1 ? "picture" : "pictures"}
          {missing > 0 && (
            <span className="text-danger font-semibold">
              {" "}
              &middot; {missing} still {missing === 1 ? "needs" : "need"} alt
              text
            </span>
          )}
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {items.map((m) => (
          <div
            key={m.id}
            className="border border-line rounded-(--radius-card) bg-white overflow-hidden grid content-start"
          >
            <div className="bg-surface aspect-[4/3] relative">
              <Image
                src={m.url}
                alt={m.alt || "Untitled picture in the library"}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-contain"
              />
            </div>
            <div className="p-3.5 grid gap-2">
              {m.alt.trim() ? (
                <p className="text-[13px] leading-snug">{m.alt}</p>
              ) : (
                <p className="text-[12.5px] font-semibold text-danger">
                  No alt text yet
                </p>
              )}
              <p className="text-[11.5px] text-muted num">
                {m.width}&times;{m.height} &middot; {kb(m.bytes)}
                {m.createdAt ? ` · ${m.createdAt}` : ""}
              </p>

              {open === m.id ? (
                <div className="grid gap-2.5 pt-1">
                  <label className="grid gap-1.5">
                    <span className={label}>
                      Alt text: what is in the picture
                    </span>
                    <input
                      value={draft.alt ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, alt: e.target.value })
                      }
                      placeholder="A florist arranging sunflowers behind the counter"
                      className={field}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className={label}>Caption</span>
                    <input
                      value={draft.caption ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, caption: e.target.value })
                      }
                      className={field}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className={label}>Credit</span>
                    <input
                      value={draft.credit ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, credit: e.target.value })
                      }
                      className={field}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveText(m.id)}
                      className="text-[13px] font-semibold px-3.5 py-2 rounded-[9px] bg-navy-950 text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(null);
                        setDraft({});
                      }}
                      className="text-[13px] font-semibold px-3.5 py-2 rounded-[9px] border border-line-strong bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(m.id);
                    setDraft(m);
                  }}
                  className="justify-self-start text-[13px] font-semibold px-3 py-1.5 rounded-[9px] border border-line-strong bg-white"
                >
                  {m.alt.trim() ? "Edit" : "Add alt text"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-[13px] text-muted">
          Nothing here yet. The first picture you upload starts the library.
        </p>
      )}
    </div>
  );
}
