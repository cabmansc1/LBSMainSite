import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { mcEnabled, mcKey, mcKeySource } from "@/lib/mission-control";
import { stripeEnabled } from "@/lib/stripe";
import { emailEnabled } from "@/lib/email";
import { directoryWritesBlocked } from "@/lib/write-guard";
import { ghlConfigured } from "@/lib/ghl";

export const dynamic = "force-dynamic";

/**
 * Which build is actually running, and which integrations it can see.
 * Booleans and a commit sha only: never a key, never a value.
 */
export async function GET() {
  const mcStatus = await (async () => {
    if (!process.env.MC_BASE_URL) return "no base url";
    try {
      // Follow the way the adapter does, rather than reporting the first
      // hop. MC answers /api/store with a 308 to the canonical path, so
      // "http 308" was being read as healthy when it says nothing at
      // all: a key that cannot read produces exactly the same 308, then
      // a 307 to /login. Two outages were diagnosed slowly because of
      // that. Report what actually happened at the end of the chain.
      // The adapter's own key resolution, not a copy of it. This route
      // had its own `??` chain, which differs from the adapter's `||`
      // on exactly one input: a variable saved blank rather than
      // deleted. `??` keeps the empty string and reports auth failed
      // while the site is working perfectly on the fallback key, which
      // is precisely the false alarm a health check must never raise.
      const clean = mcKey();
      const headers: Record<string, string> = clean
        ? { "x-api-key": clean, Authorization: `Bearer ${clean}` }
        : {};
      let res = await fetch(`${process.env.MC_BASE_URL}/api/store`, {
        headers,
        redirect: "manual",
        cache: "no-store",
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location") ?? "";
        if (/\/login/i.test(loc)) return "auth failed: key rejected (cannot read)";
        res = await fetch(new URL(loc, process.env.MC_BASE_URL).toString(), {
          headers,
          redirect: "manual",
          cache: "no-store",
        });
        if (res.status >= 300 && res.status < 400) {
          const to = res.headers.get("location") ?? "";
          return /\/login/i.test(to)
            ? "auth failed: key rejected (cannot read)"
            : `redirect loop (${res.status})`;
        }
      }
      if (!res.ok) return `http ${res.status}`;
      // Proof of a real read, which is the only thing that matters here.
      const body = (await res.json()) as { pipelineCards?: unknown[] };
      const n = Array.isArray(body.pipelineCards) ? body.pipelineCards.length : 0;
      return `ok, reads ${n} cards`;
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
      mcApiKeyWrite: !!process.env.MC_API_KEY_WRITE,
      mcApiKeyReadonly: !!process.env.MC_API_KEY_READONLY,
      stripe: stripeEnabled(),
      stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      db: !!process.env.DB_HOST,
      publicSiteUrl: process.env.PUBLIC_SITE_URL ?? null,
      siteOrigin: process.env.SITE_ORIGIN ?? null,
    },
    /**
     * Whether the running app can see the mail and CRM settings.
     *
     * Set in the hosting dashboard and visible to the process are two
     * different things, and this project has already lost an afternoon
     * to that gap once with a Mission Control key. Without this the only
     * way to tell whether email is live is to send one and go looking
     * for it.
     *
     * Names and domains only. The from address is on the outside of
     * every message we send, so it is not a secret; the key and the
     * webhook URLs never appear here. That rule is not theoretical: this
     * endpoint published a live API key once already.
     */
    email: emailEnabled() ? "sending" : "preview only, no RESEND_API_KEY",
    emailFromDomain: (process.env.EMAIL_FROM?.match(/@([^>\s]+)/)?.[1] ?? null),
    leadAlertsTo: process.env.LEAD_ALERT_EMAIL ? "set" : "default",
    /**
     * Whether this environment can edit real listings.
     *
     * Reported for the same reason mcWrites is: set in the dashboard and
     * visible to the process are two different things, and the only
     * other way to find out was to press Save on somebody's listing and
     * see what happened. That is a poor way to learn the answer while
     * staging shares the production database.
     */
    directoryWrites: directoryWritesBlocked()
      ? "blocked (DIRECTORY_READ_ONLY)"
      : "live, edits reach the database",
    /**
     * Which surfaces can reach the CRM.
     *
     * Reported alongside whether the catch-all is set, because those are
     * different problems with the same symptom: a per-form key covering
     * one surface looks the same from outside as a catch-all covering
     * all six, and so does a variable saved to the wrong service.
     */
    ghlWebhooks: (() => {
      const keys = [
        "advertise",
        "quiz",
        "roi",
        "newsletter",
        "waitlist",
        "order",
      ] as const;
      const live = keys.filter((k) => ghlConfigured(k));
      if (live.length === 0) return "none configured";
      return live.length === keys.length ? "all six" : live.join(", ");
    })(),
    ghlCatchAllUrl: process.env.GHL_WEBHOOK_URL?.trim() ? "set" : "not set",
    mcEnabled: mcEnabled(),
    // Identifies WHICH key is loaded without revealing it. We spent an
    // afternoon unable to tell whether a hosting dashboard held the
    // value we thought it did, because every symptom looked the same
    // from outside. Length plus a truncated SHA-256 answers that in one
    // request and is not reversible: a 256-bit random key cannot be
    // recovered from eight hex characters of its digest.
    mcKeyFrom: mcKeySource(),
    mcKeyFingerprint: (() => {
      const k = mcKey();
      if (!k) return "none";
      return `len ${k.length} sha ${createHash("sha256").update(k).digest("hex").slice(0, 8)}`;
    })(),
    // Whether this deploy would actually write to Mission Control.
    // Flipping MC_READ_ONLY is a Railway variable change, and without
    // this the only way to know it took effect is to make a purchase
    // and see whether anything happened, which is a poor way to find
    // out you flipped the wrong thing.
    mcWrites: process.env.MC_READ_ONLY === "1" ? "blocked (dry run)" : "LIVE",
    mcStatus,
  });
}
