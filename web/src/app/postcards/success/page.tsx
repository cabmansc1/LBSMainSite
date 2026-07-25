import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; item?: string; session_id?: string }>;
}) {
  const sp = await searchParams;
  const isPreview = sp.preview === "1";

  return (
    <div className="mx-auto max-w-[640px] px-6 py-20">
      <Card className="p-9 grid gap-4 text-center justify-items-center">
        <span className="w-13 h-13 rounded-full bg-[#e5f5ec] text-ok flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
        <h1 className="text-[26px] font-bold tracking-[-0.025em]">
          {isPreview ? "Checkout flow verified" : "You're on the card"}
        </h1>
        {isPreview ? (
          <p className="text-[14.5px] text-body max-w-[44ch]">
            Preview mode: no payment was processed because Stripe keys are not
            configured in this environment. On staging this page confirms the
            paid order{sp.item ? ` for “${sp.item}”` : ""} after the webhook
            verifies it.
          </p>
        ) : (
          <p className="text-[14.5px] text-body max-w-[44ch]">
            Payment received. Your category is now locked on this mailing.
            Check your email for a receipt and next steps for your ad artwork.
          </p>
        )}
        <div className="flex gap-3 flex-wrap justify-center mt-2">
          <Link
            href="/account"
            className="bg-navy-950 text-white font-semibold text-[14.5px] px-5 py-2.5 rounded-(--radius-btn) hover:bg-navy-800 transition-colors"
          >
            Go to your dashboard
          </Link>
          <Link
            href="/"
            className="bg-white text-ink border border-line-strong font-semibold text-[14.5px] px-5 py-2.5 rounded-(--radius-btn) hover:border-faint transition-colors"
          >
            Back to home
          </Link>
        </div>
      </Card>
    </div>
  );
}
