import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/sections";
import { getPosts } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog: Local Marketing Tips for the Lowcountry",
  description:
    "Direct mail strategy, local business marketing tips, and community news from Lowcountry Business Spotlight.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: `Blog | ${SITE_NAME}`,
    description: "Local marketing tips for Lowcountry businesses.",
    siteName: SITE_NAME,
    type: "website",
  },
};

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Blog
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[24ch] text-balance">
            Local marketing, minus the fluff.
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        {posts.length === 0 ? (
          <p className="text-muted text-sm py-8">
            No posts yet. Check back soon.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`}>
                <Card className="overflow-hidden hover:border-faint transition-colors h-full grid content-start">
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt=""
                      loading="lazy"
                      className="w-full aspect-[16/9] object-cover"
                    />
                  )}
                  <div className="p-5.5 grid gap-2">
                    {p.publishedAt && (
                      <span className="text-[12px] text-muted">{p.publishedAt}</span>
                    )}
                    <h2 className="text-[16.5px] font-semibold tracking-tight leading-snug">
                      {p.title}
                    </h2>
                    <p className="text-[13.5px] text-body leading-relaxed line-clamp-3">
                      {p.excerpt}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
