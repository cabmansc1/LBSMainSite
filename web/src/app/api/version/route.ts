import { NextResponse } from "next/server";
import { mcEnabled } from "@/lib/mission-control";
import { stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Which build is actually running, and which integrations it can see.
 * Booleans and a commit sha only: never a key, never a value.
 */
export async function GET() {
  const mcStatus = await (async () => {
    if (!process.env.MC_BASE_URL) return "no base url";
    try {
      const key =
        process.env.MC_API_KEY ??
        process.env.MC_API_KEY_READONLY ??
        process.env.MC_API_KEY_WRITE;
      const res = await fetch(`${process.env.MC_BASE_URL}/api/store`, {
        headers: key
          ? { "x-api-key": key, Authorization: `Bearer ${key}` }
          : {},
        redirect: "manual",
        cache: "no-store",
      });
      const loc = res.headers.get("location");
      return loc ? `http ${res.status} -> ${loc}` : `http ${res.status}`;
    } catch (e) {
      // Never the raw error. This endpoint is public and unauthenticated,
      // and a malformed key produces a TypeError from Headers.append that
      // quotes the offending value in full. That published a live API key
      // to anyone who asked for /api/version.
      //
      // Report the class of failure, which is all this endpoint is for,
      // and keep the detail in the server log where it belongs.
      console.error("[version] Mission Control unreachable:", e);
      const msg = String(e);
      if (/Headers\.append|invalid header|ERR_INVALID_HTTP_TOKEN/i.test(msg)) {
        return "misconfigured: MC_API_KEY is not a valid header value (stray newline or the variable name pasted into the value?)";
      }
      if (/timeout|abort/i.test(msg)) return "unreachable: timed out";
      return "unreachable";
    }
  })();

  return NextResponse.json({
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown",
    branch: process.env.RAILWAY_GIT_BRANCH ?? "unknown",
    // Presence only, so this is safe to leave in place.
    has: {
      mcBaseUrl: !!process.env.MC_BASE_URL,
      mcApiKey: !!process.env.MC_API_KEY,
      mcApiKeyReadonly: !!process.env.MC_API_KEY_READONLY,
      stripe: stripeEnabled(),
      stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      db: !!process.env.DB_HOST,
      publicSiteUrl: process.env.PUBLIC_SITE_URL ?? null,
    },
    mcEnabled: mcEnabled(),
    // Whether this deploy would actually write to Mission Control.
    // Flipping MC_READ_ONLY is a Railway variable change, and without
    // this the only way to know it took effect is to make a purchase
    // and see whether anything happened, which is a poor way to find
    // out you flipped the wrong thing.
    mcWrites: process.env.MC_READ_ONLY === "1" ? "blocked (dry run)" : "LIVE",
    mcStatus,
  });
}
