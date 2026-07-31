import { after, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeListingWrite, isDenied } from "@/lib/listing-guard";
import { clearOffer, saveOffer } from "@/lib/business-offers";

/**
 * The special offer on a listing. A Premium feature, so gated.
 *
 * Publishes immediately, like the other things an advertiser controls
 * about their own page. An offer is time-sensitive by nature and a
 * review queue would routinely make it late.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const businessId = Number(body.businessId);
  const auth = await authorizeListingWrite(businessId, {
    requirePremium: true,
    what: "offer save",
  });
  if (isDenied(auth)) return auth.response;

  const saved = await saveOffer(businessId, {
    title: String(body.title ?? ""),
    description: String(body.description ?? ""),
    terms: String(body.terms ?? ""),
    expiresAt: String(body.expiresAt ?? ""),
  });
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: 422 });
  }

  after(() => {
    revalidatePath("/directory");
    revalidatePath(`/business/${auth.listing.slug}`);
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  let body: { businessId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const businessId = Number(body.businessId);
  // Not gated, for the same reason deleting a photo is not: taking your
  // own offer down must not require a subscription.
  const auth = await authorizeListingWrite(businessId, { what: "offer clear" });
  if (isDenied(auth)) return auth.response;

  await clearOffer(businessId);

  after(() => {
    revalidatePath("/directory");
    revalidatePath(`/business/${auth.listing.slug}`);
  });

  return NextResponse.json({ ok: true });
}
