import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createDiscountCode, setDiscountActive } from "@/lib/discount-codes";

/** Making and switching off discount codes. Admin only: a code is money. */
export async function POST(req: Request) {
  await requireAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "deactivate" || body.action === "activate") {
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "Which code?" }, { status: 422 });
    }
    const ok = await setDiscountActive(id, body.action === "activate");
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Stripe refused that." }, { status: 502 });
  }

  const result = await createDiscountCode({
    code: String(body.code ?? ""),
    percentOff: Number(body.percentOff) || undefined,
    // Entered in dollars, because nobody negotiates in cents.
    amountOffCents: Number(body.amountOffDollars)
      ? Math.round(Number(body.amountOffDollars) * 100)
      : undefined,
    maxRedemptions: Number(body.maxRedemptions) || undefined,
    expiresOn: String(body.expiresOn ?? ""),
    firstOrderOnly: body.firstOrderOnly === true,
  });

  return result.ok
    ? NextResponse.json({ ok: true, code: result.code })
    : NextResponse.json({ error: result.error }, { status: 422 });
}
