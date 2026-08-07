import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { listAreas } from "@/lib/directory-areas";
import { AdminAreas } from "@/components/admin-areas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Directory areas",
  robots: { index: false, follow: false },
};

/**
 * The towns and neighbourhoods the directory files listings under.
 *
 * There was no screen for this in either admin, so adding a town meant
 * writing SQL against production by hand, which is a job that gets done
 * once, at speed, with a typo in it.
 */
export default async function AdminAreasPage() {
  await requireAdmin();
  const areas = await listAreas();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 max-w-[74ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          Directory areas
        </h1>
        <p className="text-sm text-muted mt-1">
          Where a listing can say it is. Adding one puts it in the signup form,
          the listing editor and the public filters straight away.
        </p>
      </div>

      <AdminAreas areas={areas} />

      <p className="text-[12.5px] text-muted mt-5 max-w-[74ch]">
        An area can be hidden but not deleted. A listing records its area as
        the address above rather than a link to this row, so deleting one would
        not tidy up the listings filed there: they would keep pointing at a name
        nothing can resolve, and would drop off the filters with no sign of why.
        Hiding does the same job and can be undone. Renaming is always safe,
        since the address never changes.
      </p>
      <p className="text-[12.5px] text-muted mt-2 max-w-[74ch]">
        These are directory areas, not mailing zones. Adding one here does not
        create a card to advertise on; zones are under Zones.
      </p>
    </div>
  );
}
