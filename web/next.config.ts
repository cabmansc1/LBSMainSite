import type { NextConfig } from "next";

/**
 * Hosts the uploads base can point at, as next/image remote patterns.
 *
 * Photos still live on the PHP host's disk, and that host answers in
 * roughly a second even for a static file, so every raw thumbnail on
 * the blog and directory cost a visitor a full second of somebody
 * else's server. Routing them through the optimizer means the slow
 * host is paid once per file rather than once per page view, and what
 * the visitor downloads is a resized WebP instead of the original.
 *
 * The apex is listed alongside the www host because a stored URL can
 * carry either, and UPLOADS_BASE_URL is read so the cutover this base
 * was made configurable for does not silently break image loading.
 */
const uploadPatterns = () => {
  const bases = [
    "https://www.lowcountrybusinessspotlight.com/uploads",
    process.env.UPLOADS_BASE_URL,
  ].filter((b): b is string => Boolean(b));

  const seen = new Map<
    string,
    { protocol: "http" | "https"; hostname: string; pathname: string; search: string }
  >();
  for (const base of bases) {
    let url: URL;
    try {
      url = new URL(base);
    } catch {
      continue;
    }
    const protocol = url.protocol === "http:" ? "http" : "https";
    const pathname = `${url.pathname.replace(/\/$/, "")}/**`;
    for (const hostname of new Set([
      url.hostname,
      url.hostname.replace(/^www\./, ""),
    ])) {
      // `search: ""` keeps the allowlist to bare file URLs. Omitting it
      // implies a wildcard, which would let anyone hand the optimizer a
      // query string we never intended it to fetch.
      seen.set(`${protocol}//${hostname}${pathname}`, {
        protocol,
        hostname,
        pathname,
        search: "",
      });
    }
  }
  return [...seen.values()];
};

