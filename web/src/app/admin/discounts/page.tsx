import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { listDiscountCodes } from "@/lib/discount-codes";
import { stripeEnabled } from "@/lib/stripe";
import { AdminDiscounts } from "@/components/admin-discounts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Discount codes",
  robots: { index: false, follow: false },
};

/**
 * Codes for the one-offs.
 *
 * Redeeming has always worked; the box is on the hosted checkout page
 * already. Making one meant opening the Stripe dashboard, which is a
 * different set of words for the same thing and one more place to be
 * logged into.
 */
export default async function AdminDiscountsPage() {
  await requireAdmin();
  const codes = await listDiscountCodes();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 max-w-[74ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          Discount codes
        </h1>
        <p className="text-sm text-muted mt-1">
          A code a customer types at checkout. Good for a one-off: a
          promotion, an apology, a deal agreed on the phone. For an account
          that always pays a different price, set an agreed rate instead so
          they never have to type anything.
        </p>
      </div>

      <AdminDiscounts codes={codes} enabled={stripeEnabled()} />

      <p className="text-[12.5px] text-muted mt-5 max-w-[74ch]">
        Stripe holds these, counts the redemptions and enforces the limits, so
        what is listed here is what is really live. Switching one off leaves
        its history intact, which is why nothing is ever deleted: a payment
        made last spring should still be explicable next spring.
      </p>
    </div>
  );
}
