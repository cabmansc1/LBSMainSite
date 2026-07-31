import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/sections";

export const metadata: Metadata = {
  title: "Reset Your Password",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-[480px] px-6 py-18">
      <Card className="p-8 grid gap-4">
        <h1 className="text-[24px] font-bold tracking-[-0.025em]">
          Reset your password
        </h1>
        <p className="text-[14px] text-body leading-relaxed">
          Email reset links connect with the staging mail service. Until then,
          email us and we will reset it for you same-day.
        </p>
        <a
          href="mailto:hello@lowcountrybusinessspotlight.com?subject=Password%20reset"
          className="bg-navy-950 text-white font-semibold text-[14.5px] px-5 py-3 rounded-(--radius-btn) hover:bg-navy-800 transition-colors text-center"
        >
          Email us to reset
        </a>
        <p className="text-[13px] text-muted">
          Remembered it?{" "}
          <Link href="/login" className="text-brand-deep font-semibold hover:underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
