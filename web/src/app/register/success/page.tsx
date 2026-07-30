import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};

/**
 * Where Stripe returns a new Premium subscriber.
 *
 * Deliberately reads nothing and confirms nothing about the payment.
 * The webhook is the only thing that verifies a listing and puts it on
 * the paid plan, exactly as it is for postcard orders, so a page that
 * announced "you are live" could be announcing it before it is true, or
 * after a payment that later failed.
 */
export default function RegisterSuccessPage() {
  return (
    <div className="mx-auto max-w-[560px] px-6 py-18">
      <Card className="p-8 grid gap-3.5">
        <h1 className="text-[24px] font-bold tracking-[-0.025em]">
          Thank you. You are all set.
        </h1>
        <p className="text-[14px] text-body leading-relaxed">
          Your Premium listing goes live as soon as the payment clears, which
          is usually seconds. We will email you when it is published.
        </p>
        <p className="text-[14px] text-body leading-relaxed">
          To edit it, sign in with the email address you paid with and we will
          send you a code. There is no password to remember.
        </p>
        <Link
          href="/login"
          className="justify-self-start text-[14px] font-semibold px-4 py-2.5 rounded-(--radius-btn) bg-navy-950 text-white hover:bg-navy-800"
        >
          Sign in
        </Link>
      </Card>
    </div>
  );
}
