import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getLiveZones } from "@/lib/zone-store";
import { AdminZones, type ZoneRow } from "@/components/admin-zones";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Zones",
  robots: { index: false, follow: false },
};

/**
 * Mailbox counts, populations and which zones share a card.
 *
 * Same pattern as pricing: what is saved here overrides the values in
 * lib/zones.ts, and the code values stay as the fallback so an empty
 * settings row leaves the site exactly as it ships.
 */
export default async function AdminZonesPage() {
  await requireAdmin();
  const zones = await getLiveZones();

  const rows: ZoneRow[] = zones.map((z) => ({
    slug: z.slug,
    name: z.name,
    zips: z.zipCodes.join(", "),
    mailboxes: z.mailboxes != null ? String(z.mailboxes) : "",
    population: String(z.population),
    mailsWith: z.mailsWith ?? "",
  }));

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 max-w-[70ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Zones</h1>
        <p className="text-sm text-muted mt-1">
          What each zone actually contains. Saving updates the zone pages,
          the coverage map, the mailing calendar and the search snippets
          right away, with no deploy.
        </p>
      </div>

      <div className="grid gap-2 mb-6 text-[13px] text-body bg-surface border border-line rounded-(--radius-card) p-4 max-w-[70ch]">
        <p>
          <b className="font-semibold">Mailboxes</b> is the deliverable count
          off the postal routes. It is what the pages mean by the size of a
          zone: below 5,000 it corrects the reach we advertise, above it it is
          the headroom before a mailing repeats an address. Leave it blank if
          you have not counted a zone yet, and the copy will avoid quoting a
          number rather than invent one.
        </p>
        <p>
          <b className="font-semibold">Population</b> only sizes the bubbles on
          the coverage map, scaled so area rather than radius carries the
          number. A rough figure is fine.
        </p>
        <p>
          <b className="font-semibold">Mails with</b> is for a zone too small to
          fill a run on its own. The two share one card everywhere: one bubble
          group on the map, one calendar row, one panel, and a reach figure
          that adds them up instead of counting each separately. Setting it on
          one side sets it on both.
        </p>
      </div>

      <AdminZones initial={rows} />
    </div>
  );
}
