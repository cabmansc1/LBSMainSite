import { Card } from "@/components/sections";
import { testimonialsFor } from "@/lib/testimonials";

/**
 * Approved customer quotes for one placement.
 *
 * Its own file rather than living in sections.tsx, because that module
 * is imported by client components and this one reaches the database.
 * A server-only import inside a shared barrel takes the whole build
 * down with a message that names neither file.
 */
export async function TestimonialStrip({ placement }: { placement: string }) {
  const items = await testimonialsFor(placement);
  if (items.length === 0) return null;
  return (
    <div className="grid md:grid-cols-3 gap-3.5">
      {items.map((t) => (
        <Card key={t.quote} className="p-7 flex flex-col gap-4.5">
          <span className="text-[34px] leading-[0.6] font-bold text-brand">“</span>
          <blockquote className="text-[15.5px] leading-relaxed flex-1">
            {t.quote}
          </blockquote>
          <div>
            {/* Stars only when the review carried a rating. Drawing five
                on a quote that never had one is inventing the number. */}
            {typeof t.rating === "number" && (
              <span
                className="block text-[13px] text-cta tracking-[0.1em] mb-0.5"
                aria-label={`${t.rating} out of 5`}
              >
                {"\u2605".repeat(t.rating)}
                <span className="text-line-strong">
                  {"\u2605".repeat(5 - t.rating)}
                </span>
              </span>
            )}
            <b className="block text-[13.5px] font-semibold">{t.author}</b>
            <span className="text-[12.5px] text-muted">{t.detail}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
