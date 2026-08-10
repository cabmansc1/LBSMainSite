"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { RichEditor } from "@/components/rich-editor";
import { MediaPicker } from "@/components/media-picker";
import {
  EVENT_CATEGORIES,
  formatPrice,
  type EventCategory,
  type EventStatus,
  type LocalEvent,
} from "@/lib/events-types";

type PickList = { value: string; label: string }[];

/** Datetime-local wants "YYYY-MM-DDTHH:mm" and nothing else. */
const forInput = (iso: string) => (iso ? iso.slice(0, 16) : "");

/** The form as it arrives, so a skip can tell whether anything changed. */
function initialForm(event: LocalEvent | null) {
  return {
    title: event?.title ?? "",
    summary: event?.summary ?? "",
    bodyHtml: event?.bodyHtml ?? "",
    heroMediaId: event?.heroMediaId ?? null,
    startsAt: forInput(event?.startsAt ?? ""),
    endsAt: forInput(event?.endsAt ?? ""),
    allDay: event?.allDay ?? false,
    venueName: event?.venueName ?? "",
    address: event?.address ?? "",
    placeSlug: event?.placeSlug ?? "",
    businessId: event?.businessId ?? null,
    category: (event?.category ?? "community") as EventCategory,
    url: event?.url ?? "",
    ticketUrl: event?.ticketUrl ?? "",
    priceText: event?.priceText ?? "",
    status: (event?.status ?? "pending") as EventStatus,
    featured: event?.featured ?? false,
  };
}

/**
 * One event.
 *
 * A submitted one arrives here pending, with whoever sent it named at
 * the top, so approving is reading it and pressing Publish rather than
 * retyping it.
 */
