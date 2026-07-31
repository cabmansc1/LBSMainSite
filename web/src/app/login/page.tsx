import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/sections";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Advertiser Login",
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  if (await getSession()) redirect("/account");
  // Carried from the success page, so someone who just paid never
  // retypes the address they typed at checkout.
  const { email } = await searchParams;

  return (
    <div className="mx-auto max-w-[440px] px-6 py-18">
      <Card className="p-8 grid gap-5">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.025em]">
            Advertiser login
          </h1>
          <p className="text-[13.5px] text-muted mt-1">
            We will email you a code. Your existing password still works
            too.
          </p>
        </div>
        <LoginForm initialEmail={email ?? ""} />
        <div className="text-[13px] text-muted grid gap-1.5 border-t border-line pt-4">
          <Link href="/forgot-password" className="text-brand-deep font-semibold hover:underline">
            Forgot your password?
          </Link>
          <span className="text-faint">
            Bought a spot? Your account is already set up. Use the email you
            paid with.
          </span>
          {!process.env.DB_HOST && (
            <span className="text-faint">
              Preview mode: sign in with demo@lbspotlight.com / demo1234
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
