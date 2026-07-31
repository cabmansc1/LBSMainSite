import "server-only";

/**
 * The public address of this site, as a customer's browser sees it.
 *
 * Behind Railway's proxy `new URL(req.url).origin` is the internal
 * address, `http://localhost:8080`. Anything built from it and handed
 * to Stripe becomes a return URL the customer's browser cannot reach:
 * they pay, Stripe redirects, and the tab dies on a connection error
 * with the money already taken.
 *
 * Order matters. An explicit variable wins because it is the only one
 * that is definitely right; the forwarded headers are next because the
 * proxy sets them from the real request; req.url is the last resort and
 * only correct when nothing is in front of us.
 *
 * Both env names are accepted deliberately: the postcard checkout was
 * written against PUBLIC_SITE_URL and registration against SITE_ORIGIN,
 * so a deploy that set one and not the other had a working checkout and
 * a subscription that redirected to localhost.
 */
export function publicOrigin(req: Request): string {
  const configured = (
    process.env.PUBLIC_SITE_URL ??
    process.env.SITE_ORIGIN ??
    ""
  ).trim();
  if (configured) return configured.replace(/\/+$/, "");

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}
