import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getCategoryVocabulary, mcEnabled } from "@/lib/mission-control";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Categories",
  robots: { index: false, follow: false },
};

const SOURCE_COPY = {
  registry:
    "Mission Control is serving a managed category list from /api/categories. That list is the only thing the site sells against.",
  derived:
    "Mission Control has no /api/categories endpoint yet, so the site reads every category word already in the snapshot: on a business record, on a card, or on a hold.",
  none: "Mission Control returned nothing, so checkout falls back to the built in category list.",
} as const;

/**
 * Read only view of the category vocabulary. Categories belong to
 * Mission Control, so there is nothing to edit here. The page exists to
 * show what the site is currently offering and to prove the sync after a
 * category is added in MC.
 */
export default async function AdminCategoriesPage() {
  await requireAdmin();
  const { source, categories } = await getCategoryVocabulary();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Categories</h1>
        <p className="text-sm text-muted mt-1">
          The industry categories the site sells against, live from Mission
          Control. Add a category in Mission Control and it appears here, and
          in the checkout picker, within about a minute. Nothing is edited on
          this side, so the two systems can never disagree.
        </p>
      </div>

      <div className="border border-line rounded-(--radius-card) bg-white p-5 mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`w-[7px] h-[7px] rounded-full ${
              source === "none" ? "bg-danger" : source === "derived" ? "bg-cta" : "bg-ok"
            }`}
          />
          <b className="text-[14px]">
            {source === "registry"
              ? "Managed list"
              : source === "derived"
                ? "Derived from records"
                : "Not connected"}
          </b>
          <span className="text-[12.5px] text-muted num">
            {categories.length} {categories.length === 1 ? "category" : "categories"}
          </span>
        </div>
        <p className="text-[13px] text-muted">
          {mcEnabled()
            ? SOURCE_COPY[source]
            : "MC_BASE_URL is not set in this environment, so there is no Mission Control to read."}
        </p>
      </div>

      {source === "derived" && (
        <div className="border border-line rounded-(--radius-card) bg-surface p-5 mb-5">
          <b className="text-[14px] block mb-1.5">To add a category today</b>
          <p className="text-[13px] text-body">
            Put the category on any record in Mission Control: set it as a
            business category on an account, or place a hold for it on a card.
            The site picks the word up on the next read. To make it a
            deliberate managed list instead, Mission Control needs a category
            table and a GET /api/categories endpoint; the site already prefers
            that endpoint the moment it exists.
          </p>
        </div>
      )}

      {categories.length > 0 && (
        <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
          <table className="w-full border-collapse text-[13.5px] min-w-[520px]">
            <thead>
              <tr>
                {["Category", "On a business", "Sold on a card", "Held in MC"].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.name} className="hover:bg-surface">
                  <td className="px-4 py-3 border-b border-line font-semibold">
                    {c.name}
                  </td>
                  {[c.onAccounts, c.onCards, c.held].map((on, i) => (
                    <td key={i} className="px-4 py-3 border-b border-line">
                      <span className={on ? "text-body" : "text-muted"}>
                        {on ? "Yes" : "No"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
