"use client";

import { useEffect } from "react";

/**
 * Keeps the chosen view for next time.
 *
 * The URL is what decides which view renders, so the page is server
 * rendered correctly on the first paint and a link to a list stays a
 * link to a list. This only writes down what was chosen so the next
 * visit opens the same way, which is the difference between a toggle
 * and a preference.
 *
 * A cookie rather than local storage because the page that has to
 * honour it renders on the server, and a value only the browser can
 * read would mean rendering cards and then swapping them.
 *
 * Renders nothing. It exists for its one side effect.
 */
export function RememberView({ name, value }: { name: string; value: string }) {
  useEffect(() => {
    // A year, no cross-site sending, and readable by the server on the
    // next request. Nothing here identifies anybody, so there is no
    // consent question to answer.
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
  }, [name, value]);

  return null;
}
