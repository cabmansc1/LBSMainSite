"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AD_SLOTS,
  AD_SLOT_BY_ID,
  type AdSlotId,
  type AdWithStats,
  type AdsenseConfig,
} from "@/lib/ads-types";

/**
 * The four ad positions, and what is in them.
 *
 * Organised by slot rather than as one flat list of creatives, because
 * the question being asked here is "is this position sold", not "how many
 * ads do we have". A slot with nothing in it says so, and says what
 * happens instead.
 */

type Option = { name: string; slug: string };

const STATE_LABEL: Record<AdWithStats["state"], string> = {
  running: "Running",
  paused: "Paused",
  scheduled: "Scheduled",
  finished: "Finished",
};

const STATE_STYLE: Record<AdWithStats["state"], string> = {
  running: "bg-[#e7f6ec] text-[#0d7a3c] border-[#bfe5cd]",
  paused: "bg-surface text-muted border-line-strong",
  scheduled: "bg-brand-tint text-brand-deep border-[#bfe2f8]",
  finished: "bg-surface text-faint border-line",
};

const blank = (slot: AdSlotId) => ({
  id: 0,
  slot,
  name: "",
  alt: "",
  clickUrl: "",
  categories: [] as string[],
  locations: [] as string[],
  startsOn: "",
  endsOn: "",
  active: true,
});

type Draft = ReturnType<typeof blank>;

