import { NextResponse } from "next/server";
import { getSession, isImpersonating } from "@/lib/auth";
import { stripeEnabled, createCheckoutSession } from "@/lib/stripe";
import {
  pushToMissionControl,
  getTakenCategories,
  getTakenCategoriesForCard,
} from "@/lib/mission-control";
import {
  createPendingOrder,
  attachSession,
  newReference,
} from "@/lib/orders";
import { type Reach, type SpotSize } from "@/lib/pricing";
import { getLivePricing } from "@/lib/pricing-store";
import { zoneBySlug } from "@/lib/zones";
import { getCard } from "@/lib/cards";
import { publicOrigin } from "@/lib/origin";

/**
 * Creates a pending order and a Stripe Checkout session.
 *
 * With a database configured this wraps the insert in a transaction with
 * SELECT ... FOR UPDATE on the mailing/card row, replicating the
 * oversell and category-exclusivity protection from
 * neighborhood-card-checkout.php. Until staging credentials exist, the
 * validation runs and the redirect is simulated (preview mode), so the
 * full flow is clickable end to end.
 */
export async function POST(req: Request) {
  // Checkout is open to signed-out visitors, so this only rejects the
  // one case that must never happen: an admin viewing as someone else
  // starting a payment in their name.
  if (isImpersonating(await getSession().catch(() => null))) {
    return NextResponse.json(
      { error: "You are viewing as an advertiser. Stop before buying." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const kind = String(body.kind ?? "");
  const businessName = String(body.businessName ?? "").trim();
  const category = String(body.category ?? "").trim();

  if (businessName.length < 2 || businessName.length > 128 || !category) {
    return NextResponse.json(
      { error: "Business name and category are required." },
      { status: 422 },
    );
  }

  // Shared with registration, which had its own weaker version: see
  // lib/origin.ts for why req.url is never enough behind a proxy.
  const origin = publicOrigin(req);
  // Declared before the metadata blocks below, which carry the phone
  // through Stripe. Leaving these further down put `phone` in the
  // temporal dead zone at the point the postcard branch read it.
  const email = typeof body.email === "string" ? body.email : undefined;
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;

  let name: string;
  let amountCents: number;
  let metadata: Record<string, string>;

  if (kind === "postcard") {
    const zone = zoneBySlug(String(body.zoneSlug ?? ""));
    const spotSize = String(body.spotSize ?? "") as SpotSize;
    const reach = (String(body.reach ?? "5k") as Reach) ?? "5k";
    const pricing = await getLivePricing();
    const tier = zone && pricing[reach]?.[spotSize];
    if (!zone || !tier) {
      return NextResponse.json({ error: "Unknown zone or spot" }, { status: 422 });
    }
    // Category exclusivity is the product promise: never sell a category
    // Mission Control already shows as taken on that zone's card.
    // Exclusivity is per card, not per zone: a zone can have several
    // cards filling, and the same category may be free on one and taken
    // on another.
    const cardId = typeof body.cardId === "string" ? body.cardId : undefined;
    const taken = await (cardId
      ? getTakenCategoriesForCard(cardId)
      : getTakenCategories(zone.slug)
    ).catch(() => [] as string[]);
    const normalize = (v: string) => v.trim().toLowerCase();
    if (taken.some((t) => normalize(t) === normalize(category))) {
      return NextResponse.json(
        {
          error:
            "That category is already taken on this card. Join the waitlist and we will tell you when it opens.",
        },
        { status: 409 },
      );
    }
    name = `Spotlight Postcard: ${zone.name}, ${spotSize} spot`;
    amountCents = tier.priceCents;
    metadata = {
      kind,
      zone: zone.slug,
      ...(cardId ? { cardId } : {}),
      spotSize,
      reach,
      category,
      businessName,
      // Carried so the paid push can put it on the MC advertiser
      // record. Stripe metadata is the only thing that survives the
      // round trip to the hosted page and back into the webhook.
      ...(phone ? { phone } : {}),
    };
  } else if (kind === "neighborhood-card") {
    const card = await getCard(String(body.cardSlug ?? ""));
    const spotType = String(body.spotType ?? "");
    const spot = card?.spotTypes.find((t) => t.key === spotType);
    if (!card || !spot || card.status !== "open") {
      return NextResponse.json({ error: "Unknown card or spot" }, { status: 422 });
    }
    if (card.takenCategories.includes(category)) {
      return NextResponse.json(
        { error: "That category is already taken on this card." },
        { status: 409 },
      );
    }
    name = `${card.name} Neighborhood Card: ${spot.name} spot`;
    amountCents = spot.priceCents;
    metadata = {
      kind,
      card: card.slug,
      positionId: String(body.positionId ?? ""),
      spotType,
      category,
      businessName,
      ...(phone ? { phone } : {}),
    };
  } else {
    return NextResponse.json({ error: "Unknown checkout kind" }, { status: 422 });
  }

  // A price of zero means "not sold at this reach", which is exactly
  // what the pricing admin says it means. Handing it to Stripe anyway
  // creates a session with nothing to collect, and Stripe reports that
  // as no_payment_required, which the webhook treats as settled: the
  // spot would be placed, the receipt sent and the category locked, for
  // nothing. Refuse before the money path, not after it.
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json(
      { error: "That option is not on sale right now. Please get in touch." },
      { status: 422 },
    );
  }

  const reference = newReference();

  // Record the intent before handing off to Stripe, so a payment always
  // has something on our side to reconcile against.
  await createPendingOrder({
    reference,
    kind,
    businessName,
    email,
    phone,
    category,
    zoneSlug: metadata.zone ?? metadata.card ?? "",
    cardId: metadata.cardId,
    spot: metadata.spotSize ?? metadata.spotType ?? "",
    reach: metadata.reach,
    amountCents,
  });
  metadata.reference = reference;

  // Mission Control hears about every checkout attempt (fire-and-forget).
  void pushToMissionControl({
    type: "checkout_started",
    businessName,
    category,
    email,
    phone,
    zoneSlug: metadata.zone ?? metadata.card,
    cardId: metadata.cardId,
    spot: metadata.spotSize ?? metadata.spotType,
    amountCents,
    reference,
  });

  if (!stripeEnabled()) {
    // Preview mode: no keys configured, simulate the hosted checkout hop.
    const qs = new URLSearchParams({ preview: "1", item: name, ref: reference });
    return NextResponse.json({ url: `${origin}/postcards/success?${qs}` });
  }

  const session = await createCheckoutSession({
    name,
    amountCents,
    email,
    metadata,
    successUrl: `${origin}/postcards/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/postcards/cancelled`,
  });

  await attachSession(reference, session.id);

  return NextResponse.json({ url: session.url });
}
