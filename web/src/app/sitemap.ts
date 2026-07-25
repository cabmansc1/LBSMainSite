import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { ZONES } from "@/lib/zones";
import { getBusinesses, getFilterOptions } from "@/lib/directory";
import { getPosts } from "@/lib/blog";

/**
 * Successor to sitemap.php: static pages, the 11 zone pages, and
 * DB-driven directory + blog URLs. Directory and blog helpers fall
 * back to samples when no DB is configured, which keeps this valid in
 * every environment.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/advertise", priority: 0.9 },
    { path: "/pricing", priority: 0.9 },
    { path: "/coverage-map", priority: 0.8 },
    { path: "/mailing-calendar", priority: 0.8 },
    { path: "/directory", priority: 0.8 },
    { path: "/gallery", priority: 0.6 },
    { path: "/roi-calculator", priority: 0.6 },
    { path: "/contact", priority: 0.6 },
    { path: "/directory-signup", priority: 0.6 },
    { path: "/blog", priority: 0.6 },
    { path: "/privacy", priority: 0.2 },
    { path: "/terms", priority: 0.2 },
  ];

  const [businesses, options, posts] = await Promise.all([
    getBusinesses(),
    getFilterOptions(),
    getPosts(),
  ]);

  return [
    ...staticPaths.map((p) => ({
      url: `${SITE_URL}${p.path}`,
      priority: p.priority,
    })),
    ...ZONES.map((z) => ({
      url: `${SITE_URL}/${z.slug}-direct-mail-marketing`,
      priority: 0.9,
    })),
    ...options.categories.map((c) => ({
      url: `${SITE_URL}/directory/category/${c.slug}`,
      priority: 0.6,
    })),
    ...options.locations.map((l) => ({
      url: `${SITE_URL}/directory/location/${l.slug}`,
      priority: 0.5,
    })),
    ...businesses.map((b) => ({
      url: `${SITE_URL}/business/${b.slug}`,
      priority: 0.5,
    })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      priority: 0.5,
    })),
  ];
}
