import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { listBlocks } from "@/lib/blocks";
import { BLOCK_PAGES } from "@/lib/blocks-registry";
import { AdminBlocks } from "@/components/admin-blocks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Page content",
  robots: { index: false, follow: false },
};

/**
 * The words on the marketing pages.
 *
 * Every headline on this site was compiled into it, so changing one was
 * a commit, a build and a deploy, and sentences that had gone stale
 * stayed stale for months. Anything listed here can be edited and is
 * live on the next page load.
 *
 * An untouched page renders exactly what it always did: the code value
 * is the fallback, and Reset deletes the row rather than writing today's
 * wording into it, so a page put back to the original keeps tracking
 * whatever ships next.
 */
export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page } = await searchParams;
  const current =
    BLOCK_PAGES.find((p) => p.key === page)?.key ?? BLOCK_PAGES[0].key;
  const blocks = await listBlocks(current);
  const editedCount = blocks.filter((b) => b.override !== null).length;

  return (
    <div className="mx-auto max-w-[900px] px-6 py-8">
      <div className="mb-5 max-w-[74ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          Page content
        </h1>
        <p className="text-sm text-muted mt-1">
          Headlines and copy on the marketing pages. Saving one puts it live
          straight away.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {BLOCK_PAGES.map((p) => (
          <Link
            key={p.key}
            href={`/admin/content?page=${p.key}`}
            className={`text-[13px] font-semibold px-3.5 py-2 rounded-[9px] border ${
              p.key === current
                ? "bg-navy-950 text-white border-navy-950"
                : "bg-white border-line-strong"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <p className="text-[12.5px] text-muted mb-4">
        {editedCount === 0
          ? "Nothing on this page has been changed yet, so it is showing the words it shipped with."
          : `${editedCount} of ${blocks.length} changed from the original.`}
      </p>

      <AdminBlocks blocks={blocks} />

      <div className="mt-6 grid gap-2 max-w-[74ch]">
        <p className="text-[12.5px] text-muted">
          Card text, benefit tiles and FAQ answers are not here yet. They are
          lists of several fields each and want a proper repeater rather than a
          box per line; they are still edited in code for now.
        </p>
        <p className="text-[12.5px] text-muted">
          Zone page copy is also still in code. It is about thirteen thousand
          words carrying most of the search traffic, so it moves on its own,
          carefully, rather than as part of this.
        </p>
      </div>
    </div>
  );
}
