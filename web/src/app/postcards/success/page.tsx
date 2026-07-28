import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/sections";
import { OrderStatus } from "@/components/order-status";
import { getSession } from "@/lib/auth";
import { getOrderBySession } from "@/lib/orders";

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

  // Buying does not create a login, so this page used to offer everyone
  // a "Go to your dashboard" button that bounced a brand new customer
  // to a login screen they had no password for, seconds after they
  // paid. Ask who they are before offering it.
  const session = await getSession().catch(() => null);
  const order = sp.session_id
    ? await getOrderBySession(sp.session_id).catch(() => null)
    : null;

  // Prefilled so the team can find the order without a back and forth,
  // and so the customer does not have to explain themselves twice.
  const setupHref =
    "mailto:hello@lbspotlight.com" +
    `?subject=${encodeURIComponent("Dashboard access" + (order?.reference ? ` for order ${order.reference}` : ""))}` +
    `&body=${encodeURIComponent(
      [
        "Please set up my advertiser dashboard.",
        order?.businessName ? `Business: ${order.businessName}` : "",
        order?.email ? `Email: ${order.email}` : "",
        order?.reference ? `Order: ${order.reference}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )}`;

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
        ) : sp.session_id ? (
          <OrderStatus sessionId={sp.session_id} />
        ) : (
          <p className="text-[14.5px] text-body max-w-[44ch]">
            Payment received. Check your email for a receipt and next steps for
            your ad artwork.
          </p>
        )}
        {!isPreview && !session && (
          <p className="text-[13.5px] text-body max-w-[46ch] bg-surface border border-line rounded-[10px] px-4 py-3">
            <b>What happens next.</b> We will email you about your ad artwork,
            and design it for you if you would rather. You do not need an
            account for any of that. If you want a dashboard to track this
            campaign and your future ones, ask us and we will set it up.
          </p>
        )}

        <div className="flex gap-3 flex-wrap justify-center mt-2">
          {session ? (
            <Link
              href="/account"
              className="bg-navy-950 text-white font-semibold text-[14.5px] px-5 py-2.5 rounded-(--radius-btn) hover:bg-navy-800 transition-colors"
            >
              Go to your dashboard
            </Link>
          ) : (
            <a
              href={setupHref}
              className="bg-navy-950 text-white font-semibold text-[14.5px] px-5 py-2.5 rounded-(--radius-btn) hover:bg-navy-800 transition-colors"
            >
              Set up my dashboard
            </a>
          )}
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
