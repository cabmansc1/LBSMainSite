import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getEvent } from "@/lib/events";
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

  const [event, places, businesses] = await Promise.all([
    isNew ? Promise.resolve(null) : getEvent(Number(id)),
    listActivePlaces().catch(() => []),
    getBusinesses().catch(() => []),
  ]);

  if (!isNew && !event) notFound();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <p className="text-[13px] mb-3">
        <Link href="/admin/events" className="text-brand-deep font-semibold">
          &larr; All events
        </Link>
      </p>

      <h1 className="text-[21px] font-bold tracking-[-0.02em] mb-5">
        {isNew ? "Add an event" : event?.title || "Event"}
      </h1>

      <AdminEventEditor
        event={event ?? null}
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
