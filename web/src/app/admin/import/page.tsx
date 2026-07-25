import type { Metadata } from "next";
import { ImportTool } from "@/components/import-tool";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Bulk Import",
  robots: { index: false, follow: false },
};

export default async function AdminImportPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Bulk import</h1>
        <p className="text-sm text-muted mt-1 max-w-[64ch]">
          Bring in advertisers from a spreadsheet, or backfill the public card
          gallery with past mailings. Imported advertisers arrive unverified
          and go through the normal directory review before appearing publicly.
        </p>
      </div>
      <ImportTool />
    </div>
  );
}
