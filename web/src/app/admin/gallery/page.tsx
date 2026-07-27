import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getPastCards } from "@/lib/past-cards";
import { getAllMcCards } from "@/lib/mission-control";
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
      <AdminGallery cards={cards} mcCards={mcCards} />
    </div>
  );
}
