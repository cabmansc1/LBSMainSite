import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/sections";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.role === "admin") redirect("/admin");

  return (
    <div className="mx-auto max-w-[420px] px-6 py-18">
      <Card className="p-8 grid gap-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.025em]">Admin login</h1>
          <p className="text-[13px] text-muted mt-1">
            Your existing admin credentials work here.
          </p>
        </div>
        <AdminLoginForm />
        {!process.env.DB_HOST && (
          <p className="text-[12px] text-faint border-t border-line pt-3.5">
            Preview mode: admin@lbspotlight.com / admin1234
          </p>
        )}
      </Card>
    </div>
  );
}
