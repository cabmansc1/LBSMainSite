import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPortalContext } from "@/lib/portal";
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

      {listings.length === 0 ? (
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
          {listings.map((l) => (
            <Card key={l.id} className="p-6 grid gap-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-[16.5px] font-bold tracking-tight">
                      {l.name}
                    </h3>
                    {l.isFeatured && <StatusChip tone="warn">Featured</StatusChip>}
                    {l.isVerified && <StatusChip tone="ok">Verified</StatusChip>}
                    {l.claimable && <StatusChip tone="info">Unclaimed</StatusChip>}
                  </div>
                  <p className="text-[13px] text-muted mt-1">
                    {[l.category, l.locationArea ?? l.city].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Link
                  href={`/business/${l.slug}`}
                  className="text-[13px] font-semibold text-brand-deep hover:underline"
                >
                  View public page
                </Link>
              </div>

              {l.description && (
                <p className="text-sm text-body leading-relaxed border-t border-line pt-3">
                  {l.description}
                </p>
              )}

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

              <p className="text-[12.5px] text-muted border-t border-line pt-3">
                Editing from here is coming next. Changes will go to us for
                review before your public page updates. To change something
                today,{" "}
                <Link href="/contact" className="text-brand-deep font-semibold hover:underline">
                  send us the details
                </Link>
                .
              </p>
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
