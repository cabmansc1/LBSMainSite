import type { Metadata } from "next";
import { QrStudio } from "@/components/qr-studio";
import { requireAdmin } from "@/lib/admin";
import { getBusinesses } from "@/lib/directory";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "QR Codes",
  robots: { index: false, follow: false },
};

export default async function AdminQrPage() {
  await requireAdmin();
  const businesses = await getBusinesses();
  const advertisers = businesses.map((b, i) => ({
    slug: b.slug,
    name: b.name,
    scans: [148, 96, 41, 22, 63, 12][i] ?? 0,
  }));

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">QR codes</h1>
        <p className="text-sm text-muted mt-1">
          Print-ready branded QR codes. Each points at the advertiser&apos;s
          tracked landing page, so every scan shows up in their dashboard.
        </p>
      </div>
      <QrStudio advertisers={advertisers} />
    </div>
  );
}
