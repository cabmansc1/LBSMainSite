import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAdsense, listAds } from "@/lib/ads";
import { getFilterOptions } from "@/lib/directory";
import { AdminAds } from "@/components/admin-ads";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ad spaces",
  robots: { index: false, follow: false },
};

/**
 * What runs in the four advertising positions on a listing page.
 *
 * A slot can be sold to a sponsor, left to Google, or left empty. Empty
 * renders nothing at all on the site, so an unsold position costs the
 * page nothing.
 */
export default async function AdminAdsPage() {
  await requireAdmin();
  const [ads, adsense, options] = await Promise.all([
    listAds(),
    getAdsense(),
    getFilterOptions(),
  ]);

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 max-w-[74ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Ad spaces</h1>
        <p className="text-sm text-muted mt-1">
          Four positions on every directory listing page. Upload a sponsor&rsquo;s
          artwork with a link and a date window, or leave a slot to Google.
          Featured listings carry no advertising, so a paying advertiser is
          never shown a competitor.
        </p>
      </div>

      <AdminAds
        ads={ads}
        adsense={adsense}
        categories={options.categories}
        locations={options.locations}
      />
    </div>
  );
}
