import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { listEvents } from "@/lib/events";
import { categoryLabel } from "@/lib/events-types";
import { EVENT_SOURCES } from "@/lib/event-import";
import { EventImportButton } from "@/components/event-import-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Events",
  robots: { index: false, follow: false },
};

const TONE: Record<string, string> = {
  pending: "bg-cta-tint text-[#7a4a00]",
  published: "bg-[#E7F3EC] text-[#1F6B45]",
  rejected: "bg-surface text-muted",
  archived: "bg-surface text-muted",
};

/**
 * The calendar, with whatever needs reading at the top.
 *
 * Pending first rather than by date, because a submission is a job and
 * a published event is a record. A dated thing left unread for a week
 * may not be worth publishing at all by the time anybody sees it.
 */
export default async function AdminEventsPage() {
  await requireAdmin();
  const events = await listEvents();
  const pending = events.filter((e) => e.status === "pending");

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-8">
      <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div className="max-w-[64ch]">
          <h1 className="text-[21px] font-bold tracking-[-0.02em]">Events</h1>
          <p className="text-sm text-muted mt-1">
            What&rsquo;s Happening across the Lowcountry. Anybody can put one
            forward at /events/submit; nothing is public until you say so.
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-navy-950 text-white"
        >
          Add an event
        </Link>
      </div>

      <EventImportButton
        sources={EVENT_SOURCES.map(({ key, label, hint }) => ({
          key,
          label,
          hint,
        }))}
      />

      {pending.length > 0 && (
        <p className="text-[13px] text-[#7a4a00] bg-cta-tint border border-[#f3ddbb] rounded-lg px-4 py-2.5 mb-4">
          {pending.length} waiting to be read.
        </p>
      )}

      {events.length === 0 ? (
        <div className="border border-line rounded-(--radius-card) bg-white p-8 text-center">
          <p className="text-[15px] font-semibold">Nothing on the calendar.</p>
          <p className="text-[13.5px] text-muted mt-1.5 max-w-[52ch] mx-auto">
            Add a few you already know about, then point people at the
            submission form. A calendar with nothing in it does not get
            submissions.
          </p>
        </div>
      ) : (
        <div className="border border-line rounded-(--radius-card) bg-white overflow-hidden">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/admin/events/${e.id}`}
              className="block border-b border-line last:border-b-0 px-4 py-3.5 hover:bg-surface"
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <b className="text-[14.5px]">{e.title}</b>
                <span
                  className={`text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                    TONE[e.status] ?? "bg-surface text-muted"
                  }`}
                >
                  {e.status}
                </span>
                {e.source === "submitted" && (
                  <span className="text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-brand-tint text-brand-deep">
                    Submitted
                  </span>
                )}
                {e.seriesId !== null && (
                  <span className="text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-surface text-muted">
                    Repeats
                  </span>
                )}
                <span className="ml-auto text-[12.5px] text-muted num">
                  {e.dayLabel}
                </span>
              </div>
              <p className="text-[12.5px] text-muted mt-1">
                {categoryLabel(e.category)}
                {e.venueName && ` · ${e.venueName}`}
                {e.submittedEmail && ` · from ${e.submittedEmail}`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
