"use client";

import { useRef, useState } from "react";
import type { PastCard } from "@/lib/past-cards";
import { groupIntoEditions } from "@/lib/card-editions";

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
  const [query, setQuery] = useState("");
  // Nothing is open until somebody chooses to edit it. Opening every
  // panel by default is what made this page a wall in the first place.
  const [open, setOpen] = useState<Set<string>>(new Set());

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

  const drafts = rows.filter((r) => !r.published).length;
  const q = query.trim().toLowerCase();
  // "draft" is a search term rather than a separate filter control,
  // because the unpublished ones are what you come here to finish and
  // typing it is the same gesture as looking for a neighborhood.
  const visible =
    q === ""
      ? rows
      : q === "draft"
        ? rows.filter((r) => !r.published)
        : rows.filter((r) =>
            [r.zoneName, r.cardName ?? "", r.mailMonth, r.slug]
              .join(" ")
              .toLowerCase()
              .includes(q),
          );

  const editions = groupIntoEditions(visible);
  const zones = [
    ...new Map(
      editions.map((e) => [e.zoneSlug, { slug: e.zoneSlug, name: e.zoneName }]),
    ).values(),
  ].map((z) => ({
    ...z,
    editions: editions.filter((e) => e.zoneSlug === z.slug),
  }));

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

      {/* Search, then zone, then edition, then issue.
          Nineteen cards as a stack of full-height panels is a lot of
          scrolling, and forty is unusable. Rows collapse to one line and
          open only when you are editing one, which is the actual task:
          this page is for uploading a card, not for browsing them. */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by neighborhood, card name, or month"
          className="flex-1 min-w-[280px] text-sm px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
        />
        <span className="text-[12.5px] text-muted num">
          {visible.length} of {rows.length}
        </span>
        {drafts > 0 && (
          <button
            type="button"
            onClick={() => setQuery(query === "draft" ? "" : "draft")}
            className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-[8px] border ${
              query === "draft"
                ? "border-navy-950 bg-navy-950 text-white"
                : "border-line-strong hover:border-faint"
            }`}
          >
            {drafts} unpublished
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-8 text-center">
          No cards in the archive yet. Add one above.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-8 text-center">
          Nothing matches that search.
        </p>
      ) : (
        <div className="grid gap-9">
          {zones.map((z) => (
            <section key={z.slug}>
              <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mb-3">
                {z.name}
              </h2>
              <div className="grid gap-5">
                {z.editions.map((e) => (
                  <div key={e.key}>
                    <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                      <b className="text-[14px] font-semibold tracking-tight">
                        {e.name}
                      </b>
                      <span className="text-[12px] text-muted num">
                        {e.issues.length}{" "}
                        {e.issues.length === 1 ? "mailing" : "mailings"}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {e.issues.map((c) => {
                        const isOpen = open.has(c.slug);
                        const cover =
                          c.images.find((i) => i.side === "front") ?? c.images[0];
                        return (
                          <div
                            key={c.slug}
                            className="border border-line rounded-(--radius-card) bg-white overflow-hidden"
                          >
                            <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                              {cover ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={`/api/card-image/${cover.id}`}
                                  alt=""
                                  className="w-12 h-8 object-cover rounded-[4px] border border-line shrink-0"
                                />
                              ) : (
                                <span className="w-12 h-8 rounded-[4px] border border-dashed border-line-strong shrink-0" />
                              )}
                              <span className="min-w-[120px]">
                                <b className="block text-[14px] font-semibold">
                                  {c.mailMonth}
                                </b>
                                <span className="text-[11.5px] text-muted num">
                                  {c.images.length}{" "}
                                  {c.images.length === 1 ? "image" : "images"}
                                </span>
                              </span>
                              <span
                                className={`text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  c.published
                                    ? "text-ok border-[#bfe8d2] bg-[#e5f5ec]"
                                    : "text-muted border-line bg-surface"
                                }`}
                              >
                                {c.published ? "Live" : "Draft"}
                              </span>
                              <span className="ml-auto flex gap-2 items-center">
                                <button
                                  type="button"
                                  onClick={() => save(c, { published: !c.published })}
                                  disabled={
                                    busy === c.slug ||
                                    (!c.published && c.images.length === 0)
                                  }
                                  title={
                                    !c.published && c.images.length === 0
                                      ? "Upload at least one image first"
                                      : undefined
                                  }
                                  className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[8px] border border-line-strong hover:border-faint disabled:opacity-40"
                                >
                                  {c.published ? "Unpublish" : "Publish"}
                                </button>
                                <button
                                  type="button"
                                  aria-expanded={isOpen}
                                  onClick={() =>
                                    setOpen((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(c.slug)) next.delete(c.slug);
                                      else next.add(c.slug);
                                      return next;
                                    })
                                  }
                                  className="text-[12.5px] font-semibold text-brand-deep hover:underline"
                                >
                                  {isOpen ? "Close" : "Edit"}
                                </button>
                              </span>
                            </div>

                            {isOpen && (
                              <div className="border-t border-line p-5 grid gap-4">
                                <p className="text-[12px] text-muted num">
                                  /cards/{c.slug}
                                </p>
            <div className="grid sm:grid-cols-[1fr_1fr] gap-3">
              <div>
                <label
                  htmlFor={`name-${c.slug}`}
                  className="text-[11px] uppercase tracking-wider text-muted font-semibold block mb-1.5"
                >
                  Public name
                </label>
                <input
                  id={`name-${c.slug}`}
                  defaultValue={c.cardName ?? ""}
                  maxLength={120}
                  onBlur={(e) => {
                    if (e.target.value !== (c.cardName ?? "")) {
                      save(c, { cardName: e.target.value || undefined });
                    }
                  }}
                  placeholder={c.zoneName}
                  className="w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
                />
                <p className="text-[11.5px] text-muted mt-1">
                  Shown as the page heading. Mission Control names cards for
                  the print run, which rarely reads well to a buyer.
                </p>
              </div>
              <div className="grid content-start">
                <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block mb-1.5">
                  Coverage
                </span>
                <p className="text-[12.5px] text-muted">
                  ZIPs and address counts come from the route table in this
                  card&rsquo;s Mission Control notes. Paste the USPS route rows
                  there and they appear on the page.
                </p>
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
              <div className="flex gap-2 flex-wrap items-start">
                {(
                  [
                    { side: "front", label: "Front", hint: "the ad side" },
                    { side: "back", label: "Back", hint: "postage side" },
                    {
                      side: "detail",
                      label: "Close-up",
                      hint: "one ad, printed size",
                    },
                  ] as const
                ).map(({ side, label, hint }) => (
                  <div key={side} className="grid gap-1 justify-items-center">
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
                      className="text-[13px] font-semibold px-3.5 py-2 rounded-[10px] border border-line-strong hover:border-faint disabled:opacity-40 w-full"
                    >
                      Upload {label}
                    </button>
                    <span className="text-[11px] text-muted">{hint}</span>
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
                        <span className="text-[11.5px] text-muted">
                          {img.side === "detail" ? "Close-up" : img.side === "back" ? "Back" : "Front"}
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {message && (
        <p className="text-[13px] font-semibold text-body">{message}</p>
      )}
    </div>
  );
}
