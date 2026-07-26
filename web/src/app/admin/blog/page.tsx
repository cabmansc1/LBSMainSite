import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { getAdminPosts } from "@/lib/admin-data";
import { StatusChip } from "@/components/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Blog",
  robots: { index: false, follow: false },
};

/** Successor to admin/manage_blog.php, same directory_blog_posts table. */
export default async function AdminBlogPage() {
  await requireAdmin();
  const posts = await getAdminPosts();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-[21px] font-bold tracking-[-0.02em]">Blog</h1>
          <p className="text-sm text-muted mt-1">
            Write and publish posts. Content is the same HTML the legacy
            editor saved, so existing posts keep rendering unchanged.
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="bg-cta text-navy-950 text-[13.5px] font-bold px-4 py-2.5 rounded-(--radius-btn) hover:bg-[#FFA033]"
        >
          New post
        </Link>
      </div>

      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[680px]">
          <thead>
            <tr>
              {["Title", "Slug", "Status", "Published", ""].map((h) => (
                <th
                  key={h}
                  className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="hover:bg-surface">
                <td className="px-4 py-3.5 border-b border-line font-semibold">
                  {p.title}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-muted text-[12.5px]">
                  /{p.slug}
                </td>
                <td className="px-4 py-3.5 border-b border-line">
                  {p.status === "published" ? (
                    <StatusChip tone="ok">Published</StatusChip>
                  ) : (
                    <StatusChip tone="warn">Draft</StatusChip>
                  )}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-muted text-[12.5px]">
                  {p.publishedAt ? p.publishedAt.slice(0, 10) : "-"}
                </td>
                <td className="px-4 py-3.5 border-b border-line whitespace-nowrap">
                  <Link
                    href={`/admin/blog/${p.id}`}
                    className="font-semibold text-brand-deep hover:underline"
                  >
                    Edit
                  </Link>
                  {p.status === "published" && (
                    <Link
                      href={`/blog/${p.slug}`}
                      className="font-semibold text-muted hover:text-navy-950 ml-3"
                    >
                      View
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 && (
          <p className="text-sm text-muted px-4 py-8 text-center">
            No posts yet.
          </p>
        )}
      </div>
    </div>
  );
}
