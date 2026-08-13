"use client";

import Link from "next/link";
import { hasMailDate, type UpcomingMailing } from "@/lib/mailings";
import { zoneBySlug } from "@/lib/zones";

/**
 * The schedule as months, with the areas mailing in each as pills.
 *
 * The question this answers is "who is mailing in October", so it shows
 * exactly that and stops. The table is still there for the row of
 * detail — spots, reach, deadline per card — and repeating any of it
 * here would only make the thing you came for harder to find.
 *
 * A month grid rather than a day grid because the date that reaches
 * this component is a month string: the Mission Control adapter formats
 * the day out of it upstream, and one card is a season. Drawing 31 days
 * would mean inventing one for every card.
 *
 * The two things a pill does carry are whether a card is closed and
 * whether it is nearly gone, because both change whether it is worth
 * clicking, and neither is legible from a name alone.
 */

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors";

function AreaPill({ m }: { m: UpcomingMailing }) {
  const left = Math.max(0, m.spotsTotal - m.spotsTaken);
  const closed = m.status === "waitlist" || m.status === "full" || left === 0;
  const scarce = !closed && left <= 2;

  const inner = (
    <>
      {m.zoneName}
      {closed ? (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {m.status === "waitlist" ? "Waitlist" : "Full"}
        </span>
      ) : scarce ? (
        <span className="num text-[11px] font-bold text-cta-hover">
          {left} left
        </span>
      ) : null}
    </>
  );

  const cls = closed
    ? `${PILL} border-line bg-surface text-muted hover:border-navy-950`
    : scarce
      ? `${PILL} border-cta bg-cta-tint text-ink font-semibold hover:border-navy-950`
      : `${PILL} border-line bg-white text-ink font-medium hover:border-navy-950`;

  // Not every zone in the schedule has a page of its own; those still
  // need to read as part of the month rather than vanish from it.
  return zoneBySlug(m.zoneSlug) ? (
    <Link href={`/${m.zoneSlug}-direct-mail-marketing`} className={cls}>
      {inner}
    </Link>
  ) : (
    <span className={`${cls} cursor-default`}>{inner}</span>
  );
}

/** The one deadline a month's cards share, or undefined if they differ. */
const sharedDeadline = (cards: UpcomingMailing[]) => {
  const first = cards[0]?.artworkDeadline;
  if (!first) return undefined;
  return cards.every((c) => c.artworkDeadline === first) ? first : undefined;
};

export function MailingMonthGrid({ mailings }: { mailings: UpcomingMailing[] }) {
  /* Insertion order, not sorted. The value is a display string, so
     sorting puts December before September and cannot place a season at
     all. The source list is chronological. */
  const byMonth = new Map<string, UpcomingMailing[]>();
  for (const m of mailings) {
    const list = byMonth.get(m.mailMonth);
    if (list) list.push(m);
    else byMonth.set(m.mailMonth, [m]);
  }

  const dated: [string, UpcomingMailing[]][] = [];
  const undated: UpcomingMailing[] = [];
  for (const [month, cards] of byMonth.entries()) {
    if (hasMailDate(month)) dated.push([month, cards]);
    else undated.push(...cards);
  }

  return (
    <div className="border border-line rounded-(--radius-card) bg-white divide-y divide-line">
      {dated.map(([month, cards]) => {
        const deadline = sharedDeadline(cards);
        return (
          <section key={month} className="p-5">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
              <h3 className="text-[15px] font-bold tracking-tight">{month}</h3>
              <span className="text-[12.5px] text-muted">
                {deadline ? (
                  <>
                    Artwork due <span className="num">{deadline}</span>
                  </>
                ) : (
                  <>
                    <span className="num">{cards.length}</span>{" "}
                    {cards.length === 1 ? "card" : "cards"}
                  </>
                )}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {cards.map((m) => (
                <AreaPill
                  key={m.cardId ?? `${m.zoneSlug}-${m.mailMonth}`}
                  m={m}
                />
              ))}
            </div>
          </section>
        );
      })}

      {undated.length > 0 && (
        <section className="p-5 bg-surface">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
            <h3 className="text-[15px] font-bold tracking-tight text-muted">
              No date set yet
            </h3>
            <span className="text-[12.5px] text-muted">
              On the plan, not the schedule
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {undated.map((m) => (
              <AreaPill key={m.cardId ?? `${m.zoneSlug}-${m.mailMonth}`} m={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
