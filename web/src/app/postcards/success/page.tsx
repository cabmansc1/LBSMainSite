import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/sections";
import { OrderStatus } from "@/components/order-status";
import { LeadConversion } from "@/components/analytics";
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

  // The order is read for the email, so the sign-in link can carry it
  // and the customer never retypes what they just typed at checkout.
  const session = await getSession().catch(() => null);
  const order = sp.session_id
    ? await getOrderBySession(sp.session_id).catch(() => null)
    : null;

  return (
    <div className="mx-auto max-w-[640px] px-6 py-20">
      {/* thank_you.php's conversion pair, at the same moment: a real
          checkout came back from Stripe. Preview mode is skipped because
          nothing was charged, which is the same reason the PHP gated the
          Ads conversion on a genuine submission rather than on the page
          simply being open. */}
      {!isPreview && sp.session_id && (
        <LeadConversion dedupeKey={sp.session_id} />
      )}
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
            and design it for you if you would rather. Your dashboard is
            already set up: sign in with{" "}
            {order?.email ? <b>{order.email}</b> : "the email you just used"}{" "}
            and we will send you a code. No password to invent.
          </p>
        )}

        <div className="flex gap-3 flex-wrap justify-center mt-2">
          {/* Signed in already, or straight to sign-in with the email
              they just paid with filled in. Either way the button means
              the same thing now, which it did not before the account
              was created at purchase. */}
          <Link
            href={
              session
                ? "/account"
                : order?.email
                  ? `/login?email=${encodeURIComponent(order.email)}`
                  : "/login"
            }
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
