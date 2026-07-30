import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getArtworkGaps, getRecentArtwork, type ArtworkGap } from "@/lib/artwork";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Artwork",
  robots: { index: false, follow: false },
};

/** Mission Control's own wording, in plain language. Anything settled is
 *  filtered out upstream, so only the unfinished states appear here. */
const ART_STATUS: Record<string, string> = {
  not_requested: "Never asked for",
  requested: "Asked for, not sent",
  in_revision: "Being revised",
};

const size = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

const when = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(String(iso).replace(" ", "T"));
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

export default async function AdminArtworkPage() {
  await requireAdmin();
  const [gaps, recent] = await Promise.all([
    getArtworkGaps(),
    getRecentArtwork(),
  ]);

  // Grouped by card, because the question is always asked about one card
  // at a time: what is still missing before this one goes to print.
  const byCard = new Map<string, ArtworkGap[]>();
  for (const g of gaps ?? []) {
    const list = byCard.get(g.cardId);
    if (list) list.push(g);
    else byCard.set(g.cardId, [g]);
  }

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Artwork</h1>
        <p className="text-sm text-muted mt-1 max-w-[74ch]">
          Files advertisers have sent through their account, and who on a card
          that has not printed yet still owes one. Advertisers sold over the
          phone are included: this reads the card roster in Mission Control,
          not the online order table. Anyone Mission Control already marks
          approved or received is treated as done, so this list is what is
          genuinely outstanding rather than what has not come through this
          site.
        </p>
      </div>

      {gaps === null && (
        <p className="mb-5 border border-[#f3c9c4] bg-[#fdf3f2] rounded-(--radius-card) px-5 py-3.5 text-[13px] text-body">
          Mission Control could not be read, so the missing list below is empty
          because nothing could be counted, not because everyone has sent
          artwork. The reason is in the server log.
        </p>
      )}

      <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mb-3">
        Still missing
      </h2>
      {byCard.size === 0 ? (
        <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-5 py-6">
          {gaps === null
            ? "Nothing to show."
            : "Nobody on an upcoming card is missing artwork."}
        </p>
      ) : (
        <div className="grid gap-3.5">
          {[...byCard.values()].map((rows) => {
            const card = rows[0];
            return (
              <div
                key={card.cardId}
                className="border border-line rounded-(--radius-card) bg-white overflow-hidden"
              >
                <div className="px-5 py-3.5 border-b border-line flex items-baseline gap-3 flex-wrap">
                  <b className="text-[15px] font-semibold">{card.cardName}</b>
                  <span className="text-[12.5px] text-muted">
                    {card.zoneName}, {card.mailMonth}
                  </span>
                  {card.artworkDeadline && (
                    <span
                      className={`text-[12.5px] font-semibold ml-auto ${
                        card.overdue ? "text-[#b42318]" : "text-[#9a5c00]"
                      }`}
                    >
                      Artwork {card.overdue ? "was due" : "due"}{" "}
                      {card.artworkDeadline}
                      {card.overdue ? ", already past" : ""}
                    </span>
                  )}
                </div>
                {rows.map((r, i) => (
                  <div
                    key={`${r.businessName}-${i}`}
                    className="px-5 py-2.5 border-b border-line last:border-b-0 flex items-baseline gap-3 flex-wrap text-[13.5px]"
                  >
                    <b className="font-semibold">{r.businessName}</b>
                    <span className="text-[12.5px] text-muted">{r.adSize}</span>
                    <span className="text-[12px] text-muted">
                      {ART_STATUS[r.artStatus] ?? "No artwork status set"}
                    </span>
                    <span className="text-[12.5px] text-muted ml-auto">
                      {r.email ? (
                        <a
                          href={`mailto:${r.email}?subject=${encodeURIComponent(
                            `Artwork for ${card.cardName}`,
                          )}`}
                          className="text-brand-deep hover:underline"
                        >
                          {r.email}
                        </a>
                      ) : (
                        // Not a footnote. No email means they have no way to
                        // upload and no way to be chased by mail.
                        <span className="text-[#b42318] font-semibold">
                          No email on file{r.phone ? ` · ${r.phone}` : ""}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mt-9 mb-3">
        Sent in
      </h2>
      {recent.length === 0 ? (
        <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-5 py-6">
          Nothing uploaded yet.
        </p>
      ) : (
        <div className="border border-line rounded-(--radius-card) bg-white overflow-hidden">
          {recent.map((a) => (
            <div
              key={a.id}
              className="px-5 py-3 border-b border-line last:border-b-0 grid gap-1"
            >
              <div className="flex items-baseline gap-3 flex-wrap text-[13.5px]">
                <a
                  href={`/api/account/artwork/${a.id}`}
                  className="font-semibold text-brand-deep hover:underline break-all"
                >
                  {a.filename}
                </a>
                <span className="text-[12px] text-muted num">
                  {size(a.bytes)}
                </span>
                <span className="text-[12.5px] text-muted">{a.email}</span>
                <span className="text-[12px] text-muted num ml-auto">
                  {when(a.createdAt)}
                </span>
              </div>
              {(a.note || a.uploadedBy) && (
                <div className="text-[12.5px] text-muted">
                  {a.note}
                  {a.uploadedBy && (
                    <span className="ml-2">
                      (uploaded by {a.uploadedBy}, not the advertiser)
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
