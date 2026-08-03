import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getMcAccountRoster } from "@/lib/mc-accounts";
import { AdminMcAccounts } from "@/components/admin-mc-accounts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mission Control customers",
  robots: { index: false, follow: false },
};

/**
 * The customers who predate the website.
 *
 * Mission Control has been the customer record far longer than this site
 * has existed, so most advertisers have no order here, no listing here
 * and no login here. Sign-in now accepts a Mission Control customer on
 * its own, so most of them need nothing from this screen. This is for
 * doing it deliberately instead: getting their information into the site
 * before they arrive rather than at the moment they first try.
 */
export default async function AdminMcAccountsPage() {
  await requireAdmin();
  const { rows, enabled } = await getMcAccountRoster();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 max-w-[72ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          Mission Control customers
        </h1>
        <p className="text-sm text-muted mt-1">
          Every business that has bought a spot, folded to one row each.
          Create their portal login and their directory listing here so
          existing customers can use the site, not just the ones who bought
          through it.
        </p>
      </div>

      {!enabled ? (
        <p className="text-[13px] text-[#7a4a00] bg-cta-tint border border-[#f3ddbb] rounded-lg px-4 py-2.5">
          Mission Control is not configured on this deploy, so there is no
          customer list to read. Set MC_BASE_URL and its key under
          Integrations.
        </p>
      ) : rows === null ? (
        <p className="text-[13px] text-[#a33] bg-white border border-line rounded-lg px-4 py-2.5">
          Mission Control did not answer, so this list is not being shown
          rather than shown short. Try again in a moment.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-body">
          Mission Control has no paying advertisers on any card yet.
        </p>
      ) : (
        <>
          <p className="mb-4 text-[13px] text-body">
            {rows.length} customer{rows.length === 1 ? "" : "s"}. Prospect rows
            are left out: a category parked mid-conversation is not somebody who
            has bought anything.
          </p>
          <AdminMcAccounts rows={rows} />
        </>
      )}
    </div>
  );
}
