"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLACE_KINDS, type Place, type PlaceKind } from "@/lib/places-types";

/**
 * The region, its markets, and everything under them.
 *
 * Rendered as an indented list rather than a real tree widget: there are
 * three levels and a few dozen rows, and a place's parent is a dropdown
 * on the row itself, so dragging would be a lot of machinery for
 * something a select box already does exactly.
 *
 * Slugs show but never change. Stories and events will record a place by
 * slug, so a rename that moved it would orphan every one of them.
 */
export function AdminPlaces({
  places,
  zones,
  areas,
}: {
  places: Place[];
  zones: { slug: string; name: string }[];
  areas: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<Place>>({});

  const field =
    "w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";
  const label =
    "text-[11px] uppercase tracking-wider text-muted font-semibold";

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      setEditing(null);
      setAdding(false);
      setDraft({});
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  // How deep a row sits, walked from its parents. Cheap at this size and
  // it means the indent always matches the parent dropdown, even for a
  // place whose parent was just changed.
  const depthOf = (p: Place) => {
    const by = new Map(places.map((x) => [x.slug, x]));
    let d = 0;
    let cur = p.parentSlug ? by.get(p.parentSlug) : undefined;
    const seen = new Set<string>([p.slug]);
    while (cur && !seen.has(cur.slug) && d < 5) {
      seen.add(cur.slug);
      d += 1;
      cur = cur.parentSlug ? by.get(cur.parentSlug) : undefined;
    }
    return d;
  };

  // Parent order, so children sit under the parent they belong to rather
  // than in one flat list ordered by number.
  const ordered: Place[] = [];
  const walk = (parentSlug: string | null) => {
    places
      .filter((p) => p.parentSlug === parentSlug)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .forEach((p) => {
        ordered.push(p);
        walk(p.slug);
      });
  };
  walk(null);
  // Anything whose parent is missing would never be reached above, so it
  // is appended rather than silently dropped off the screen.
  for (const p of places) if (!ordered.includes(p)) ordered.push(p);

  const kindChip = (kind: PlaceKind) => {
    const tone =
      kind === "region"
        ? "bg-navy-950 text-white"
        : kind === "market"
          ? "bg-brand-tint text-brand-deep"
          : kind === "zone"
            ? "bg-[#E7F3EC] text-[#1F6B45]"
            : "bg-surface text-muted";
    return (
      <span
        className={`text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${tone}`}
      >
        {PLACE_KINDS.find((k) => k.value === kind)?.label ?? kind}
      </span>
    );
  };

  function Form({
    value,
    onCancel,
    onSave,
    isNew,
  }: {
    value: Partial<Place>;
    onCancel: () => void;
    onSave: () => void;
    isNew: boolean;
  }) {
    return (
      <div className="grid gap-3 p-4 bg-surface border border-line rounded-[10px]">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="grid gap-1.5">
            <span className={label}>Name</span>
            <input
              value={value.name ?? ""}
              onChange={(e) => setDraft({ ...value, name: e.target.value })}
              placeholder="East Cooper"
              className={field}
            />
          </label>
          <label className="grid gap-1.5">
            <span className={label}>What kind of place</span>
            <select
              value={value.kind ?? "neighborhood"}
              onChange={(e) =>
                setDraft({ ...value, kind: e.target.value as PlaceKind })
              }
              className={field}
            >
              {PLACE_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label} &mdash; {k.hint}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className={label}>Sits inside</span>
            <select
              value={value.parentSlug ?? ""}
              onChange={(e) =>
                setDraft({ ...value, parentSlug: e.target.value || null })
              }
              className={field}
            >
              <option value="">Nothing, this is the top</option>
              {places
                .filter((p) => p.slug !== value.slug)
                .map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className={label}>Card that reaches here</span>
            <select
              value={value.mailingZoneSlug ?? ""}
              onChange={(e) =>
                setDraft({ ...value, mailingZoneSlug: e.target.value || null })
              }
              className={field}
            >
              <option value="">Nothing mails here yet</option>
              {zones.map((z) => (
                <option key={z.slug} value={z.slug}>
                  {z.name}
                </option>
              ))}
            </select>
            <span className="text-[12px] text-muted">
              What Reserve a spot buys from this page.
            </span>
          </label>
          <label className="grid gap-1.5">
            <span className={label}>Directory area</span>
            <select
              value={value.directorySlug ?? ""}
              onChange={(e) =>
                setDraft({ ...value, directorySlug: e.target.value || null })
              }
              className={field}
            >
              <option value="">Not linked to one</option>
              {areas.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.name}
                </option>
              ))}
            </select>
            <span className="text-[12px] text-muted">
              Which listings belong to this place.
            </span>
          </label>
          <label className="grid gap-1.5">
            <span className={label}>Showing on the site</span>
            <select
              value={value.active === false ? "no" : "yes"}
              onChange={(e) =>
                setDraft({ ...value, active: e.target.value === "yes" })
              }
              className={field}
            >
              <option value="yes">Showing</option>
              <option value="no">Hidden</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1.5">
          <span className={label}>Blurb</span>
          <textarea
            value={value.blurb ?? ""}
            onChange={(e) => setDraft({ ...value, blurb: e.target.value })}
            rows={2}
            placeholder="One line for the top of this place's page."
            className={field}
          />
        </label>
        <div className="flex gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="text-[13px] font-semibold px-4 py-2 rounded-[9px] bg-navy-950 text-white disabled:opacity-50"
          >
            {isNew ? "Add place" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-[13px] font-semibold px-4 py-2 rounded-[9px] border border-line-strong bg-white"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {error && (
        <p className="text-[13px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      {adding ? (
        <Form
          value={draft}
          isNew
          onCancel={() => {
            setAdding(false);
            setDraft({});
          }}
          onSave={() => send({ action: "create", ...draft })}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setEditing(null);
            setDraft({ kind: "neighborhood", active: true });
          }}
          className="justify-self-start text-[13px] font-semibold px-4 py-2 rounded-[9px] bg-navy-950 text-white"
        >
          Add a place
        </button>
      )}

      <div className="border border-line rounded-(--radius-card) bg-white overflow-hidden">
        {ordered.map((p) => (
          <div key={p.id} className="border-b border-line last:border-b-0">
            <div
              className="px-4 py-3 flex items-center gap-3 flex-wrap"
              style={{ paddingLeft: 16 + depthOf(p) * 22 }}
            >
              <span
                className={`text-[14.5px] font-semibold ${
                  p.active ? "" : "text-muted line-through"
                }`}
              >
                {p.name}
              </span>
              {kindChip(p.kind)}
              <span className="text-[12px] text-muted num">/{p.slug}</span>
              {p.mailingZoneSlug ? (
                <span className="text-[12px] text-muted">
                  mails on {zones.find((z) => z.slug === p.mailingZoneSlug)?.name ?? p.mailingZoneSlug}
                </span>
              ) : (
                <span className="text-[12px] text-muted">not mailing yet</span>
              )}

              <span className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => send({ action: "move", id: p.id, direction: "up" })}
                  aria-label={`Move ${p.name} up`}
                  className="text-[13px] px-2 py-1 rounded border border-line-strong bg-white disabled:opacity-50"
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => send({ action: "move", id: p.id, direction: "down" })}
                  aria-label={`Move ${p.name} down`}
                  className="text-[13px] px-2 py-1 rounded border border-line-strong bg-white disabled:opacity-50"
                >
                  &darr;
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    send({ action: "active", id: p.id, active: !p.active })
                  }
                  className="text-[13px] px-2.5 py-1 rounded border border-line-strong bg-white disabled:opacity-50"
                >
                  {p.active ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setEditing(editing === p.id ? null : p.id);
                    setDraft(p);
                  }}
                  className="text-[13px] px-2.5 py-1 rounded border border-line-strong bg-white"
                >
                  {editing === p.id ? "Close" : "Edit"}
                </button>
              </span>
            </div>

            {editing === p.id && (
              <div className="px-4 pb-4">
                <Form
                  value={draft}
                  isNew={false}
                  onCancel={() => {
                    setEditing(null);
                    setDraft({});
                  }}
                  onSave={() => send({ action: "update", id: p.id, ...draft })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
