import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAllTestimonials, placementOptions } from "@/lib/testimonials";
import { getLiveZones } from "@/lib/zone-store";
import { AdminTestimonials } from "@/components/admin-testimonials";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Testimonials",
  robots: { index: false, follow: false },
};

/**
 * Customer quotes: add, edit, approve, remove.
 *
 * This screen used to list three hardcoded samples with buttons that
 * did nothing, so a real review had nowhere to go. It reads and writes
 * lbs_testimonials now, and the site renders only approved rows.
 */
export default async function AdminTestimonialsPage() {
  await requireAdmin();
  const [rows, zones] = await Promise.all([
    getAllTestimonials(),
    getLiveZones(),
  ]);
  const live = rows.filter((t) => t.approved).length;

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 max-w-[72ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Testimonials</h1>
        <p className="text-sm text-muted mt-1">
          Real customer quotes. Each one is shown only where you pin it, and a
          section stays off the page entirely until it has an approved quote,
          so nothing here ever renders an empty heading.
        </p>
      </div>

      <p className="mb-4 text-[13px] text-body">
        <b className="font-semibold num">{live}</b> live,{" "}
        <span className="num">{rows.length - live}</span> in draft.
      </p>

      <AdminTestimonials
        initial={rows}
        placements={placementOptions(zones.map((z) => z.slug))}
      />
    </div>
  );
}
