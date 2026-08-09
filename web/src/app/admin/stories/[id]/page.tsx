import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getStory } from "@/lib/stories";
import { listActivePlaces } from "@/lib/places";
import { getBusinesses } from "@/lib/directory";
import { AdminStoryEditor } from "@/components/admin-story-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Story",
  robots: { index: false, follow: false },
};

/**
 * Writing one story, or starting a new one.
 *
 * "new" is handled here rather than on its own route so both share the
 * editor exactly. A new story saves, gets an id, and the editor moves
 * itself to that id, which is what stops a second save creating a
 * second story.
 */
export default async function AdminStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";

  const [story, places, businesses] = await Promise.all([
    isNew ? Promise.resolve(null) : getStory(Number(id)),
    listActivePlaces().catch(() => []),
    getBusinesses().catch(() => []),
  ]);

  if (!isNew && !story) notFound();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <p className="text-[13px] mb-3">
        <Link href="/admin/stories" className="text-brand-deep font-semibold">
          &larr; All stories
        </Link>
      </p>

      <h1 className="text-[21px] font-bold tracking-[-0.02em] mb-5">
        {isNew ? "Write a story" : story?.title || "Story"}
      </h1>

      <AdminStoryEditor
        story={story ?? null}
        places={places.map((p) => ({
          value: p.slug,
          // Indented by kind so a market and its neighbourhoods read as
          // a list of places rather than a flat jumble of names.
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
