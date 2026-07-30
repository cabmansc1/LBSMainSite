import { after, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { registerBusiness, type Plan } from "@/lib/registration";
import { getLiveDirectoryPricing, money } from "@/lib/directory-pricing";
import { createSubscriptionSession, stripeEnabled } from "@/lib/stripe";
import {
  WRITES_BLOCKED_MESSAGE,
  directoryWritesBlocked,
  logBlockedWrite,
} from "@/lib/write-guard";

/**
 * Self-serve directory signup.
 *
 * Free listings finish here, unverified, and wait for an admin.
 * Premium listings are created the same way and then handed to Stripe;
 * the webhook is what verifies them and puts them on the paid plan, so
 * a customer who abandons the payment page leaves an unverified listing
 * behind rather than a free Premium one.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Registration creates a listing, so it is a directory write like any
  // other and must not run against the live database from staging.
  if (directoryWritesBlocked()) {
    logBlockedWrite("registration", body);
    return NextResponse.json({ error: WRITES_BLOCKED_MESSAGE }, { status: 503 });
  }

  const plan = (["basic", "monthly", "annual"] as Plan[]).includes(
    body.plan as Plan,
  )
    ? (body.plan as Plan)
    : "basic";

  // A honeypot, matching the lead forms. A bot that fills every field
  // gets a success it can do nothing with.
  if (String(body.company_website ?? "").trim() !== "") {
    return NextResponse.json({ ok: true, listed: true });
  }

  const pricing = await getLiveDirectoryPricing();
  const amountCents =
    plan === "annual" ? pricing.annualCents : pricing.monthlyCents;

  // A paid plan priced at zero is an admin having taken that term off
  // sale. Sending somebody to Stripe for $0 would fail there instead of
  // here, which is a worse place to find out.
  if (plan !== "basic" && amountCents <= 0) {
    return NextResponse.json(
      { error: "That plan is not available right now. Please get in touch." },
      { status: 422 },
    );
  }
  if (plan !== "basic" && !stripeEnabled()) {
    return NextResponse.json(
      { error: "Card payments are not set up yet. Please get in touch." },
      { status: 503 },
    );
  }

  let result;
  try {
    result = await registerBusiness({
      businessName: String(body.businessName ?? ""),
      contactName: String(body.contactName ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      website: String(body.website ?? ""),
      description: String(body.description ?? ""),
      category: String(body.category ?? ""),
      locationArea: String(body.locationArea ?? ""),
      plan,
    });
  } catch (e) {
    console.error("[register] failed:", e);
    return NextResponse.json(
      { error: "We could not create your listing just now." },
      { status: 500 },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, fields: result.errors },
      { status: 422 },
    );
  }

  if (!result.needsPayment) {
    // Nothing is public yet, so nothing to revalidate. Telling us is
    // what matters: an unverified listing nobody looks at is the same
    // as no listing at all.
    after(async () => {
      const { sendSignupAlert } = await import("@/lib/registration-emails");
      await sendSignupAlert({
        businessName: String(body.businessName ?? ""),
        email: String(body.email ?? ""),
        plan: "basic",
        businessId: result.businessId,
        slug: result.slug,
        siteOrigin: process.env.SITE_ORIGIN?.trim() || undefined,
      });
    });
    return NextResponse.json({ ok: true, listed: true });
  }

  const origin =
    process.env.SITE_ORIGIN?.trim() || new URL(req.url).origin;
  try {
    const session = await createSubscriptionSession({
      name: `Directory Premium (${plan === "annual" ? "yearly" : "monthly"}) — ${money(amountCents)}`,
      amountCents,
      interval: plan === "annual" ? "year" : "month",
      email: String(body.email ?? "").trim().toLowerCase(),
      metadata: {
        kind: "directory_premium",
        businessId: String(result.businessId),
        term: plan,
      },
      successUrl: `${origin}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/register?cancelled=1`,
    });
    revalidatePath("/admin/directory");
    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    // The listing exists and the account exists; only the payment hop
    // failed. Say so rather than implying nothing happened, because a
    // retry must not try to register the same address twice.
    console.error("[register] subscription session failed:", e);
    return NextResponse.json(
      {
        error:
          "Your listing was created but we could not open the payment page. Sign in and you can subscribe from your account.",
      },
      { status: 502 },
    );
  }
}
