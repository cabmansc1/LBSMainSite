import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { listStories } from "@/lib/stories";
import { kindLabel } from "@/lib/stories-types";
import { RoundupButton } from "@/components/roundup-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Stories",
  robots: { index: false, follow: false },
};

const TONE: Record<string, string> = {
  draft: "bg-surface text-muted",
  scheduled: "bg-cta-tint text-[#7a4a00]",
  published: "bg-[#E7F3EC] text-[#1F6B45]",
  archived: "bg-surface text-muted",
};

/**
 * Everything written, newest first.
 *
 * This is the screen that has to make publishing once a week feel
 * possible, so the primary action is writing the next one rather than
 * administering the last one.
 */
export default async function AdminStoriesPage() {
  await requireAdmin();
  const stories = await listStories();
  const live = stories.filter(
    (s) => s.status === "published" || s.status === "scheduled",
  ).length;

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-8">
      <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div className="max-w-[64ch]">
          <h1 className="text-[21px] font-bold tracking-[-0.02em]">Stories</h1>
          <p className="text-sm text-muted mt-1">
            Business Spotlights, openings, guides and anything else worth
            telling people. Filing one against a place and a business is what
            puts it on those pages by itself.
          </p>
        </div>
        <Link
          href="/admin/stories/new"
          className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-navy-950 text-white"
        >
          Write a story
        </Link>
      </div>

      <RoundupButton />

      {stories.length === 0 ? (
        <div className="border border-line rounded-(--radius-card) bg-white p-8 text-center">
          <p className="text-[15px] font-semibold">Nothing written yet.</p>
          <p className="text-[13.5px] text-muted mt-1.5 max-w-[52ch] mx-auto">
            A Business Spotlight is the one worth starting with. Pick an
            advertiser you know well, write four hundred words about why they
            started, and file it against their listing.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[12.5px] text-muted mb-3 num">
            {stories.length} written &middot; {live} live
          </p>
          <div className="border border-line rounded-(--radius-card) bg-white overflow-hidden">
            {stories.map((s) => (
              <Link
                key={s.id}
                href={`/admin/stories/${s.id}`}
                className="block border-b border-line last:border-b-0 px-4 py-3.5 hover:bg-surface"
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  <b className="text-[14.5px]">{s.title}</b>
                  <span
                    className={`text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                      TONE[s.status] ?? "bg-surface text-muted"
                    }`}
                  >
                    {s.status}
                  </span>
                  {s.sponsored && (
                    <span className="text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-cta-tint text-[#7a4a00]">
                      Sponsored
                    </span>
                  )}
                  {s.featuredRank !== null && (
                    <span className="text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-brand-tint text-brand-deep num">
                      Home {s.featuredRank}
                    </span>
                  )}
                  <span className="ml-auto text-[12.5px] text-muted num">
                    {s.publishedLabel ?? `edited ${s.updatedAt ?? ""}`}
                  </span>
                </div>
                <p className="text-[12.5px] text-muted mt-1">
                  {kindLabel(s.kind)}
                  {s.businesses.length > 0 &&
                    ` · ${s.businesses.map((b) => b.name).filter(Boolean).join(", ")}`}
                  {s.places.length > 0 && ` · ${s.places.join(", ")}`}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
