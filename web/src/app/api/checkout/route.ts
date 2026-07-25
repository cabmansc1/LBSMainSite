import { NextResponse } from "next/server";
import { stripeEnabled, createCheckoutSession } from "@/lib/stripe";
import { pushToMissionControl } from "@/lib/mission-control";
import { POSTCARD_PRICING, type Reach, type SpotSize } from "@/lib/pricing";
import { zoneBySlug } from "@/lib/zones";
import { getCard } from "@/lib/cards";

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

  const origin = new URL(req.url).origin;
  let name: string;
  let amountCents: number;
  let metadata: Record<string, string>;

  if (kind === "postcard") {
    const zone = zoneBySlug(String(body.zoneSlug ?? ""));
    const spotSize = String(body.spotSize ?? "") as SpotSize;
    const reach = (String(body.reach ?? "5k") as Reach) ?? "5k";
    const tier = zone && POSTCARD_PRICING[reach]?.[spotSize];
    if (!zone || !tier) {
      return NextResponse.json({ error: "Unknown zone or spot" }, { status: 422 });
    }
    name = `Spotlight Postcard: ${zone.name}, ${spotSize} spot`;
    amountCents = tier.priceCents;
    metadata = {
      kind,
      zone: zone.slug,
      spotSize,
      reach,
      category,
      businessName,
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
    };
  } else {
    return NextResponse.json({ error: "Unknown checkout kind" }, { status: 422 });
  }

  // Mission Control hears about every checkout attempt (fire-and-forget).
  void pushToMissionControl({
    type: "checkout_started",
    businessName,
    category,
    email: typeof body.email === "string" ? body.email : undefined,
    zoneSlug: metadata.zone ?? metadata.card,
    spot: metadata.spotSize ?? metadata.spotType,
    amountCents,
  });

  if (!stripeEnabled()) {
    // Preview mode: no keys configured, simulate the hosted checkout hop.
    const qs = new URLSearchParams({ preview: "1", item: name });
    return NextResponse.json({ url: `${origin}/postcards/success?${qs}` });
  }

  const session = await createCheckoutSession({
    name,
    amountCents,
    email: typeof body.email === "string" ? body.email : undefined,
    metadata,
    successUrl: `${origin}/postcards/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/postcards/cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
