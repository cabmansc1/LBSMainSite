"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/events-types";

type Probe = {
  resolvedUrl: string;
  kind: "ical" | "tribe";
  how: string;
  found: number;
  upcoming: number;
  meetings: number;
  sample: { title: string; when: string; venue: string; externalId: string }[];
};

/**
 * Trying a website to see whether it publishes anything readable.
 *
 * Adding a source used to mean me finding the feed, so every new venue
 * was a round trip. Most sites do publish one — an iCal link in the
 * head, or a REST endpoint a directory up from the page a person would
 * paste — it is just never at the address anybody would guess. This
 * tries the likely places and says which one answered, so the next
 * site is easier to guess than the last.
 *
 * Looking and keeping are separate presses. Reading a stranger's
 * calendar into the queue is quick to do and tedious to undo.
 */
export function EventFeedProbe({
  places,
}: {
  places: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [probe, setProbe] = useState<Probe | null>(null);
  const [placeSlug, setPlaceSlug] = useState("");
  const [category, setCategory] = useState<EventCategory>("community");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const field =
    "text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";

  async function look() {
    setBusy("look");
    setError("");
    setDone("");
    setProbe(null);
    try {
      const res = await fetch("/api/admin/events/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not work.");
      setProbe(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy("");
    }
  }

  async function keep() {
    if (!probe) return;
    setBusy("keep");
    setError("");
    try {
      const res = await fetch("/api/admin/events/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          resolvedUrl: probe.resolvedUrl,
          kind: probe.kind,
          placeSlug,
          category,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not work.");
      const r = j.report ?? {};
      setDone(
        `${r.added ?? 0} added, ${r.updated ?? 0} refreshed. They are waiting below.`,
      );
      setProbe(null);
      setUrl("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="border border-line rounded-(--radius-card) bg-white p-5 mb-4">
      <b className="text-[14.5px]">Try a website</b>
      <p className="text-[13px] text-muted mt-1 max-w-[68ch]">
        Paste a venue&rsquo;s events page and this will look for something it
        can read — most sites publish one without saying so. It only looks
        until you tell it otherwise.
      </p>

      <div className="mt-3 flex gap-2.5 flex-wrap">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim() && !busy) void look();
          }}
          placeholder="https://charlestonmusichall.com/events"
          className={`${field} flex-1 min-w-[260px]`}
          aria-label="Events page address"
        />
        <button
          type="button"
          onClick={look}
          disabled={!url.trim() || busy !== ""}
          className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-line-strong bg-white disabled:opacity-50"
        >
          {busy === "look" ? "Looking" : "Have a look"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-[13px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-3.5 py-2 max-w-[68ch]">
          {error}
        </p>
      )}

      {done && (
        <p className="mt-3 text-[13px] text-brand-deep bg-brand-tint border border-line rounded-lg px-3.5 py-2">
          {done}
        </p>
      )}

      {probe && (
        <div className="mt-4 border border-line rounded-[10px] bg-surface p-4">
          <p className="text-[13.5px]">
            <b>
              {probe.upcoming - probe.meetings} coming up
              {probe.meetings > 0 &&
                `, and ${probe.meetings} that look like council business`}
              .
            </b>{" "}
            <span className="text-muted">
              Found through {probe.how}.
            </span>
          </p>
          <p className="text-[12px] text-muted mt-1 break-all num">
            {probe.resolvedUrl}
          </p>

          {probe.sample.length > 0 && (
            <ul className="mt-3 grid gap-1">
              {probe.sample.map((s) => (
                <li key={s.externalId} className="text-[13px]">
                  <b>{s.title}</b>{" "}
                  <span className="text-muted num">
                    {s.when}
                    {s.venue && ` · ${s.venue}`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {probe.upcoming - probe.meetings > 0 ? (
            <div className="mt-4 flex items-end gap-2.5 flex-wrap">
              <label className="grid gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                  Which part of town
                </span>
                <select
                  value={placeSlug}
                  onChange={(e) => setPlaceSlug(e.target.value)}
                  className={field}
                >
                  <option value="">Pick one</option>
                  {places.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                  Treat them as
                </span>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as EventCategory)
                  }
                  className={field}
                >
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={keep}
                disabled={!placeSlug || busy !== ""}
                className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-navy-950 text-white disabled:opacity-50"
              >
                {busy === "keep" ? "Bringing in" : "Bring these in"}
              </button>
              <span className="text-[12px] text-muted">
                They arrive pending, like everything else.
              </span>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-muted">
              Nothing here worth bringing in — it is all meetings, or all in
              the past.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
