"use client";

import { useRef, useState } from "react";
import {
  EVENT_CATEGORIES,
  formatPrice,
  type EventCategory,
} from "@/lib/events-types";

/**
 * Putting an event forward.
 *
 * Short on purpose. Every field beyond the handful that are genuinely
 * needed is another reason to give up half way, and anything missing
 * can be asked for by replying to the address they leave. Nothing here
 * publishes: it lands in a queue and somebody reads it.
 */
export function EventSubmitForm({
  places,
}: {
  places: { value: string; label: string }[];
}) {
  const [form, setForm] = useState({
    title: "",
    startsAt: "",
    endsAt: "",
    allDay: false,
    venueName: "",
    address: "",
    placeSlug: "",
    category: "community" as EventCategory,
    summary: "",
    url: "",
    priceText: "",
    email: "",
    website: "", // honeypot
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [picture, setPicture] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function choose(f: File | null) {
    setPicture(f);
    // Revoked on replace so a run of picked-then-changed files does not
    // hold every one of them in memory for the life of the page.
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : "";
    });
  }

  const field =
    "w-full text-[14px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";
  const label = "text-[12px] font-semibold text-ink";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // Form data rather than JSON, because of the picture. The browser
      // sets its own content type with the boundary; setting one here
      // by hand is what breaks multipart uploads.
      const payload = new FormData();
      for (const [k, v] of Object.entries(form)) {
        payload.append(k, typeof v === "boolean" ? String(v) : v);
      }
      if (picture) payload.append("image", picture);

      const res = await fetch("/api/events", {
        method: "POST",
        body: payload,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not send.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not send.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="border border-line rounded-(--radius-card) bg-surface p-6">
        <h2 className="text-[19px] font-bold tracking-tight">Got it, thank you</h2>
        <p className="mt-2 text-[14.5px] text-body leading-relaxed max-w-[52ch]">
          We read everything that comes in and put up what looks useful to
          people around here. If we need anything else we will reply to the
          address you left.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {error && (
        <p className="text-[13.5px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      <label className="grid gap-1.5">
        <span className={label}>What is it called</span>
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Summerville Farmers Market"
          className={field}
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="grid gap-1.5">
          <span className={label}>Starts</span>
          <input
            required
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            className={field}
          />
        </label>
        <label className="grid gap-1.5">
          <span className={label}>Ends, if it matters</span>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            className={field}
          />
        </label>
      </div>

      <label className="flex items-center gap-2.5 text-[13.5px]">
        <input
          type="checkbox"
          checked={form.allDay}
          onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
        />
        It runs all day
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="grid gap-1.5">
          <span className={label}>Where</span>
          <input
            value={form.venueName}
            onChange={(e) => setForm({ ...form, venueName: e.target.value })}
            placeholder="Hutchinson Square"
            className={field}
          />
        </label>
        <label className="grid gap-1.5">
          <span className={label}>Which part of town</span>
          <select
            value={form.placeSlug}
            onChange={(e) => setForm({ ...form, placeSlug: e.target.value })}
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
      </div>

      <label className="grid gap-1.5">
        <span className={label}>Address</span>
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className={field}
        />
      </label>

      <label className="grid gap-1.5">
        <span className={label}>What kind of thing is it</span>
        <select
          value={form.category}
          onChange={(e) =>
            setForm({ ...form, category: e.target.value as EventCategory })
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

      <label className="grid gap-1.5">
        <span className={label}>Tell people what to expect</span>
        <textarea
          value={form.summary}
          rows={3}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          placeholder="A couple of sentences is plenty."
          className={field}
        />
      </label>

      {/*
        A picture, which is the difference between a line in a list and
        something anybody clicks. Optional on purpose: asking for one
        before the event is even in loses the events of people who are
        filling this in on a phone in a car park.
      */}
      <div className="grid gap-1.5">
        <span className={label}>A picture, if you have one</span>
        <div className="flex items-center gap-3.5 flex-wrap">
          {preview && (
            // Not next/image: this is a local blob that exists for the
            // life of the tab and has no business going through the
            // image optimiser.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="w-[84px] h-[84px] object-cover rounded-[10px] border border-line"
            />
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
            className="text-[13px] file:text-[13px] file:font-semibold file:mr-3 file:px-3.5 file:py-2 file:rounded-[9px] file:border file:border-line-strong file:bg-white"
          />
          {picture && (
            <button
              type="button"
              onClick={() => {
                choose(null);
                if (fileInput.current) fileInput.current.value = "";
              }}
              className="text-[13px] font-semibold text-muted underline"
            >
              Remove
            </button>
          )}
        </div>
        <span className="text-[12px] text-muted">
          A poster or a photograph from last year. Up to 8MB.
        </span>
      </div>

      <label className="grid gap-1.5">
        <span className={label}>What does it cost</span>
        <input
          value={form.priceText}
          onChange={(e) => setForm({ ...form, priceText: e.target.value })}
          placeholder="Free, or 10, or 15 at the door"
          className={field}
        />
        {formatPrice(form.priceText) &&
          formatPrice(form.priceText) !== form.priceText.trim() && (
            <span className="text-[12px] text-muted">
              Will show as <b>{formatPrice(form.priceText)}</b>
            </span>
          )}
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="grid gap-1.5">
          <span className={label}>A link with more detail</span>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://"
            className={field}
          />
        </label>
        <label className="grid gap-1.5">
          <span className={label}>Your email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={field}
          />
          <span className="text-[12px] text-muted">
            Only so we can ask if something is unclear. It is not published.
          </span>
        </label>
      </div>

      {/* Not shown to anybody, and never filled in by a person. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.website}
        onChange={(e) => setForm({ ...form, website: e.target.value })}
        className="hidden"
      />

      <div>
        <button
          type="submit"
          disabled={busy}
          className="text-[14px] font-semibold px-5 py-2.5 rounded-[10px] bg-navy-950 text-white disabled:opacity-50"
        >
          {busy ? "Sending" : "Send it in"}
        </button>
      </div>
    </form>
  );
}
