import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPortalContext } from "@/lib/portal";
import { artworkByteLimit, getArtworkFor } from "@/lib/artwork";
import { Card, StatusChip } from "@/components/sections";
import { ArtworkUpload } from "@/components/artwork-upload";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your cards",
  robots: { index: false, follow: false },
};

const money = (cents?: number) =>
  cents === undefined ? null : `$${(cents / 100).toLocaleString("en-US")}`;

export default async function AccountCardsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { currentCards, pastCards, warnings } = await getPortalContext(session);

  // One query for every card rather than one per card, then grouped here.
  const artwork = await getArtworkFor(session.email);
  // Read after that call, which is what asks MySQL how big a file it
  // will take. Reading it earlier would quote the optimistic default.
  const maxBytes = artworkByteLimit();
  const artworkByCard = new Map<string, typeof artwork>();
  for (const a of artwork) {
    const list = artworkByCard.get(a.cardId);
    if (list) list.push(a);
    else artworkByCard.set(a.cardId, [a]);
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.025em]">Cards</h1>
        <p className="text-sm text-muted mt-1">
          Cards you are on now, and every card you have run.
        </p>
      </div>

      {warnings.map((w) => (
        <p
          key={w}
          className="mb-4 text-[13px] text-body bg-surface border border-line rounded-[10px] px-4 py-2.5"
        >
          {w}
        </p>
      ))}

      <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mb-3">
        Running now
      </h2>
      {currentCards.length === 0 ? (
        <Card className="p-6 grid gap-2">
          <p className="text-sm text-body">
            You are not on an upcoming card right now.
          </p>
          <Link
            href="/coverage-map"
            className="text-[13px] font-semibold text-brand-deep hover:underline"
          >
            See which zones have spots open
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3.5">
          {currentCards.map((c) => {
            const pct = Math.min(
              100,
              Math.round((c.spotsTaken / Math.max(1, c.spotsTotal)) * 100),
            );
            return (
              <Card key={c.cardId} className="p-6 grid gap-3.5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-[16.5px] font-bold tracking-tight">
                        {c.zoneName}, {c.mailMonth}
                      </h3>
                      {c.status === "full" ? (
                        <StatusChip tone="info">Closed for print</StatusChip>
                      ) : (
                        <StatusChip tone="ok">Booked</StatusChip>
                      )}
                      {c.paymentStatus && c.paymentStatus !== "paid" && (
                        <StatusChip tone="warn">
                          {c.paymentStatus === "partial" ? "Part paid" : "Unpaid"}
                        </StatusChip>
                      )}
                    </div>
                    <p className="text-[13px] text-muted mt-1">
                      {c.adSize}
                      {money(c.amountCents) ? ` · ${money(c.amountCents)}` : ""}
                      {c.households ? ` · ${c.households} homes` : ""}
                      {c.category ? ` · ${c.category}` : ""}
                    </p>
                  </div>
                  {c.artworkDeadline && (
                    <div className="text-right">
                      <div className="text-[10.5px] font-bold uppercase tracking-widest text-muted">
                        Artwork deadline
                      </div>
                      <div className="text-[15px] font-bold text-[#9a5c00]">
                        {c.artworkDeadline}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-[12.5px] text-muted mb-1.5">
                    <span>Card is filling</span>
                    <span className="num">
                      {c.spotsTaken} of {c.spotsTotal} spots taken
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-line overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 80 ? "bg-cta" : "bg-brand"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <ArtworkUpload
                  cardId={c.cardId}
                  existing={artworkByCard.get(c.cardId) ?? []}
                  maxBytes={maxBytes}
                />
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mt-9 mb-3">
        Past cards
      </h2>
      {pastCards.length === 0 ? (
        <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-6">
          Once a card mails it moves here, with what it reached.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {pastCards.map((c) => (
            <Card key={c.cardId} className="p-5 grid gap-1.5">
              <b className="text-[15px] font-semibold">{c.zoneName}</b>
              <span className="text-[12.5px] text-muted">
                Mailed {c.mailMonth}
              </span>
              <span className="text-[12.5px] text-muted num">
                {c.households ? `${c.households} homes · ` : ""}
                {c.adSize}
              </span>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