export function AdminAds({
  ads,
  adsense,
  categories,
  locations,
}: {
  ads: AdWithStats[];
  adsense: AdsenseConfig;
  categories: Option[];
  locations: Option[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [google, setGoogle] = useState<AdsenseConfig>(adsense);
  const [googleSaved, setGoogleSaved] = useState(false);

  const field =
    "w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      if (draft.id) form.set("id", String(draft.id));
      form.set("slot", draft.slot);
      form.set("name", draft.name);
      form.set("alt", draft.alt);
      form.set("clickUrl", draft.clickUrl);
      form.set("categories", draft.categories.join(","));
      form.set("locations", draft.locations.join(","));
      form.set("startsOn", draft.startsOn);
      form.set("endsOn", draft.endsOn);
      form.set("active", String(draft.active));
      const file = fileRef.current?.files?.[0];
      if (file) form.set("file", file);

      const res = await fetch("/api/admin/ads", { method: "POST", body: form });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      setDraft(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(ad: AdWithStats) {
    await fetch("/api/admin/ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ad.id, active: !ad.active }),
    });
    router.refresh();
  }

  async function remove(ad: AdWithStats) {
    if (!confirm(`Delete "${ad.name}"? Its impression and click counts go too.`)) {
      return;
    }
    await fetch(`/api/admin/ads?id=${ad.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function saveGoogle() {
    setBusy(true);
    setError("");
    setGoogleSaved(false);
    try {
      const res = await fetch("/api/admin/ads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adsense: google }),
      });
      if (!res.ok) throw new Error("That did not save.");
      setGoogleSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  function toggleIn(list: string[], slug: string): string[] {
    return list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  }

  return (
    <div className="grid gap-5">
      {error && (
        <p className="text-[13px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      {AD_SLOTS.map((spec) => {
        const inSlot = ads.filter((a) => a.slot === spec.id);
        const live = inSlot.filter((a) => a.state === "running");
        const googleUnit = google.units[spec.id];
        return (
          <section
            key={spec.id}
            className="border border-line rounded-(--radius-card) bg-white overflow-hidden"
          >
            <div className="flex items-start gap-4 flex-wrap px-5 py-4 border-b border-line bg-surface">
              <div className="min-w-0">
                <b className="text-[15px] block">{spec.label}</b>
                <span className="text-[12.5px] text-muted num">
                  {spec.width} &times; {spec.height}
                  {spec.mobile
                    ? ` · ${spec.mobile.width} × ${spec.mobile.height} on mobile`
                    : ""}
                </span>
                <p className="text-[12.5px] text-muted mt-1 max-w-[62ch]">
                  {spec.where}
                </p>
              </div>
              <div className="ml-auto text-right">
                <span className="text-[13px] font-semibold">
                  {live.length > 0
                    ? `${live.length} running`
                    : google.enabled && googleUnit
                      ? "Google fills it"
                      : "Empty"}
                </span>
                {live.length === 0 && !(google.enabled && googleUnit) && (
                  <span className="block text-[12px] text-muted">
                    Nothing renders on the page
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraft(blank(spec.id));
                  setError("");
                }}
                className="w-full sm:w-auto text-[13px] font-bold px-3.5 py-2 rounded-[9px] bg-navy-950 text-white"
              >
                Add an ad
              </button>
            </div>

            {inSlot.length === 0 ? (
              <p className="px-5 py-5 text-[13px] text-muted">
                Nothing here yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {inSlot.map((ad) => (
                  <li key={ad.id} className="px-5 py-4 flex gap-4 items-start flex-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/ad-image/${ad.id}`}
                      alt=""
                      className="w-[104px] h-[70px] object-contain bg-surface border border-line rounded-[8px] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <b className="text-[14px]">{ad.name}</b>
                        <span
                          className={`text-[10.5px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${STATE_STYLE[ad.state]}`}
                        >
                          {STATE_LABEL[ad.state]}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-muted break-all">
                        {ad.clickUrl || "No link"}
                      </p>
                      <p className="text-[12.5px] text-muted mt-0.5">
                        {ad.startsOn || ad.endsOn
                          ? `${ad.startsOn || "any time"} to ${ad.endsOn || "no end"}`
                          : "No date limit"}
                        {" · "}
                        {ad.categories.length === 0 && ad.locations.length === 0
                          ? "Every listing"
                          : [
                              ad.categories.length > 0
                                ? `${ad.categories.length} categories`
                                : "",
                              ad.locations.length > 0
                                ? `${ad.locations.length} locations`
                                : "",
                            ]
                              .filter(Boolean)
                              .join(", ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[13px] font-semibold num">
                        {ad.impressions.toLocaleString("en-US")} seen
                      </span>
                      <span className="block text-[12.5px] text-muted num">
                        {ad.clicks.toLocaleString("en-US")} clicked
                        {ad.impressions > 0 &&
                          ` · ${((ad.clicks / ad.impressions) * 100).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...ad,
                            startsOn: ad.startsOn ?? "",
                            endsOn: ad.endsOn ?? "",
                          })
                        }
                        className="text-[12.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-line-strong"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(ad)}
                        className="text-[12.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-line-strong"
                      >
                        {ad.active ? "Pause" : "Resume"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(ad)}
                        className="text-[12.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-line-strong text-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {/* Google, for the slots nobody has bought. */}
      <section className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3.5">
        <div>
          <b className="text-[15px]">Google AdSense</b>
          <p className="text-[12.5px] text-muted mt-1 max-w-[72ch]">
            Used only where no sponsor is running. A slot with no unit id here
            and nothing sold stays empty rather than showing a placeholder.
          </p>
        </div>

        <label className="flex items-center gap-2 text-[13.5px]">
          <input
            type="checkbox"
            checked={google.enabled}
            onChange={(e) => setGoogle({ ...google, enabled: e.target.checked })}
          />
          Let Google fill unsold slots
        </label>

        <label className="grid gap-1.5 max-w-[340px]">
          <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            Publisher id
          </span>
          <input
            value={google.client}
            onChange={(e) => setGoogle({ ...google, client: e.target.value })}
            placeholder="ca-pub-0000000000000000"
            className={`${field} num`}
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          {AD_SLOTS.map((spec) => (
            <label key={spec.id} className="grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                {spec.label} unit id
              </span>
              <input
                value={google.units[spec.id] ?? ""}
                onChange={(e) =>
                  setGoogle({
                    ...google,
                    units: { ...google.units, [spec.id]: e.target.value },
                  })
                }
                placeholder="Leave empty to keep it unsold"
                className={`${field} num`}
              />
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={saveGoogle}
            className="text-[13px] font-bold px-4 py-2.5 rounded-[9px] bg-navy-950 text-white disabled:opacity-40"
          >
            Save Google settings
          </button>
          {googleSaved && (
            <span className="text-[13px] text-[#0d7a3c] font-semibold">Saved</span>
          )}
        </div>
      </section>

      {draft && (
        <div className="fixed inset-0 z-50 bg-navy-950/50 p-4 overflow-y-auto">
          <div className="mx-auto max-w-[620px] bg-white rounded-(--radius-card) p-6 grid gap-3.5">
            <b className="text-[16px]">
              {draft.id ? "Edit ad" : "New ad"} ·{" "}
              {AD_SLOT_BY_ID.get(draft.slot)?.label}
            </b>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="grid gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                  Name it for yourself
                </span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Trane summer HVAC"
                  className={field}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                  Slot
                </span>
                <select
                  value={draft.slot}
                  onChange={(e) =>
                    setDraft({ ...draft, slot: e.target.value as AdSlotId })
                  }
                  className={field}
                >
                  {AD_SLOTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.width}&times;{s.height})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                Where it goes when clicked
              </span>
              <input
                value={draft.clickUrl}
                onChange={(e) => setDraft({ ...draft, clickUrl: e.target.value })}
                placeholder="https://example.com/summer-offer"
                className={field}
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                What the ad says, for screen readers
              </span>
              <input
                value={draft.alt}
                onChange={(e) => setDraft({ ...draft, alt: e.target.value })}
                placeholder="Trane: seasonal HVAC maintenance from your local specialist"
                className={field}
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                Artwork {draft.id ? "(leave empty to keep the current one)" : ""}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="text-[13px]"
              />
              <span className="text-[12px] text-muted">
                Supply it at {AD_SLOT_BY_ID.get(draft.slot)?.width}&times;
                {AD_SLOT_BY_ID.get(draft.slot)?.height} or twice that. It is
                scaled to fit and never cropped.
              </span>
            </label>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="grid gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                  Starts
                </span>
                <input
                  type="date"
                  value={draft.startsOn}
                  onChange={(e) => setDraft({ ...draft, startsOn: e.target.value })}
                  className={field}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                  Ends
                </span>
                <input
                  type="date"
                  value={draft.endsOn}
                  onChange={(e) => setDraft({ ...draft, endsOn: e.target.value })}
                  className={field}
                />
              </label>
            </div>

            <div className="grid gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                Only on these categories
              </span>
              <p className="text-[12px] text-muted -mt-1">
                Pick none to run everywhere. This is how a Summerville roofer
                stays off a Mount Pleasant restaurant.
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-[132px] overflow-y-auto">
                {categories.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        categories: toggleIn(draft.categories, c.slug),
                      })
                    }
                    className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border ${
                      draft.categories.includes(c.slug)
                        ? "bg-navy-950 text-white border-navy-950"
                        : "bg-white text-body border-line-strong"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                Only in these locations
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-[132px] overflow-y-auto">
                {locations.map((l) => (
                  <button
                    key={l.slug}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        locations: toggleIn(draft.locations, l.slug),
                      })
                    }
                    className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border ${
                      draft.locations.includes(l.slug)
                        ? "bg-navy-950 text-white border-navy-950"
                        : "bg-white text-body border-line-strong"
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-[13.5px]">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              Run it
            </label>

            {error && (
              <p className="text-[13px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            <div className="flex gap-2.5 justify-end pt-1">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="text-[13px] font-bold px-4 py-2.5 rounded-[9px] border border-line-strong"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={save}
                className="text-[13px] font-bold px-4 py-2.5 rounded-[9px] bg-cta text-navy-950 disabled:opacity-40"
              >
                {busy ? "Saving" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
