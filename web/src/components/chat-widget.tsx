"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * The LeadConnector chat widget, ported from footer.php line 117.
 *
 * footer.php wraps it in `if (empty($hideChatWidget))` and every page
 * with a phone field sets that flag before including the footer. That is
 * an A2P 10DLC requirement, not a layout preference: a page that asks
 * for a phone number must offer exactly one SMS opt-in path, and the
 * widget would be a second one. includes/sms_consent.php spells it out.
 *
 * The rule is expressed as routes rather than as a prop each page
 * passes, because client side routing breaks the per-page version. The
 * widget injects itself into <body>, outside React, so a visitor who
 * loads /pricing and then navigates to /contact keeps a widget the
 * server never rendered. Deciding here, from the current pathname,
 * covers entry and navigation both, and keeps the compliance list in one
 * auditable place the way the PHP kept it in one `if`.
 */

const WIDGET_ID = "69d532d03d6e16133a207508";

/**
 * Where a sales chat belongs.
 *
 * It used to run everywhere except a suppression list, which made sense
 * when every page was about postcards. It is now also a directory, a
 * calendar and a place people read stories, and a "talk to us about
 * advertising" bubble following somebody around an article about a
 * bakery is an interruption rather than an offer.
 *
 * An allow list rather than a deny list, so a page added next month
 * gets no widget until somebody decides it should have one. That is the
 * safer direction for the same reason the suppression list was: the
 * cost of a missing widget is a conversation that happens by phone
 * instead, and the cost of an unwanted one is a compliance problem.
 */
function sellsPostcards(pathname: string): boolean {
  if (pathname === "/") return true;
  const exact = [
    "/advertise",
    "/pricing",
    "/compare",
    "/coverage-map",
    "/mailing-calendar",
    "/neighborhood-cards",
    "/roi-calculator",
    "/find-your-ad",
    "/gallery",
    "/coming-soon-service-areas",
  ];
  if (exact.includes(pathname)) return true;
  return (
    pathname.startsWith("/postcards/") ||
    pathname.startsWith("/neighborhood-card/") ||
    pathname.startsWith("/cards/") ||
    pathname.startsWith("/gallery/")
  );
}

/** Routes with a phone input, found by grepping src for tel inputs. */
function collectsPhoneNumber(pathname: string): boolean {
  // contact-form.tsx
  if (pathname === "/contact") return true;
  // profile-gaps.tsx on the portal home, profile-form.tsx on /profile.
  // The whole portal is covered, as the PHP covered my-cards.php,
  // create-listing.php and manage-listing.php together.
  if (pathname === "/account" || pathname.startsWith("/account/")) return true;
  // postcard-checkout.tsx
  if (/^\/postcards\/[^/]+\/checkout\/?$/.test(pathname)) return true;
  return false;
}

function suppressed(pathname: string): boolean {
  // Staff tooling. Not the 10DLC rule, just nowhere a sales chat belongs,
  // and several admin screens edit customer phone numbers.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  return collectsPhoneNumber(pathname);
}

/**
 * Selectors for the nodes the loader appends to <body>. Not rendering
 * the Script is enough on a fresh load, but on a client side navigation
 * into a suppressed route the widget is already in the DOM and only CSS
 * can take it back off screen. Nothing in this app uses these names, so
 * the substring matches are safe to keep broad.
 */
const HIDE_WIDGET_CSS = `
chat-widget,
[id*="chat-widget"],
[class*="chat-widget"],
[id*="lc_text"],
[class*="lc_text"] { display: none !important; }
`;

export function ChatWidget() {
  const pathname = usePathname();

  // Suppression still wins. The 10DLC rule is not a preference, so a
  // postcard page that collects a phone number gets no widget however
  // commercial it is — /postcards/x/checkout is both.
  if (suppressed(pathname) || !sellsPostcards(pathname)) {
    return <style dangerouslySetInnerHTML={{ __html: HIDE_WIDGET_CSS }} />;
  }

  return (
    <Script
      id="leadconnector-chat-widget"
      src="https://beta.leadconnectorhq.com/loader.js"
      data-resources-url="https://beta.leadconnectorhq.com/chat-widget/loader.js"
      data-widget-id={WIDGET_ID}
      strategy="lazyOnload"
    />
  );
}
