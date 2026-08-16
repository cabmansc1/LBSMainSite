import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getPastCards } from "@/lib/past-cards";
import { findEditionCollisions } from "@/lib/card-editions";
import { getAllMcCards } from "@/lib/mission-control";
import { facebookEnabled } from "@/lib/facebook";
import { AdminGallery } from "@/components/admin-gallery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Card gallery",
  robots: { index: false, follow: false },
};

/**
 * The archive of mailed cards. Upload the photos after a mailing lands
 * and publish; the page for that card builds itself from what Mission
 * Control already knows.
 */
export default async function AdminGalleryPage() {
  await requireAdmin();
  const [cards, mcCards] = await Promise.all([
    getPastCards(),
    getAllMcCards().catch(() => []),
  ]);
  const collisions = findEditionCollisions(cards);

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Card gallery</h1>
        <p className="text-sm text-muted mt-1">
          Upload photos of a card after it mails. Each published card gets its
          own page at /cards/..., listing the neighborhoods it reached and the
          businesses that rode it, and appears in the gallery and the sitemap.
          Images are resized and re-encoded on upload, so a phone photo is fine.
        </p>
      </div>
      {/* The public gallery groups cards into editions by name, and it
          normalizes so near-misses still group. That keeps the site
          right and leaves the source wrong: Mission Control is the
          authority, and a name typed two ways there will keep producing
          mismatches somewhere less forgiving. Surfaced here so it gets
          fixed where it came from. */}
      {collisions.length > 0 && (
        <section className="mb-5 border border-[#f3ddbb] bg-cta-tint rounded-(--radius-card) p-5">
          <h2 className="text-[15px] font-bold tracking-tight">
            {collisions.length} card{" "}
            {collisions.length === 1 ? "name is" : "names are"} spelled more
            than one way
          </h2>
          <p className="text-[13px] text-body mt-1.5 max-w-[74ch]">
            These group correctly on the site, so nothing is broken today.
            They are worth fixing in Mission Control so the history of a
            card cannot split later.
          </p>
          <ul className="mt-3 grid gap-2">
            {collisions.map((c) => (
              <li
                key={`${c.zoneName}-${c.spellings.join("|")}`}
                className="bg-white border border-line rounded-[10px] px-4 py-3 text-[13px]"
              >
                <b>{c.zoneName}</b>
                <span className="text-muted num"> · {c.cards} cards</span>
                <ul className="mt-1.5 grid gap-0.5">
                  {c.spellings.map((s) => (
                    <li key={s} className="font-mono text-[12.5px] text-body">
                      {JSON.stringify(s)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AdminGallery
        cards={cards}
        mcCards={mcCards}
        canShare={facebookEnabled()}
      />
    </div>
  );
}
