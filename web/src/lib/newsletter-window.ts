/**
 * How far ahead the advertiser update lists open cards.
 *
 * Its own module, with no "server-only", because the admin editor needs
 * the same arithmetic the renderer uses: the dropdown has to say how
 * many cards a choice would include before anything is saved, and the
 * only way for that number to be right is for both sides to run one
 * function. Importing it from advertiser-newsletter.ts would pull
 * server-only across into a client component and fail the build.
 *
 * Nothing here touches the database or Mission Control. It is a date
 * comparison and two constants.
 */

/**
 * How far ahead a new issue lists cards, in months.
 *
 * Three, because the whole schedule is not news. Mission Control holds
 * cards pencilled in most of a year out, and an update that opens with
 * fourteen of them buries the two an advertiser could act on. The cards
 * with a deadline inside the quarter are the ones worth reading.
 *
 * Stored per issue rather than globally, so a quiet month can widen to
 * six without changing what every future issue does.
 */
export const DEFAULT_CARD_MONTHS = 3;

/** What the editor offers. 0 is every card, however far out. */
export const CARD_MONTH_CHOICES = [3, 6, 12, 0] as const;

/**
 * The cards inside the window.
 *
 * Zero months means all of them, which is what every issue drafted
 * before this setting existed carries, so an old draft renders exactly
 * what it always did.
 *
 * A card with no mail date is dropped when a window is set and kept
 * when it is not. That is the opposite of how the rest of the codebase
 * treats an unknown date — elsewhere "cannot say" means "do not judge"
 * and the row survives — and it is deliberate here. An undated card is
 * one nobody has committed to a month for, so it cannot honestly be
 * called part of the next three months, and those planned cards are
 * exactly what this setting exists to thin out. Nothing vanishes
 * quietly: the editor says how many the window is holding back and
 * still lists them, dimmed.
 */
export const cardsWithin = <T extends { mailDateIso?: string }>(
  cards: T[],
  months: number,
): T[] => {
  if (!months || months <= 0) return cards;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() + months);
  return cards.filter((c) => {
    if (!c.mailDateIso) return false;
    const d = new Date(c.mailDateIso);
    // An unparseable date is not evidence of anything, so it counts as
    // undated rather than as the epoch, which would keep every card.
    return !isNaN(d.getTime()) && d.getTime() <= cutoff.getTime();
  });
};