/**
 * Redirect inventory ported from the legacy .htaccess.
 * Every legacy .php URL 301s to its clean-URL equivalent so no
 * indexed page or inbound link loses its destination at cutover.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: uploadPatterns(),
    // Deliberately no `localPatterns`: adding one turns same-origin
    // optimization into an allowlist, and listing logos are served from
    // /api/business-image/<id> on this app rather than the uploads host.
    //
    // Uploaded files are named with uniqid()+time() by the PHP uploader,
    // so a replaced photo always arrives under a new URL. Nothing behind
    // one of these URLs ever changes, which is what makes a month-long
    // optimized-image TTL safe rather than a staleness risk.
    minimumCacheTTL: 2678400,
  },
  async redirects() {
    return [
      // Legacy query-string forms
      {
        source: "/business.php",
        has: [{ type: "query", key: "slug", value: "(?<slug>.*)" }],
        destination: "/business/:slug",
        permanent: true,
      },
      {
        source: "/directory.php",
        has: [{ type: "query", key: "category", value: "(?<category>.*)" }],
        destination: "/directory/category/:category",
        permanent: true,
      },
      {
        source: "/directory.php",
        has: [{ type: "query", key: "tag", value: "(?<tag>.*)" }],
        destination: "/directory/tag/:tag",
        permanent: true,
      },
      {
        source: "/directory.php",
        has: [{ type: "query", key: "location", value: "(?<location>.*)" }],
        destination: "/directory/location/:location",
        permanent: true,
      },
      { source: "/directory.php", destination: "/directory", permanent: true },
      {
        source: "/blog-post.php",
        has: [{ type: "query", key: "slug", value: "(?<slug>.*)" }],
        destination: "/blog/:slug",
        permanent: true,
      },
      // Retired product line URLs
      {
        source: "/community-cards",
        destination: "/neighborhood-cards",
        permanent: true,
      },
      {
        source: "/community-card/:slug",
        destination: "/neighborhood-card/:slug",
        permanent: true,
      },
      // Plain .php pages to their clean equivalents
      { source: "/index.php", destination: "/", permanent: true },
      { source: "/pricing.php", destination: "/pricing", permanent: true },
      {
        source: "/compare-products.php",
        destination: "/compare",
        permanent: true,
      },
      {
        source: "/coming-soon-service-areas.php",
        destination: "/coming-soon-service-areas",
        permanent: true,
      },
      { source: "/advertise.php", destination: "/advertise", permanent: true },
      { source: "/contact.php", destination: "/contact", permanent: true },
      {
        source: "/roi-calculator.php",
        destination: "/roi-calculator",
        permanent: true,
      },
      {
        source: "/find-your-ad.php",
        destination: "/find-your-ad",
        permanent: true,
      },
      { source: "/blog.php", destination: "/blog", permanent: true },
      {
        source: "/neighborhood-cards.php",
        destination: "/neighborhood-cards",
        permanent: true,
      },
      { source: "/privacy.php", destination: "/privacy", permanent: true },
      { source: "/terms.php", destination: "/terms", permanent: true },
      { source: "/login.php", destination: "/login", permanent: true },
      { source: "/register.php", destination: "/register", permanent: true },
      { source: "/dashboard.php", destination: "/account", permanent: true },
      {
        // /account/campaigns has never existed. The portal screen is
        // /account/cards, so this redirect took every old my-cards link
        // to a 404: worse than no redirect, because a 404 behind a 301
        // still burns the link and looks deliberate.
        source: "/my-cards.php",
        destination: "/account/cards",
        permanent: true,
      },
      {
        source: "/directory-signup.php",
        destination: "/directory-signup",
        permanent: true,
      },
      /**
       * The rest of the legacy pages, found by crawling every .php file
       * the old site can serve against the new app. Each one 404'd,
       * which for a page with links pointing at it is a lost visitor
       * and a lost link.
       *
       * Targets are matched by what the page actually was, read from
       * its own heading, rather than guessed from the filename.
       */
      {
        // "Upcoming Spotlight Postcard Mailings". The closest thing to
        // an SEO asset in this list: same content, new home.
        source: "/upcoming-mailers.php",
        destination: "/mailing-calendar",
        permanent: true,
      },
      {
        // Submitted to Search Console as a sitemap on the old site, so
        // it is the one URL here a crawler asks for by habit.
        source: "/sitemap.php",
        destination: "/sitemap.xml",
        permanent: true,
      },
      {
        source: "/directory-landing.php",
        destination: "/directory",
        permanent: true,
      },
      {
        // Redirected to a categories.php that no longer exists.
        source: "/category.php",
        destination: "/directory",
        permanent: true,
      },
      {
        source: "/neighborhood-card.php",
        has: [{ type: "query", key: "slug" }],
        destination: "/neighborhood-card/:slug",
        permanent: true,
      },
      {
        source: "/neighborhood-card.php",
        destination: "/neighborhood-cards",
        permanent: true,
      },
      {
        source: "/neighborhood-card-checkout.php",
        destination: "/neighborhood-cards",
        permanent: true,
      },
      {
        source: "/neighborhood-card-success.php",
        destination: "/account/cards",
        permanent: true,
      },
      {
        // "Create Business Listing", which is what /register does now.
        source: "/create-listing.php",
        destination: "/register",
        permanent: true,
      },
      {
        // The dead mockup this project replaced.
        source: "/manage-listing.php",
        destination: "/account/listings",
        permanent: true,
      },
      {
        source: "/forgot-password.php",
        destination: "/forgot-password",
        permanent: true,
      },
      {
        source: "/reset-password.php",
        destination: "/forgot-password",
        permanent: true,
      },
      { source: "/logout.php", destination: "/", permanent: true },
      /**
       * Thank-you pages. Nobody arrives from search, but old links and
       * bookmarks exist, and a 404 is a worse answer than the page the
       * visitor was thanked for reaching.
       */
      {
        source: "/directory-thank-you.php",
        destination: "/directory",
        permanent: true,
      },
      { source: "/thank_you.php", destination: "/", permanent: true },
      // Zone landing pages keep their exact paths; only the .php suffix redirects
      {
        source: "/:zone(\\w[\\w-]*)-direct-mail-marketing.php",
        destination: "/:zone-direct-mail-marketing",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
