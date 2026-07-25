import type { NextConfig } from "next";

/**
 * Redirect inventory ported from the legacy .htaccess.
 * Every legacy .php URL 301s to its clean-URL equivalent so no
 * indexed page or inbound link loses its destination at cutover.
 */
const nextConfig: NextConfig = {
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
        source: "/my-cards.php",
        destination: "/account/campaigns",
        permanent: true,
      },
      {
        source: "/directory-signup.php",
        destination: "/directory-signup",
        permanent: true,
      },
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
