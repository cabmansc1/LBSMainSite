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

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * The first of the month a card's display label names.
 *
 * The fallback for an issue drafted before mailDateIso was carried on a
 * card. Those rows all hold the empty string, so judging on that alone
 * put every one of them outside every window and emptied the whole
 * "Open now" section of any existing draft the moment a window was
 * picked. The month label was stored all along and is good enough to
 * place a card in a quarter.
 *
 * Deliberately stricter than `new Date(label)`. That accepts "Winter
 * 2026" and quietly returns the first of January, which would file a
 * card nobody has dated into whichever window happens to contain the
 * start of that year. Only a real month name and a four digit year
 * count; anything else is undated, which is what "Winter 2026" and
 * "TBD" honestly are.
 */
const monthStart = (label: string | undefined): Date | undefined => {
  const m = /^\s*([A-Za-z]+)\.?\s+(\d{4})\s*$/.exec(label ?? "");
  if (!m) return undefined;
  const word = m[1].toLowerCase();
  const i = MONTHS.findIndex((n) => n === word || n.slice(0, 3) === word.slice(0, 3));
  return i === -1 ? undefined : new Date(Number(m[2]), i, 1);
};

/**
 * The date a card should be judged on: the real one when Mission
 * Control set it, else the month it says it mails in.
 */
const cardDate = (c: { mailDateIso?: string; mailMonth?: string }) => {
  if (c.mailDateIso) {
    const d = new Date(c.mailDateIso);
    // An unparseable date is not evidence of anything, so it falls
    // through to the label rather than counting as the epoch.
    if (!isNaN(d.getTime())) return d;
  }
  return monthStart(c.mailMonth);
};

/**
 * The cards inside the window.
 *
 * Zero months means all of them, which is what every issue drafted
 * before this setting existed carries, so an old draft renders exactly
 * what it always did until a window is chosen.
 *
 * A card with no date at all is dropped when a window is set and kept
 * when it is not. That is the opposite of how the rest of the codebase
 * treats an unknown date — elsewhere "cannot say" means "do not judge"
 * and the row survives — and it is deliberate here. A card nobody has
 * committed to a month for cannot honestly be called part of the next
 * three months, and those planned cards are exactly what this setting
 * exists to thin out. Nothing vanishes quietly: the editor says how
 * many the window is holding back and still lists them, dimmed.
 */
export const cardsWithin = <T extends { mailDateIso?: string; mailMonth?: string }>(
  cards: T[],
  months: number,
): T[] => {
  if (!months || months <= 0) return cards;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() + months);
  return cards.filter((c) => {
    const d = cardDate(c);
    return !!d && d.getTime() <= cutoff.getTime();
  });
};
