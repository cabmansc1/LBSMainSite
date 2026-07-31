import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getPendingEdits } from "@/lib/listing-edits";
import { AdminListingEdits } from "@/components/admin-listing-edits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Listing changes",
  robots: { index: false, follow: false },
};

/**
 * The review half of the advertiser portal's edit split.
 *
 * Only name, category and location area reach this page. Everything
 * else an advertiser can edit publishes without asking, so a queue that
 * is empty most of the time is the intended state rather than a sign
 * that nobody is using the portal.
 */
export default async function AdminListingEditsPage() {
  await requireAdmin();
  const rows = await getPendingEdits();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          Listing changes
        </h1>
        <p className="text-sm text-muted mt-1 max-w-[70ch]">
          Advertisers asked to change these. They decide where a listing
          appears and which business we match ads to, so they wait for you.
          Approving publishes it straight away and leaves the listing&rsquo;s
          web address alone, so anything already printed keeps working.
        </p>
      </div>
      <AdminListingEdits rows={rows} />
    </div>
  );
}
