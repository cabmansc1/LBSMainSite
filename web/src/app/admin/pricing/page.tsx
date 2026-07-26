import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getLivePricing } from "@/lib/pricing-store";
import { AdminPricing } from "@/components/admin-pricing";
import { ALL_SIZES, type Reach } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pricing",
  robots: { index: false, follow: false },
};

/**
 * Postcard pricing used to live in pricing_config.php and could only be
 * changed by editing code. It is editable here now; saved values take
 * effect on the pricing, advertise, calculator, and checkout pages.
 */
export default async function AdminPricingPage() {
  await requireAdmin();
  const pricing = await getLivePricing();

  const rows = (["5k", "10k"] as Reach[]).flatMap((reach) =>
    ALL_SIZES.map((size) => ({
      reach,
      size,
      label: pricing[reach][size].size,
      cents: pricing[reach][size].priceCents,
    })),
  );

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Pricing</h1>
        <p className="text-sm text-muted mt-1">
          Set what each ad size costs at both reach levels. Saving updates the
          pricing page, zone pages, the ROI calculator, and checkout right
          away, with no deploy. A price of zero means that size is not sold
          at that reach.
        </p>
      </div>
      <AdminPricing initial={rows} />
    </div>
  );
}
