import "server-only";
import { resolveBlogImageUrl } from "@/lib/blog-images";

/**
 * Blog reads from directory_blog_posts (published only, ordered like
 * admin/blog_functions.php). Post content is stored HTML from the
 * legacy Quill editor and renders unchanged.
 *
 * Featured images are one of two things and resolveBlogImageUrl decides
 * which: posts written before uploads existed name a file on the PHP
 * host at /uploads/blog/ and still resolve there, while anything
 * uploaded from this admin is served out of the database.
 */

export type BlogPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml?: string;
  metaDescription?: string;
  imageUrl?: string;
  publishedAt?: string;
};

const SAMPLE_POSTS: BlogPost[] = [
  {
    id: 1,
    title: "Why Direct Mail Still Wins for Local Businesses",
    slug: "why-direct-mail-still-wins",
    excerpt:
      "Digital ads scroll past. A 9x12 postcard sits on the counter. Here's what the response numbers say about reaching Lowcountry households by mail.",
    publishedAt: "2026-06-01",
  },
  {
    id: 2,
    title: "5 Offers That Get Postcards Kept, Not Tossed",
    slug: "offers-that-get-postcards-kept",
    excerpt:
      "The difference between a glance and a fridge magnet is the offer. Five proven structures from cards we've mailed.",
    publishedAt: "2026-05-12",
  },
];

const fmtDate = (d: unknown) => {
  const dt = d instanceof Date ? d : new Date(String(d ?? ""));
  return isNaN(dt.getTime())
    ? undefined
    : dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

export async function getPosts(): Promise<BlogPost[]> {
  if (!process.env.DB_HOST) return SAMPLE_POSTS;
  try {
    const { db } = await import("@/lib/db");
    const { blogPosts } = await import("@/lib/db/schema-legacy");
    const { eq, desc } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt))
      .limit(50);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt ?? "",
      metaDescription: r.metaDescription ?? undefined,
      imageUrl: resolveBlogImageUrl(r.featuredImage),
      publishedAt: fmtDate(r.publishedAt),
    }));
  } catch (e) {
    console.error("[blog] posts query failed, serving samples:", e);
    return SAMPLE_POSTS;
  }
}

export async function getPost(slug: string): Promise<BlogPost | undefined> {
  if (!process.env.DB_HOST) return SAMPLE_POSTS.find((p) => p.slug === slug);
  try {
    const { db } = await import("@/lib/db");
    const { blogPosts } = await import("@/lib/db/schema-legacy");
    const { and, eq } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
      .limit(1);
    const r = rows[0];
    if (!r) return undefined;
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt ?? "",
      contentHtml: r.content ?? "",
      metaDescription: r.metaDescription ?? undefined,
      imageUrl: resolveBlogImageUrl(r.featuredImage),
      publishedAt: fmtDate(r.publishedAt),
    };
  } catch (e) {
    console.error("[blog] post query failed:", e);
    return undefined;
  }
}
