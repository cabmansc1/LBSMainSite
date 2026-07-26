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
      return `http ${res.status}`;
    } catch (e) {
      return `unreachable: ${String(e).slice(0, 120)}`;
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
    mcStatus,
  });
}
