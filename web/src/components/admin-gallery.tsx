"use client";

import { useRef, useState } from "react";
import type { PastCard } from "@/lib/past-cards";

type McCard = {
  cardId: string;
  cardName?: string;
  zoneSlug: string;
  zoneName: string;
  mailMonth: string;
  mailDateIso: string;
  isPast: boolean;
};

/**
 * Upload and publish a mailed card.
 *
 * The flow is deliberately two steps and no more: pick the Mission
 * Control card, which fills in the zone, the name and the month, then
 * drop the photos in. Everything else about the page, the routes it
 * covered and the businesses on it, is read back from Mission Control at
 * render time, so there is nothing to re-type after a mailing.
 */
export function AdminGallery({
  cards,
  mcCards,
}: {
  cards: PastCard[];
  mcCards: McCard[];
}) {
  const [rows, setRows] = useState(cards);
  const [picked, setPicked] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const slugFor = (zoneSlug: string, mailMonth: string) =>
    `${zoneSlug}-${mailMonth}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  async function addFromMc() {
    const mc = mcCards.find((c) => c.cardId === picked);
    if (!mc) return;
    const slug = slugFor(mc.zoneSlug, mc.mailMonth);
    setBusy(slug);
    setMessage("");
    try {
      const res = await fetch("/api/admin/card-images", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          mcCardId: mc.cardId,
          zoneSlug: mc.zoneSlug,
          zoneName: mc.zoneName,
          cardName: mc.cardName,
          mailMonth: mc.mailMonth,
          mailDate: mc.mailDateIso?.slice(0, 10) || undefined,
          published: false,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      setRows((r) =>
        r.some((x) => x.slug === slug)
          ? r
          : [
              {
                slug,
                mcCardId: mc.cardId,
                zoneSlug: mc.zoneSlug,
                zoneName: mc.zoneName,
                cardName: mc.cardName,
                mailMonth: mc.mailMonth,
                mailDate: mc.mailDateIso?.slice(0, 10),
                published: false,
                images: [],
              },
              ...r,
            ],
      );
      setMessage("Card added. Now upload the front and back.");
    } catch (e) {
      setMessage(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  async function upload(slug: string, side: string, file: File) {
    setBusy(slug);
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("cardSlug", slug);
      body.set("side", side);
      const res = await fetch("/api/admin/card-images", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setRows((r) =>
        r.map((c) =>
          c.slug === slug
            ? {
                ...c,
                images: [
                  ...c.images,
                  {
                    id: data.id,
                    cardSlug: slug,
                    side: side as PastCard["images"][number]["side"],
                    alt: "",
                    width: data.width ?? 0,
                    height: data.height ?? 0,
                    mime: "image/webp",
                    order: c.images.length,
                  },
                ],
              }
            : c,
        ),
      );
      setMessage(`Uploaded, stored at ${data.kb}KB.`);
    } catch (e) {
      setMessage(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  async function save(card: PastCard, patch: Partial<PastCard>) {
    setBusy(card.slug);
    setMessage("");
    try {
      const next = { ...card, ...patch };
      const res = await fetch("/api/admin/card-images", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: next.slug,
          mcCardId: next.mcCardId,
          zoneSlug: next.zoneSlug,
          zoneName: next.zoneName,
          cardName: next.cardName,
          mailMonth: next.mailMonth,
          mailDate: next.mailDate,
          description: next.description,
          published: next.published,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      setRows((r) => r.map((c) => (c.slug === card.slug ? next : c)));
      setMessage(
        patch.published === true
          ? "Published. It is on the gallery now."
          : patch.published === false
            ? "Hidden from the site."
            : "Saved.",
      );
    } catch (e) {
      setMessage(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  async function removeImage(slug: string, imageId: number) {
    setBusy(slug);
    try {
      await fetch(`/api/admin/card-images?imageId=${imageId}`, { method: "DELETE" });
      setRows((r) =>
        r.map((c) =>
          c.slug === slug
            ? { ...c, images: c.images.filter((i) => i.id !== imageId) }
            : c,
        ),
      );
      setMessage("Image removed.");
    } finally {
      setBusy(null);
    }
  }

  const available = mcCards.filter(
    (m) => !rows.some((r) => r.slug === slugFor(m.zoneSlug, m.mailMonth)),
  );

  return (
    <div className="grid gap-5">
      <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3">
        <b className="text-[15px]">Add a card from Mission Control</b>
        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            aria-label="Mission Control card"
            className="text-[14px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white min-w-[320px]"
          >
            <option value="">Choose a card...</option>
            {available.map((m) => (
              <option key={m.cardId} value={m.cardId}>
                {m.cardName ?? m.zoneName} · {m.mailMonth}
                {m.isPast ? "" : " (still filling)"}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addFromMc}
            disabled={!picked || busy !== null}
            className="bg-navy-950 text-white text-[13.5px] font-semibold px-4 py-2.5 rounded-[10px] hover:bg-navy-800 disabled:opacity-40"
          >
            Add card
          </button>
        </div>
        <p className="text-[12.5px] text-muted">
          The zone, name and mail month come from Mission Control. The routes it
          covered and the businesses on it are read back live, so nothing needs
          typing twice.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-8 text-center">
          No cards in the archive yet. Add one above.
        </p>
      ) : (
        rows.map((c) => (
          <div
            key={c.slug}
            className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-4"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <b className="text-[16px] font-bold tracking-tight">
                  {c.cardName ?? c.zoneName}
                </b>
                <p className="text-[13px] text-muted num">
                  Mailed {c.mailMonth} · /cards/{c.slug}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    c.published
                      ? "text-ok border-[#bfe8d2] bg-[#e5f5ec]"
                      : "text-muted border-line bg-surface"
                  }`}
                >
                  {c.published ? "Live" : "Draft"}
                </span>
                <button
                  type="button"
                  onClick={() => save(c, { published: !c.published })}
                  disabled={busy === c.slug || (!c.published && c.images.length === 0)}
                  title={
                    !c.published && c.images.length === 0
                      ? "Upload at least one image first"
                      : undefined
                  }
                  className="text-[13px] font-semibold px-3.5 py-2 rounded-[10px] border border-line-strong hover:border-faint disabled:opacity-40"
                >
                  {c.published ? "Unpublish" : "Publish"}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor={`desc-${c.slug}`}
                className="text-[11px] uppercase tracking-wider text-muted font-semibold block mb-1.5"
              >
                What this mailing was
              </label>
              <div className="flex gap-2 items-start flex-wrap">
                <textarea
                  id={`desc-${c.slug}`}
                  rows={2}
                  maxLength={600}
                  defaultValue={c.description ?? ""}
                  onBlur={(e) => {
                    if (e.target.value !== (c.description ?? "")) {
                      save(c, { description: e.target.value });
                    }
                  }}
                  placeholder="The August Downtown Summerville card: 2,680 homes across 29483, with 12 local businesses and a full-page from Palmetto Plumbing."
                  className="flex-1 min-w-[300px] text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
                />
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex gap-2 flex-wrap">
                {(["front", "back", "detail"] as const).map((side) => (
                  <div key={side}>
                    <input
                      ref={(el) => {
                        fileInputs.current[`${c.slug}-${side}`] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) upload(c.slug, side, f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputs.current[`${c.slug}-${side}`]?.click()}
                      disabled={busy === c.slug}
                      className="text-[13px] font-semibold px-3.5 py-2 rounded-[10px] border border-line-strong hover:border-faint capitalize disabled:opacity-40"
                    >
                      Upload {side}
                    </button>
                  </div>
                ))}
              </div>

              {c.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {c.images.map((img) => (
                    <figure key={img.id} className="grid gap-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/card-image/${img.id}`}
                        alt={img.alt || `${c.zoneName} card, ${img.side}`}
                        className="w-full h-auto rounded-[8px] border border-line"
                      />
                      <figcaption className="flex items-center justify-between gap-2">
                        <span className="text-[11.5px] text-muted capitalize">
                          {img.side}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeImage(c.slug, img.id)}
                          className="text-[11.5px] font-semibold text-danger hover:underline"
                        >
                          Remove
                        </button>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {message && (
        <p className="text-[13px] font-semibold text-body">{message}</p>
      )}
    </div>
  );
}
