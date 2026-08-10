import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getEvent, listEvents } from "@/lib/events";
import { listActivePlaces } from "@/lib/places";
import { getBusinesses } from "@/lib/directory";
import { AdminEventEditor } from "@/components/admin-event-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Event",
  robots: { index: false, follow: false },
};

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";

  const [event, places, businesses, all] = await Promise.all([
    isNew ? Promise.resolve(null) : getEvent(Number(id)),
    listActivePlaces().catch(() => []),
    getBusinesses().catch(() => []),
    isNew ? Promise.resolve([]) : listEvents().catch(() => []),
  ]);

  if (!isNew && !event) notFound();

  /*
   * The queue, worked out here rather than in the browser.
   *
   * Reviewing submissions is a run of the same decision over and over,
   * and the thing that makes it slow is going back to the list between
   * each one. Knowing what comes next turns three clicks into one.
   *
   * Same order the list uses — pending first, soonest first — so "next"
   * means what it looked like it would mean on the screen before.
   */
  const queue = all.filter((e) => e.status === "pending");
  const at = queue.findIndex((e) => e.id === event?.id);
  const nextPending = at === -1 ? queue[0] : queue[at + 1];
  const position = at === -1 ? 0 : at + 1;

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <p className="text-[13px] mb-3">
        <Link href="/admin/events" className="text-brand-deep font-semibold">
          &larr; All events
        </Link>
      </p>

      <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          {isNew ? "Add an event" : event?.title || "Event"}
        </h1>
        {position > 0 && (
          <p className="text-[12.5px] text-muted num">
            {position} of {queue.length} waiting
          </p>
        )}
      </div>

      <AdminEventEditor
        event={event ?? null}
        nextPendingId={nextPending?.id ?? null}
        nextPendingTitle={nextPending?.title ?? ""}
        places={places.map((p) => ({
          value: p.slug,
          label:
            p.kind === "region"
              ? p.name
              : p.kind === "market"
                ? `— ${p.name}`
                : `—— ${p.name}`,
        }))}
        businesses={businesses.map((b) => ({
          value: String(b.id),
          label: b.name,
        }))}
      />
    </div>
  );
}
