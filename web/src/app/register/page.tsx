import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/sections";
import { RegisterForm } from "@/components/register-form";
import { getFilterOptions } from "@/lib/directory";
import {
  annualSavingCents,
  getLiveDirectoryPricing,
  money,
} from "@/lib/directory-pricing";
import { stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Create an Account",
  robots: { index: false, follow: true },
};

/**
 * Self-serve signup. This page used to tell people to email us, which
 * meant no business could list itself and every listing was data entry
 * for somebody here.
 */
export default async function RegisterPage() {
  const [options, pricing] = await Promise.all([
    getFilterOptions(),
    getLiveDirectoryPricing(),
  ]);
  const saving = annualSavingCents(pricing);

  return (
    <div className="mx-auto max-w-[720px] px-6 py-14">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-[-0.03em]">
          List your business
        </h1>
        <p className="text-sm text-muted mt-1.5">
          Free forever, or Premium for photos, hours, offers and featured
          placement. Already with us?{" "}
          <Link href="/login" className="text-brand-deep font-semibold hover:underline">
            Sign in
          </Link>
          .
        </p>
      </div>
      <Card className="p-6 md:p-8">
        <RegisterForm
          categories={options.categories}
          locations={options.locations}
          monthly={money(pricing.monthlyCents)}
          annual={money(pricing.annualCents)}
          annualSaving={saving === null ? null : money(saving)}
          paymentsOn={stripeEnabled()}
        />
      </Card>
    </div>
  );
}
