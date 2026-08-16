import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAdminBusinesses } from "@/lib/admin-data";
import { getFilterOptions } from "@/lib/directory";
import { getAdvertiserIndex } from "@/lib/customer-type";
import { AdminDirectory } from "@/components/admin-directory";
import { parseViewWindow } from "@/lib/view-windows";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Directory listings",
  robots: { index: false, follow: false },
};

/** Successor to admin/manage_directory.php: same tables, same effects. */
export default async function AdminDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  // In the URL rather than in component state, so the window survives a
  // refresh and can be sent to somebody. Validated against the list of
  // choices: ?days= is something anybody can type, and a free-form
  // window would put a number on screen that no label accounts for.
  const windowDays = parseViewWindow((await searchParams).days);
  // The same taxonomy the public filters and the advertiser portal use.
  // Category and location area are stored as slugs and filtered on as
  // slugs, so typing them by hand produced listings that rendered
  // correctly and appeared under nothing.
  const [businesses, options] = await Promise.all([
    getAdminBusinesses(),
    getFilterOptions(),
  ]);
  // Real views over the chosen window. The legacy column stopped moving
  // when traffic came here, so a small number now is correct rather than
  // broken: counting started when this did.
  const { viewsFor } = await import("@/lib/listing-views");
  const views = await viewsFor(businesses.map((b) => b.id), windowDays);
  for (const b of businesses) b.views = views.get(b.id) ?? 0;

  // Needs the listings themselves, because an advertiser is matched to
  // one by name as well as by email.
  // Denied listings, so the queue can tell "nobody has looked at this"
  // apart from "we looked and said no".
  const { getReviews } = await import("@/lib/listing-review");
  const reviews = await getReviews(businesses.map((b) => b.id));

  // Which listings have had their advertising set by hand. Everything
  // else follows the rule: Featured carries no ads.
  const { getAdsOverrides } = await import("@/lib/ads");
  const adsOverrides = await getAdsOverrides();

  const advertisers = await getAdvertiserIndex(
    businesses.map((b) => ({
      id: b.id,
      name: b.name,
      email: b.email ?? "",
    })),
  );

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div className="max-w-[64ch]">
          <h1 className="text-[21px] font-bold tracking-[-0.02em]">
            Directory listings
          </h1>
          <p className="text-sm text-muted mt-1">
            Edit any listing, change its plan, and toggle featured, verified, or
            hidden. Changes write to the same tables the live site reads, so
            they appear immediately on both sites.
          </p>
        </div>
        {/*
          Plain anchors, not Link: these are downloads, not navigation.
          Link would soft-navigate and the browser would never see the
          Content-Disposition that names the file.
        */}
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/directory/export"
            download
            className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-line-strong bg-white"
          >
            Export CSV
          </a>
          <a
            href="/api/admin/directory/export?all=1"
            download
            className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-line-strong bg-white"
            title="Includes unverified, inactive and hidden listings"
          >
            Export everything
          </a>
        </div>
      </div>
      <AdminDirectory
        windowDays={windowDays}
        businesses={businesses}
        categories={options.categories}
        locations={options.locations}
        advertiserIds={[...advertisers.businessIds]}
        rejected={[...reviews.entries()].map(([id, r]) => ({
          id,
          reason: r.reason,
        }))}
        adsSetByHand={[...adsOverrides.entries()].map(([id, showAds]) => ({
          id,
          showAds,
        }))}
        missionControlRead={advertisers.missionControl}
      />
    </div>
  );
}