export function AdminEventEditor({
  event,
  places,
  businesses,
  nextPendingId = null,
  nextPendingTitle = "",
}: {
  event: LocalEvent | null;
  places: PickList;
  businesses: PickList;
  /** The next one waiting to be read, so reviewing is a run. */
  nextPendingId?: number | null;
  nextPendingTitle?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => initialForm(event));
  const [weeks, setWeeks] = useState(4);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);

  /**
   * Whether anything has been touched.
   *
   * Skipping is meant to cost nothing, so it must not quietly throw
   * away a corrected venue on the way past. Compared against the form
   * as it arrived rather than tracked with a flag per field.
   */
  const dirty =
    JSON.stringify(form) !== JSON.stringify(initialForm(event));

  function skip() {
    if (dirty && !confirmSkip) {
      setConfirmSkip(true);
      return;
    }
    router.push(
      nextPendingId ? `/admin/events/${nextPendingId}` : "/admin/events",
    );
  }

  const [pickingHero, setPickingHero] = useState(false);

  const field =
    "w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";
  const label = "text-[11px] uppercase tracking-wider text-muted font-semibold";

  async function send(
    extra: Record<string, unknown>,
    tag: string,
    then?: "list" | "next",
  ) {
    setBusy(tag);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event?.id,
          slug: event?.slug,
          ...form,
          ...extra,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      if (extra.action === "delete") {
        router.push("/admin/events");
        return;
      }
      if (extra.action === "repeat") {
        setNote(
          `Made ${j.made} more, one a week. Each is a normal event you can edit or cancel on its own.`,
        );
        router.refresh();
        return;
      }
      if (then === "list") {
        router.push("/admin/events");
        return;
      }
      if (then === "next") {
        // Back to the list when the queue runs out, which is the honest
        // end of a review run rather than a dead "next" that does
        // nothing.
        router.push(
          nextPendingId ? `/admin/events/${nextPendingId}` : "/admin/events",
        );
        return;
      }
      setNote("Saved.");
      if (!event && j.id) router.replace(`/admin/events/${j.id}`);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid gap-5">
      <MediaPicker
        open={pickingHero}
        onClose={() => setPickingHero(false)}
        heading="Picture for this event"
        onPick={({ id }) => setForm((f) => ({ ...f, heroMediaId: id }))}
      />

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
      {event?.source === "submitted" && (
        <p className="text-[13px] text-[#7a4a00] bg-cta-tint border border-[#f3ddbb] rounded-lg px-4 py-2.5">
          Sent in by {event.submittedEmail || "somebody"} through the public
          form. Read it, tidy it up, then publish.
        </p>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className={label}>What it is called</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={`${field} text-[16px] font-semibold`}
            />
          </label>

          <label className="grid gap-1.5">
            <span className={label}>The short version</span>
            <textarea
              value={form.summary}
              rows={2}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="One or two sentences, shown on the calendar."
              className={field}
            />
          </label>

          <div className="grid gap-1.5">
            <span className={label}>The longer version, if there is one</span>
            <RichEditor
              value={form.bodyHtml}
              onChange={(html) => setForm((f) => ({ ...f, bodyHtml: html }))}
              placeholder="Optional. The summary is enough for most things."
            />
          </div>
        </div>

        <div className="grid gap-4 lg:sticky lg:top-6">
          <div className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-3">
            <b className="text-[14.5px]">When</b>
            <label className="grid gap-1.5">
              <span className={label}>Starts</span>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className={field}
              />
            </label>
            <label className="grid gap-1.5">
              <span className={label}>Ends</span>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className={field}
              />
              <span className="text-[12px] text-muted">
                Set this for anything running more than a day, or it drops off
                the calendar the morning after it opens.
              </span>
            </label>
            <label className="flex items-center gap-2.5 text-[13px]">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
              />
              All day
            </label>
          </div>

          <div className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-3">
            <b className="text-[14.5px]">Where</b>
            <label className="grid gap-1.5">
              <span className={label}>Venue</span>
              <input
                value={form.venueName}
                onChange={(e) =>
                  setForm({ ...form, venueName: e.target.value })
                }
                className={field}
              />
            </label>
            <label className="grid gap-1.5">
              <span className={label}>Address</span>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={field}
              />
            </label>
            <label className="grid gap-1.5">
              <span className={label}>Part of town</span>
              <select
                value={form.placeSlug}
                onChange={(e) =>
                  setForm({ ...form, placeSlug: e.target.value })
                }
                className={field}
              >
                <option value="">Not set</option>
                {places.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <span className="text-[12px] text-muted">
                Puts it on that market&rsquo;s page.
              </span>
            </label>
          </div>

          <div className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-3">
            <b className="text-[14.5px]">Details</b>
            <label className="grid gap-1.5">
              <span className={label}>Kind</span>
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
              <span className={label}>Hosted by</span>
              <select
                value={form.businessId ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    businessId: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className={field}
              >
                <option value="">Nobody in the directory</option>
                {businesses.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
              <span className="text-[12px] text-muted">
                Shows on their listing too.
              </span>
            </label>
            <label className="grid gap-1.5">
              <span className={label}>Cost</span>
              <input
                value={form.priceText}
                onChange={(e) =>
                  setForm({ ...form, priceText: e.target.value })
                }
                placeholder="Free, or 15"
                className={field}
              />
              <span className="text-[12px] text-muted">
                {formatPrice(form.priceText) &&
                formatPrice(form.priceText) !== form.priceText.trim() ? (
                  <>
                    Shows as <b>{formatPrice(form.priceText)}</b>
                  </>
                ) : (
                  "A dollar sign is added for you."
                )}
              </span>
            </label>

            <label className="grid gap-1.5">
              <span className={label}>Picture</span>
              <button
                type="button"
                onClick={() => setPickingHero(true)}
                disabled={busy !== ""}
                className="justify-self-start text-[13px] font-semibold px-3.5 py-2 rounded-[9px] border border-line-strong bg-white hover:border-navy-950 disabled:opacity-50"
              >
                {form.heroMediaId ? "Change picture" : "Choose a picture"}
              </button>
              {form.heroMediaId && (
                <span className="grid gap-1.5">
                  <span className="relative block w-full aspect-[16/9] bg-surface rounded-[8px] overflow-hidden border border-line">
                    <Image
                      src={`/api/media/${form.heroMediaId}`}
                      alt="Picture for this event"
                      fill
                      sizes="320px"
                      className="object-cover"
                    />
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, heroMediaId: null })}
                    className="justify-self-start text-[12.5px] text-muted"
                  >
                    Remove picture
                  </button>
                </span>
              )}
            </label>
            <label className="grid gap-1.5">
              <span className={label}>More details link</span>
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://"
                className={field}
              />
            </label>
            <label className="grid gap-1.5">
              <span className={label}>Tickets link</span>
              <input
                value={form.ticketUrl}
                onChange={(e) =>
                  setForm({ ...form, ticketUrl: e.target.value })
                }
                placeholder="https://"
                className={field}
              />
            </label>
          </div>

          <div className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-3">
            <b className="text-[14.5px]">Publishing</b>
            <label className="grid gap-1.5">
              <span className={label}>Status</span>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as EventStatus })
                }
                className={field}
              >
                <option value="pending">Waiting to be read</option>
                <option value="published">Published</option>
                <option value="rejected">Turned down</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="flex items-center gap-2.5 text-[13px]">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm({ ...form, featured: e.target.checked })
                }
              />
              Feature it
            </label>
          </div>

          {event && (
            <div className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-3">
              <div>
                <b className="text-[14.5px]">Does it repeat?</b>
                <p className="text-[12px] text-muted mt-0.5">
                  Makes a real copy each week. Every one can be moved or
                  cancelled on its own afterwards.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value))}
                  className={`${field} w-[90px]`}
                />
                <button
                  type="button"
                  disabled={busy !== ""}
                  onClick={() => send({ action: "repeat", weeks }, "repeat")}
                  className="text-[13px] font-semibold px-3.5 py-2.5 rounded-[9px] border border-line-strong bg-white disabled:opacity-50 whitespace-nowrap"
                >
                  {busy === "repeat" ? "Making" : "more weeks"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2.5 flex-wrap items-center border-t border-line pt-4">
        <button
          type="button"
          disabled={busy !== ""}
          onClick={() => send({ action: "save" }, "save")}
          className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-navy-950 text-white disabled:opacity-50"
        >
          {busy === "save" ? "Saving" : "Save"}
        </button>

        {event && form.status !== "published" && (
          <>
            <button
              type="button"
              disabled={busy !== ""}
              onClick={() =>
                send({ action: "save", status: "published" }, "publish", "list")
              }
              className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-cta text-white disabled:opacity-50"
            >
              {busy === "publish" ? "Publishing" : "Publish"}
            </button>

            {/* Leaving it for later, which is a real answer when the
                date is unclear or somebody needs asking first. */}
            {nextPendingId !== null && (
              <button
                type="button"
                disabled={busy !== ""}
                onClick={skip}
                className={`text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border disabled:opacity-50 ${
                  confirmSkip
                    ? "border-danger text-danger"
                    : "border-line-strong bg-white"
                }`}
              >
                {confirmSkip ? "Skip and lose your changes?" : "Next, decide later"}
              </button>
            )}

            {/* Only worth showing while there is somewhere to go. */}
            {nextPendingId !== null && (
              <button
                type="button"
                disabled={busy !== ""}
                onClick={() =>
                  send(
                    { action: "save", status: "published" },
                    "publishNext",
                    "next",
                  )
                }
                title={nextPendingTitle ? `Next: ${nextPendingTitle}` : undefined}
                className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-navy-950 text-white disabled:opacity-50"
              >
                {busy === "publishNext" ? "Publishing" : "Publish & next"}
              </button>
            )}
          </>
        )}

        {event && event.status === "published" && (
          <a
            href={`/events/${event.slug}`}
            target="_blank"
            rel="noopener"
            className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-line-strong bg-white"
          >
            View it
          </a>
        )}

        {event && (
          <span className="ml-auto flex items-center gap-2.5">
            {confirmDelete ? (
              <>
                <span className="text-[13px] font-semibold">Delete it?</span>
                <button
                  type="button"
                  disabled={busy !== ""}
                  onClick={() => send({ action: "delete" }, "delete")}
                  className="text-[13px] font-semibold px-3.5 py-2.5 rounded-[9px] bg-danger text-white disabled:opacity-50"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[13px] px-3 py-2.5 rounded-[9px] text-muted"
                >
                  Keep it
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-danger text-danger bg-white"
              >
                Delete
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
