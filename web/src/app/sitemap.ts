import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Generate per request: the build machine cannot reach the database,
// so a static sitemap would bake in fallback URLs.
export const dynamic = "force-dynamic";
import { ZONES } from "@/lib/zones";
import { getBusinesses, getFilterOptions } from "@/lib/directory";
import { getPosts } from "@/lib/blog";
import { listActivePlaces } from "@/lib/places";
import { publishedStories } from "@/lib/stories";
import { activeSpecials } from "@/lib/specials";
import { GUIDES } from "@/lib/guides";
import { SUB_AREAS } from "@/lib/sub-areas";
import { STORY_KINDS } from "@/lib/stories-types";
import { getPastCards } from "@/lib/past-cards";

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
    { path: "/compare", priority: 0.7 },
    { path: "/coming-soon-service-areas", priority: 0.6 },
    { path: "/mailing-calendar", priority: 0.8 },
    { path: "/directory", priority: 0.8 },
    { path: "/deals", priority: 0.7 },
    { path: "/gallery", priority: 0.6 },
    { path: "/roi-calculator", priority: 0.6 },
    { path: "/find-your-ad", priority: 0.6 },
    { path: "/contact", priority: 0.6 },
    { path: "/directory-signup", priority: 0.6 },
    { path: "/blog", priority: 0.6 },
    // The pillar page every zone page and guide hangs off. High, because
    // it is the page we most want treated as the subject authority.
    { path: "/direct-mail-marketing", priority: 0.9 },
    { path: "/guides", priority: 0.6 },
    // A commercial page with local intent behind it, so priority sits
    // with the money pages rather than the supporting ones.
    { path: "/printing", priority: 0.8 },
    { path: "/privacy", priority: 0.2 },
    { path: "/terms", priority: 0.2 },
  ];

  const [businesses, options, posts, pastCards, stories, places] =
    await Promise.all([
    getBusinesses(),
    getFilterOptions(),
    getPosts(),
    getPastCards({ publishedOnly: true }).catch(() => []),
    // Capped rather than unbounded. A sitemap is a hint, and the newest
    // few hundred are the ones worth spending crawl budget on.
    publishedStories({ limit: 100 }).catch(() => []),
    listActivePlaces().catch(() => []),
  ]);

  /*
   * The story index is listed only once there is something on it.
   *
   * Submitting an empty page to Google is asking it to index a page
   * that says "nothing here yet", and a thin page indexed early is
   * harder to shift than one crawled for the first time when it is
   * worth reading. It appears on its own the moment the first story is
   * published, along with its filters and its entries.
   */
  const sections = [
    // The place pages carry whatever is tagged to them, so they are
    // worth listing once there is anything at all to find — the index
    // itself is a real page of links either way.
    ...(places.length ? [{ path: "/local", priority: 0.7 }] : []),
    ...(stories.length ? [{ path: "/stories", priority: 0.8 }] : []),
    // Only while something is on offer. Out of season the page says so
    // honestly, which is the right thing for a visitor who followed an
    // old link and the wrong thing to spend crawl budget on.
    ...(activeSpecials().length ? [{ path: "/specials", priority: 0.7 }] : []),
  ];

  return [
    ...[...staticPaths, ...sections].map((p) => ({
      url: `${SITE_URL}${p.path}`,
      priority: p.priority,
    })),
    // A market carries more than a neighbourhood, and says so.
    ...places.map((pl) => ({
      url: `${SITE_URL}/local/${pl.slug}`,
      priority: pl.kind === "market" ? 0.7 : 0.6,
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
    ...options.tags.map((t) => ({
      url: `${SITE_URL}/directory/tag/${t.slug}`,
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
    // The story kind filters are real pages with their own copy, so
    // they are worth crawling rather than being treated as query noise.
    ...(stories.length
      ? STORY_KINDS.map((k) => ({
          url: `${SITE_URL}/stories?kind=${k.value}`,
          priority: 0.5,
        }))
      : []),
    ...stories.map((s) => ({
      url: `${SITE_URL}/stories/${s.slug}`,
      priority: 0.7,
    })),
    // Long-form guides. Static pages in the codebase rather than rows,
    // so they are always listed rather than gated on a count.
    ...GUIDES.map((g) => ({
      url: `${SITE_URL}/guides/${g.slug}`,
      lastModified: g.updated,
      priority: 0.7,
    })),
    // Neighbourhoods inside a zone. Same priority as a zone page: the
    // search that finds them is just as commercial.
    ...SUB_AREAS.map((a) => ({
      url: `${SITE_URL}/direct-mail-marketing/${a.slug}`,
      priority: 0.7,
    })),
    // One index per neighborhood with cards in it.
    ...[...new Set(pastCards.map((c) => c.zoneSlug))].map((zoneSlug) => ({
      url: `${SITE_URL}/gallery/${zoneSlug}`,
      priority: 0.5,
    })),
    // A page per mailed card: fresh every mailing, and the link between
    // the zone pages and the directory listings.
    ...pastCards.map((c) => ({
      url: `${SITE_URL}/cards/${c.slug}`,
      lastModified: c.mailDate ? new Date(c.mailDate) : undefined,
      priority: 0.5,
    })),
  ];
}
