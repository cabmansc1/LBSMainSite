/**
 * What time it is here.
 *
 * Servers run in UTC. `toLocaleDateString` with no zone formats in the
 * server's, which is invisible for sixteen hours a day and wrong for
 * the other eight: anything stamped after 8pm Eastern prints as
 * tomorrow. That is a wrong day on a card, in a list, and in somebody's
 * plans, and it is the kind of bug that looks like a data problem for
 * weeks before anybody realizes it is a formatting one.
 *
 * Two kinds of value get confused here, so they get two functions.
 *
 * A **moment** is a real instant — when a row was created, when an
 * artwork arrived, when an event starts. It is stored with a time and
 * has to be read back in the zone the reader lives in.
 *
 * A **calendar date** is a day with no time — an artwork deadline, a
 * mail date. It is stored as "2026-08-15" and parses as UTC midnight,
 * so reading it back anywhere west of Greenwich would print the day
 * before. It has to stay in UTC, which is not a bug and is the reason
 * the deadline code already did this deliberately.
 *
 * Getting these two the wrong way round moves a date by a day in either
 * direction, so when in doubt: does this value have a time on it?
 */

export const SITE_TZ = "America/New_York";

type DateStyle = Omit<Intl.DateTimeFormatOptions, "timeZone">;

const asDate = (d: unknown): Date | null => {
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const s = String(d ?? "").trim();
  if (!s) return null;
  // MySQL hands back "2026-08-15 19:30:00"; Safari refuses that form.
  const dt = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  return isNaN(dt.getTime()) ? null : dt;
};

/** A real instant, read in Lowcountry time. */
export function formatMoment(
  d: unknown,
  style: DateStyle = { month: "long", day: "numeric", year: "numeric" },
): string | undefined {
  const dt = asDate(d);
  return dt?.toLocaleDateString("en-US", { ...style, timeZone: SITE_TZ });
}

/** The clock part of an instant, in Lowcountry time. */
export function formatClock(
  d: unknown,
  style: DateStyle = { hour: "numeric", minute: "2-digit" },
): string | undefined {
  const dt = asDate(d);
  return dt?.toLocaleTimeString("en-US", { ...style, timeZone: SITE_TZ });
}

/**
 * A day with no time, kept on the day it says.
 *
 * Formatted in UTC on purpose. See the note above before changing it.
 */
export function formatCalendarDate(
  d: unknown,
  style: DateStyle = { month: "long", day: "numeric", year: "numeric" },
): string | undefined {
  const dt = asDate(d);
  return dt?.toLocaleDateString("en-US", { ...style, timeZone: "UTC" });
}

/** Today here, as "2026-08-15". Sortable and comparable. */
export const todayHere = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: SITE_TZ });
