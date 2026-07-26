import type { Metadata } from "next";
import { Card, StatusChip } from "@/components/sections";
import { requireAdmin } from "@/lib/admin";
import { TESTIMONIALS } from "@/lib/testimonials";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Testimonials",
  robots: { index: false, follow: false },
};

/**
 * Testimonials CRUD: approve, edit placements, reorder. Writes to the
 * testimonials table on staging; the site renders only approved rows.
 */
export default async function AdminTestimonialsPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-[21px] font-bold tracking-[-0.02em]">Testimonials</h1>
          <p className="text-sm text-muted mt-1">
            Quotes marked placeholder need real customer names before cutover.
          </p>
        </div>
        <button className="bg-navy-950 text-white font-semibold text-[13px] px-4 py-2 rounded-(--radius-btn) hover:bg-navy-800">
          Add testimonial
        </button>
      </div>
      <div className="grid gap-3">
        {TESTIMONIALS.map((t) => (
          <Card key={t.quote} className="p-5.5 grid md:grid-cols-[1fr_auto] gap-4 items-start">
            <div>
              <blockquote className="text-[14.5px] leading-relaxed">“{t.quote}”</blockquote>
              <p className="text-[12.5px] text-muted mt-2">
                {t.author} · {t.detail} · shown on: {t.placements.join(", ")}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <StatusChip tone="warn">Placeholder</StatusChip>
              <button className="text-[13px] font-semibold text-brand-deep hover:underline">
                Edit
              </button>
              <button className="text-[13px] font-semibold text-danger hover:underline">
                Remove
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
