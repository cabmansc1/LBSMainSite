import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.metaDescription ?? post.excerpt.slice(0, 155),
    alternates: { canonical: `${SITE_URL}/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.metaDescription ?? post.excerpt.slice(0, 155),
      siteName: SITE_NAME,
      type: "article",
      images: post.imageUrl ? [post.imageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription ?? post.excerpt,
    image: post.imageUrl,
    url: `${SITE_URL}/blog/${post.slug}`,
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[760px] px-6 pt-12 pb-12">
          <nav className="text-[12.5px] text-[#67768A]" aria-label="Breadcrumb">
            <Link href="/blog" className="hover:text-white">
              Blog
            </Link>
          </nav>
          <h1 className="mt-4 text-[28px] md:text-[40px] font-bold tracking-[-0.03em] leading-[1.15] text-balance">
            {post.title}
          </h1>
          {post.publishedAt && (
            <p className="mt-3 text-[13.5px] text-[#93A5B8]">{post.publishedAt}</p>
          )}
        </div>
      </header>

      <article className="mx-auto max-w-[760px] px-6 py-10">
        {post.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.imageUrl}
            alt=""
            className="w-full rounded-(--radius-card) border border-line mb-8"
          />
        )}
        <div
          className="prose-lbs text-[16px] leading-relaxed text-body [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-ink [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-[18px] [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_a]:text-brand-deep [&_a]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_img]:rounded-xl [&_img]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-brand [&_blockquote]:pl-4 [&_blockquote]:text-muted"
          dangerouslySetInnerHTML={{ __html: post.contentHtml ?? "" }}
        />
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
