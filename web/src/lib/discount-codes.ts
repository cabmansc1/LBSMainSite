import "server-only";
import { getStripe, stripeEnabled } from "@/lib/stripe";

/**
 * Discount codes, made here instead of in the Stripe dashboard.
 *
 * Redeeming already worked: allow_promotion_codes is set on both
 * checkouts, so the "Add promotion code" box has always been on the
 * hosted page. Only creating one meant leaving the admin.
 *
 * Stripe splits this in two, and the split is an implementation detail
 * nobody running a postcard business should have to hold in their head:
 *
 *   Coupon          the discount itself, a percentage or an amount
 *   Promotion code  the string a customer types, pointing at a coupon
 *
 * So one call here makes both, and the screen asks for a code and an
 * amount off. Nothing is stored on our side: Stripe is the record, it
 * counts the redemptions, and a second copy here would be a second
 * answer to "is this code still good".
 */

export type DiscountCode = {
  id: string;
  code: string;
  /** Human wording of the discount, ready to print. */
  discount: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  /** Set when the code only works for one customer. */
  restrictedTo: string | null;
  firstOrderOnly: boolean;
  createdAt: string;
};

const describe = (c: {
  percent_off?: number | null;
  amount_off?: number | null;
}): string =>
  typeof c.percent_off === "number"
    ? `${c.percent_off}% off`
    : typeof c.amount_off === "number"
      ? `$${(c.amount_off / 100).toFixed(2).replace(/\.00$/, "")} off`
      : "discount";

export async function listDiscountCodes(): Promise<DiscountCode[]> {
  if (!stripeEnabled()) return [];
  try {
    const stripe = getStripe();
    const list = await stripe.promotionCodes.list({
      limit: 100,
      // The coupon carries the actual discount and is a bare id without
      // this, which would make every row read "discount".
      expand: ["data.promotion.coupon"],
    });
    return list.data.map((p) => {
      const coupon = p.promotion?.coupon;
      const amounts =
        coupon && typeof coupon === "object"
          ? coupon
          : ({} as { percent_off?: number | null; amount_off?: number | null });
      return {
        id: p.id,
        code: p.code,
        discount: describe(amounts),
        active: p.active,
        timesRedeemed: p.times_redeemed ?? 0,
        maxRedemptions: p.max_redemptions ?? null,
        expiresAt: p.expires_at
          ? new Date(p.expires_at * 1000).toISOString().slice(0, 10)
          : null,
        // Stripe returns either the id or the expanded object depending
        // on how it was created, and only one of them is worth showing.
        restrictedTo:
          typeof p.customer === "string"
            ? p.customer
            : ((p.customer as { email?: string } | null)?.email ?? null),
        firstOrderOnly: p.restrictions?.first_time_transaction ?? false,
        createdAt: new Date(p.created * 1000).toISOString().slice(0, 10),
      };
    });
  } catch (e) {
    console.error("[discounts] list failed:", e);
    return [];
  }
}

export async function createDiscountCode(input: {
  code: string;
  /** One of these two. Percent wins if both arrive. */
  percentOff?: number;
  amountOffCents?: number;
  maxRedemptions?: number;
  /** yyyy-mm-dd. */
  expiresOn?: string;
  firstOrderOnly?: boolean;
}): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  if (!stripeEnabled()) {
    return { ok: false, error: "Stripe is not configured on this deploy." };
  }

  // Stripe uppercases codes and matches them case-insensitively, so this
  // is only about what gets shown and printed.
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    return {
      ok: false,
      error: "Use 3 to 40 letters, numbers, dashes or underscores.",
    };
  }

  const percent = Number(input.percentOff);
  const amount = Number(input.amountOffCents);
  const usePercent = Number.isFinite(percent) && percent > 0;
  const useAmount = !usePercent && Number.isFinite(amount) && amount > 0;
  if (!usePercent && !useAmount) {
    return { ok: false, error: "Give a percentage or an amount off." };
  }
  if (usePercent && percent > 100) {
    return { ok: false, error: "A percentage cannot be over 100." };
  }

  let expiresAt: number | undefined;
  if (input.expiresOn?.trim()) {
    // End of the chosen day, so a code dated today still works today.
    const at = Date.parse(`${input.expiresOn}T23:59:59Z`);
    if (!Number.isFinite(at)) {
      return { ok: false, error: "That expiry date is not a date." };
    }
    if (at < Date.now()) {
      return { ok: false, error: "That expiry date has already passed." };
    }
    expiresAt = Math.floor(at / 1000);
  }

  try {
    const stripe = getStripe();

    // The coupon carries the discount; the promotion code carries the
    // string. Named after the code so the dashboard is readable if
    // somebody ever goes looking there.
    const coupon = await stripe.coupons.create({
      name: code,
      duration: "once",
      ...(usePercent
        ? { percent_off: percent }
        : { amount_off: Math.round(amount), currency: "usd" }),
    });

    await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
      ...(input.maxRedemptions && input.maxRedemptions > 0
        ? { max_redemptions: Math.round(input.maxRedemptions) }
        : {}),
      ...(input.firstOrderOnly
        ? { restrictions: { first_time_transaction: true } }
        : {}),
    });

    return { ok: true, code };
  } catch (e) {
    // Stripe's message is the useful one here: an already-used code, a
    // currency mismatch, a key without permission.
    const message =
      e && typeof e === "object" && "message" in e
        ? String((e as { message: unknown }).message)
        : "Stripe refused that.";
    console.error("[discounts] create failed:", e);
    return { ok: false, error: message };
  }
}

/**
 * Switches a code off.
 *
 * Deactivated rather than deleted, because Stripe keeps the redemptions
 * against it and a payment that has already happened should still be
 * explicable a year from now.
 */
export async function setDiscountActive(
  id: string,
  active: boolean,
): Promise<boolean> {
  if (!stripeEnabled()) return false;
  try {
    const stripe = getStripe();
    await stripe.promotionCodes.update(id, { active });
    return true;
  } catch (e) {
    console.error("[discounts] update failed:", e);
    return false;
  }
}
