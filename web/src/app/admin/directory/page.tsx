import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAdminBusinesses } from "@/lib/admin-data";
import { getFilterOptions } from "@/lib/directory";
import { getAdvertiserIndex } from "@/lib/customer-type";
import { AdminDirectory } from "@/components/admin-directory";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Directory listings",
  robots: { index: false, follow: false },
};

/** Successor to admin/manage_directory.php: same tables, same effects. */
export default async function AdminDirectoryPage() {
  await requireAdmin();
  // The same taxonomy the public filters and the advertiser portal use.
  // Category and location area are stored as slugs and filtered on as
  // slugs, so typing them by hand produced listings that rendered
  // correctly and appeared under nothing.
  const [businesses, options] = await Promise.all([
    getAdminBusinesses(),
    getFilterOptions(),
  ]);
  // Real views over the last 30 days. The legacy column stopped moving
  // when traffic came here, so a small number now is correct rather than
  // broken: counting started when this did.
  const { viewsFor } = await import("@/lib/listing-views");
  const views = await viewsFor(businesses.map((b) => b.id), 30);
  for (const b of businesses) b.views = views.get(b.id) ?? 0;

  // Needs the listings themselves, because an advertiser is matched to
  // one by name as well as by email.
  const advertisers = await getAdvertiserIndex(
    businesses.map((b) => ({
      id: b.id,
      name: b.name,
      email: b.email ?? "",
    })),
  );

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          Directory listings
        </h1>
        <p className="text-sm text-muted mt-1">
          Edit any listing, change its plan, and toggle featured, verified, or
          hidden. Changes write to the same tables the live site reads, so they
          appear immediately on both sites.
        </p>
      </div>
      <AdminDirectory
        businesses={businesses}
        categories={options.categories}
        locations={options.locations}
        advertiserIds={[...advertisers.businessIds]}
        missionControlRead={advertisers.missionControl}
      />
    </div>
  );
}
