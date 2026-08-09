import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { listMedia } from "@/lib/media";
import { AdminMedia } from "@/components/admin-media";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pictures",
  robots: { index: false, follow: false },
};

/**
 * One library for everything written from here on.
 *
 * Blog featured images, listing photos and card scans keep their own
 * tables and are untouched by this. What this adds is alt text, which
 * the site records nowhere at present and which cannot be backfilled
 * honestly once there are hundreds of pictures nobody remembers taking.
 */
export default async function AdminMediaPage() {
  await requireAdmin();
  const items = await listMedia();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 max-w-[74ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Pictures</h1>
        <p className="text-sm text-muted mt-1">
          Photographs for stories, events and market pages. Every one wants a
          line describing what is in it, for screen readers and for search.
        </p>
      </div>

      <AdminMedia items={items} />

      <div className="mt-6 grid gap-2 max-w-[74ch]">
        <p className="text-[12.5px] text-muted">
          A picture cannot be replaced in place. Uploading a new version makes a
          new picture, which is what lets these load instantly everywhere they
          appear: a link to one can never come back showing something else.
        </p>
        <p className="text-[12.5px] text-muted">
          Blog images, listing photos and past card scans live in their own
          places and are not shown here.
        </p>
      </div>
    </div>
  );
}
