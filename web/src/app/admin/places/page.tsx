import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { listPlaces } from "@/lib/places";
import { listAreas } from "@/lib/directory-areas";
import { getLiveZones } from "@/lib/zone-store";
import { AdminPlaces } from "@/components/admin-places";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Places",
  robots: { index: false, follow: false },
};

/**
 * Markets, zones and neighbourhoods, in one tree.
 *
 * The site had two separate ideas of place and no way to see either next
 * to the other: mailing zones in code, directory areas in the database,
 * and nothing that said Mount Pleasant and Daniel Island are the same
 * part of town. This is the missing layer, and it is deliberately only a
 * layer. Nothing here changes what a card costs or what mails when.
 */
export default async function AdminPlacesPage() {
  await requireAdmin();
  const [places, areas, zones] = await Promise.all([
    listPlaces(),
    listAreas().catch(() => []),
    getLiveZones().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 max-w-[74ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Places</h1>
        <p className="text-sm text-muted mt-1">
          How Greater Charleston is divided up: the markets you sell, the cards
          that mail, and the neighborhoods people search for. Stories, events
          and market pages all hang off this.
        </p>
      </div>

      <AdminPlaces
        places={places}
        zones={zones.map((z) => ({ slug: z.slug, name: z.name }))}
        areas={areas.map((a) => ({ slug: a.slug, name: a.name }))}
      />

      <div className="mt-6 grid gap-2 max-w-[74ch]">
        <p className="text-[12.5px] text-muted">
          <b className="text-ink">A market</b> is how you sell an area. A{" "}
          <b className="text-ink">zone</b> is a card that actually mails. A{" "}
          <b className="text-ink">neighborhood</b> is somewhere people look
          for, like West Ashley or Ladson, that is not sold on its own; it
          points at whichever card reaches it, so Reserve a spot still works
          from its page.
        </p>
        <p className="text-[12.5px] text-muted">
          A market can be a card too. Summerville and Moncks Corner are each one
          market and one card, so they carry both.
        </p>
        <p className="text-[12.5px] text-muted">
          Nothing here changes pricing, availability or what mails when. Those
          still come from Zones and Pricing. This decides what the public side
          calls things and what belongs together.
        </p>
        <p className="text-[12.5px] text-muted">
          A place can be hidden but not deleted, for the same reason an area
          can not: stories and events will point at the address rather than the
          row, and deleting would strand them with no sign of why.
        </p>
      </div>
    </div>
  );
}
