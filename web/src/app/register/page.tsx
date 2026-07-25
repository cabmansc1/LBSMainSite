import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/sections";

export const metadata: Metadata = {
  title: "Create an Account",
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-[480px] px-6 py-18">
      <Card className="p-8 grid gap-4">
        <h1 className="text-[24px] font-bold tracking-[-0.025em]">
          Create your account
        </h1>
        <p className="text-[14px] text-body leading-relaxed">
          Self-serve signup connects with the staging database. Until then our
          team sets accounts up same-day:
        </p>
        <a
          href="mailto:hello@lbspotlight.com?subject=New%20advertiser%20account"
          className="bg-cta text-navy-950 font-semibold text-[14.5px] px-5 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors text-center"
        >
          Email us to get set up
        </a>
        <p className="text-[13px] text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-deep font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
