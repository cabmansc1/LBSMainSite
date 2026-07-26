import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getAdminPost } from "@/lib/admin-data";
import { AdminPostEditor } from "@/components/admin-post-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Edit post",
  robots: { index: false, follow: false },
};

/** Successor to admin/edit_blog_post.php. "new" creates a post. */
export default async function AdminPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const post = id === "new" ? null : await getAdminPost(Number(id));
  if (id !== "new" && !post) notFound();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <Link
          href="/admin/blog"
          className="text-[13px] font-semibold text-brand-deep hover:underline"
        >
          Back to posts
        </Link>
        <h1 className="text-[21px] font-bold tracking-[-0.02em] mt-2">
          {post ? "Edit post" : "New post"}
        </h1>
      </div>
      <AdminPostEditor post={post} />
    </div>
  );
}
