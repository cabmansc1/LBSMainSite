/**
 * The windows a listing's views can be counted over.
 *
 * Its own module, with no "server-only", because the admin screen is a
 * client component and the page that queries the database is a server
 * one: both need the same list of choices and the same idea of what
 * `?days=` means, and one of them cannot import the other.
 */

/** 0 is everything ever counted, not zero days. */
export const VIEW_WINDOWS = [7, 30, 90, 365, 0] as const;

export type ViewWindow = (typeof VIEW_WINDOWS)[number];

export const DEFAULT_VIEW_WINDOW: ViewWindow = 30;

export const viewWindowLabel = (days: number) => {
  if (days <= 0) return "All time";
  if (days === 365) return "12 months";
  return `${days} days`;
};

/** The same, as a phrase that reads under a number. */
export const viewWindowPhrase = (days: number) =>
  days <= 0 ? "views, all time" : `views in ${viewWindowLabel(days).toLowerCase()}`;

/**
 * Whatever arrived in the query string, turned into one of the choices.
 *
 * A URL is something anybody can type, and `?days=nonsense` should show
 * the default rather than an empty table or, worse, a number nobody can
 * account for. Anything not on the list is not honoured — a free-form
 * window would put a figure on screen that no label describes.
 */
export function parseViewWindow(raw: unknown): ViewWindow {
  const first = Array.isArray(raw) ? raw[0] : raw;
  /* Emptiness has to be rejected before Number() sees it. Number("")
     and Number(null) are both 0, and 0 is a real choice here meaning
     all time — so a bare "?days=" would have quietly shown every view
     ever recorded under a heading nobody asked for. */
  if (first === null || first === undefined || String(first).trim() === "") {
    return DEFAULT_VIEW_WINDOW;
  }
  const n = Number(first);
  return (VIEW_WINDOWS as readonly number[]).includes(n)
    ? (n as ViewWindow)
    : DEFAULT_VIEW_WINDOW;
}
