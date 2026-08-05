import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { ALL_SIZES, type Reach, type SpotSize } from "@/lib/pricing";
import { getLivePricing } from "@/lib/pricing-store";
import { getAllRates } from "@/lib/advertiser-rates";
import { AdminRates } from "@/components/admin-rates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Agreed rates",
  robots: { index: false, follow: false },
};

/**
 * Accounts that pay something other than the list price.
 *
 * Honouring one used to mean taking the payment outside the site, which
 * is how an advertiser ends up with no order, no receipt and no card in
 * their portal. Now they buy through checkout like anybody else and are
 * charged what was agreed.
 */
export default async function AdminRatesPage() {
  await requireAdmin();
  const [rates, pricing] = await Promise.all([getAllRates(), getLivePricing()]);

  const cells = (Object.keys(pricing) as Reach[]).flatMap((reach) =>
    ALL_SIZES.map((size: SpotSize) => ({
      reach,
      size,
      label: pricing[reach][size].size,
      listCents: pricing[reach][size].priceCents,
    })),
  );

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 max-w-[74ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Agreed rates</h1>
        <p className="text-sm text-muted mt-1">
          What a particular advertiser pays, instead of the prices under
          Pricing. The rate is read from their sign-in, so the checkout page
          quotes it and the payment charges it from the same place, and the
          two cannot disagree.
        </p>
      </div>

      <AdminRates rates={rates} cells={cells} />

      <p className="text-[12.5px] text-muted mt-5 max-w-[74ch]">
        A rate only applies when they are signed in. Somebody buying signed
        out pays list, because there is nothing to identify them by until
        Stripe has their email, and by then the price is already set. For a
        one-off discount that works either way, make a code under Discount
        codes instead.
      </p>
    </div>
  );
}
