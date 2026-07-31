import "server-only";
import { NextResponse } from "next/server";
import { getSession, isImpersonating } from "@/lib/auth";
import { getListingForAccount, type AccountListing } from "@/lib/listing-edits";
import { isPremiumPlan } from "@/lib/directory-subscriptions";
import {
  WRITES_BLOCKED_MESSAGE,
  directoryWritesBlocked,
  logBlockedWrite,
} from "@/lib/write-guard";

/**
 * The checks every advertiser write to a listing has to pass.
 *
 * There are three of these endpoints now, and the answer to "may this
 * request touch this listing" must not differ between them. Written
 * once so that adding a fourth cannot quietly skip one: the failure
 * mode of copying the checks is a new endpoint that forgets the
 * impersonation refusal, and nobody notices until support edits
 * somebody's page.
 */
export type Allowed = { listing: AccountListing };
export type Denied = { response: NextResponse };

export function isDenied(r: Allowed | Denied): r is Denied {
  return "response" in r;
}

export async function authorizeListingWrite(
  businessId: number,
  opts: { requirePremium?: boolean; what: string } = { what: "listing write" },
): Promise<Allowed | Denied> {
  const session = await getSession();
  if (!session) {
    return { response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }

  // Support can look, not touch.
  if (isImpersonating(session)) {
    return {
      response: NextResponse.json(
        { error: "You are viewing as this advertiser. Stop to make changes." },
        { status: 403 },
      ),
    };
  }

  if (directoryWritesBlocked()) {
    logBlockedWrite(opts.what, { by: session.email, businessId });
    return {
      response: NextResponse.json({ error: WRITES_BLOCKED_MESSAGE }, { status: 503 }),
    };
  }

  if (!businessId) {
    return {
      response: NextResponse.json({ error: "A listing id is required" }, { status: 422 }),
    };
  }

  let listing;
  try {
    listing = await getListingForAccount(session, businessId);
  } catch (e) {
    // "Not yours" and "we could not ask" must not answer the same way.
    console.error(`[listing-guard] lookup failed for ${opts.what}:`, e);
    return {
      response: NextResponse.json(
        { error: "We could not reach your listing just now." },
        { status: 500 },
      ),
    };
  }

  if (!listing) {
    return {
      response: NextResponse.json(
        { error: "We could not find that listing." },
        { status: 404 },
      ),
    };
  }

  if (!listing.owned) {
    return {
      response: NextResponse.json(
        { error: "Claim this listing before editing it." },
        { status: 403 },
      ),
    };
  }

  // Checked on the server as well as hidden in the UI. A disabled
  // control is a courtesy; this is the part that actually decides
  // whether somebody gets a feature they have not paid for.
  if (opts.requirePremium && !isPremiumPlan(listing.planType)) {
    return {
      response: NextResponse.json(
        { error: "Photos and offers are part of Premium.", upgrade: true },
        { status: 402 },
      ),
    };
  }

  return { listing };
}
