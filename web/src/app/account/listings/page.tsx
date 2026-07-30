import type { Metadata } from "next";
import { RichText } from "@/components/rich-text";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPortalContext } from "@/lib/portal";
import { getFilterOptions } from "@/lib/directory";
import { getListingForAccount, pendingEditsFor } from "@/lib/listing-edits";
import { getHoursFor, weekFrom } from "@/lib/business-hours";
import { directoryWritesBlocked } from "@/lib/write-guard";
import { ListingEditor } from "@/components/listing-editor";
import { Card, StatusChip } from "@/components/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your listings",
  robots: { index: false, follow: false },
};

const money = (n?: number) =>
  n === undefined || !isFinite(n) || n <= 0
    ? null
    : `$${n.toLocaleString("en-US")}`;

/** Both listings a business has with us: the directory page and deals. */
export default async function AccountListingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { listings, deals } = await getPortalContext(session);
  const ids = listings.map((l) => l.id);

  // The editable copy is re-read through getListingForAccount rather than
  // reshaped from the portal context, so the rule about which listings
  // this login may touch lives in exactly one place. An advertiser has
  // one or two listings, and this page is already dynamic.
  const [editable, hoursByBiz, pendingByBiz, options] = await Promise.all([
    Promise.all(ids.map((id) => getListingForAccount(session, id))),
    getHoursFor(ids),
    pendingEditsFor(ids),
    getFilterOptions(),
  ]);

  const catLabel = new Map(options.categories.map((c) => [c.slug, c.name]));
  const locLabel = new Map(options.locations.map((l) => [l.slug, l.name]));
  // Featured and verified are ours to set, not theirs to edit, so they
  // stay on the portal's read model rather than the editable one.
  const badges = new Map(listings.map((l) => [l.id, l]));
  const rows = editable.filter((l) => l !== undefined);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.025em]">Listings</h1>
        <p className="text-sm text-muted mt-1">
          Your directory page and any deals you are running on LowCoDeals.
        </p>
      </div>

      <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mb-3">
        Directory listing
      </h2>

      {rows.length === 0 ? (
        <Card className="p-6 grid gap-2">
          <p className="text-sm text-body">
            No directory listing is linked to {session.email} yet.
          </p>
          <Link
            href="/directory-signup"
            className="text-[13px] font-semibold text-brand-deep hover:underline"
          >
            List your business
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3.5">
          {rows.map((l) => (
            <Card key={l.id} id={`listing-${l.id}`} className="p-6 grid gap-3 scroll-mt-24">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-[16.5px] font-bold tracking-tight">
                      {l.name}
                    </h3>
                    {badges.get(l.id)?.isFeatured && (
                      <StatusChip tone="warn">Featured</StatusChip>
                    )}
                    {badges.get(l.id)?.isVerified && (
                      <StatusChip tone="ok">Verified</StatusChip>
                    )}
                    {l.claimable && <StatusChip tone="info">Unclaimed</StatusChip>}
                    {(pendingByBiz.get(l.id)?.length ?? 0) > 0 && (
                      <StatusChip tone="warn">Changes with us</StatusChip>
                    )}
                  </div>
                  <p className="text-[13px] text-muted mt-1">
                    {[
                      catLabel.get(l.category) ?? l.category,
                      locLabel.get(l.locationArea) ?? l.locationArea ?? l.city,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Link
                  href={`/business/${l.slug}`}
                  className="text-[13px] font-semibold text-brand-deep hover:underline"
                >
                  View public page
                </Link>
              </div>

              {/* An unclaimed listing has no form to read its details off,
                  so it still shows them the way it always did. */}
              {!l.owned && l.description && (
                <RichText
                  text={l.description}
                  className="text-sm text-body leading-relaxed border-t border-line pt-3"
                />
              )}
              {!l.owned && (
                <dl className="grid sm:grid-cols-3 gap-3 text-[13px] border-t border-line pt-3">
                  <div>
                    <dt className="text-muted text-[12px]">Phone</dt>
                    <dd className="font-medium num">{l.phone || "Not set"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted text-[12px]">Email</dt>
                    <dd className="font-medium truncate">{l.email || "Not set"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted text-[12px]">Website</dt>
                    <dd className="font-medium truncate">{l.website || "Not set"}</dd>
                  </div>
                </dl>
              )}

              <ListingEditor
                listing={l}
                categories={options.categories}
                locations={options.locations}
                hours={weekFrom(hoursByBiz.get(l.id) ?? [])}
                pending={pendingByBiz.get(l.id) ?? []}
                readOnly={directoryWritesBlocked()}
              />
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2.5 mt-9 mb-3">
        <span className="text-[10.5px] font-bold uppercase tracking-widest text-muted">
          Deals on
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/lowcodeals.png" alt="LowCoDeals" className="h-5 w-auto" />
      </div>

      {deals.length === 0 ? (
        <Card className="p-6 grid gap-2">
          <p className="text-sm text-body">
            No live deals found for your business on LowCoDeals. A deal there
            also shows on your directory listing here.
          </p>
          <a
            href="https://lowcodeals.com"
            target="_blank"
            rel="noopener"
            className="text-[13px] font-semibold text-[#5C8420] hover:underline"
          >
            Go to LowCoDeals
          </a>
        </Card>
      ) : (
        <Card className="border-l-[3px] border-l-[#8CBB39]">
          {deals.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-line last:border-b-0 flex-wrap"
            >
              <div className="flex-1 min-w-[220px]">
                <b className="text-[14.5px] font-semibold">{d.title}</b>
                <p className="text-[12.5px] text-muted num">
                  {money(d.dealPrice) && (
                    <b className="text-[#5C8420]">{money(d.dealPrice)}</b>
                  )}{" "}
                  {money(d.originalPrice) && (
                    <s className="text-faint">{money(d.originalPrice)}</s>
                  )}
                </p>
              </div>
              <a
                href={d.url}
                target="_blank"
                rel="noopener"
                className="text-[13px] font-semibold text-[#5C8420] hover:underline"
              >
                View on LowCoDeals
              </a>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
