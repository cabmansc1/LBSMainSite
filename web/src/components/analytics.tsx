"use client";

import Script from "next/script";
import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * The four trackers the live PHP site loads on every page, ported from
 * seo_head.php.
 *
 * The IDs are hardcoded rather than read from env on purpose. They are
 * the same four values in every environment the legacy site ever ran in,
 * and an unset NEXT_PUBLIC_ variable does not fail loudly: it just makes
 * the tags render with an empty id and quietly stop reporting. Losing
 * Meta conversion signal without noticing is worse than a hardcoded
 * string, so these match seo_head.php lines 45 to 48 exactly.
 *
 * There is deliberately no consent gate. The live site fires all four
 * unconditionally on page load and this port matches it.
 */

const GA4_ID = "G-38313KT3XE";
const GTM_ID = "GTM-5ZP4TT23";
const META_PIXEL_ID = "629481023248934";
const GOOGLE_ADS_ID = "AW-18077746446";

/** The one Google Ads conversion action thank_you.php sent. */
const GOOGLE_ADS_LEAD_CONVERSION = `${GOOGLE_ADS_ID}/XxKsCMijt68cEI6KkqxD`;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * The PHP put these in <head>, so anything firing an event later could
 * assume gtag and fbq existed. Here the tags load afterInteractive, so a
 * page effect can easily run first. Wait for them rather than dropping
 * the event, and give up after a few seconds so a blocked pixel does not
 * also cost us the Google Ads conversion.
 */
function whenTagsReady(fire: () => void): () => void {
  let attempts = 0;
  let timer = 0;
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;
    const ready =
      typeof window.gtag === "function" && typeof window.fbq === "function";
    if (ready || attempts++ >= 40) {
      fire();
      return;
    }
    timer = window.setTimeout(tick, 250);
  };

  tick();
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}

/**
 * The quiz result event, from find-your-ad.php showResults() around line
 * 1046. Meta ad delivery optimises on this Lead, so it matters more than
 * the page view does.
 */
export function trackQuizComplete(businessType: string, goal: string) {
  whenTagsReady(() => {
    window.fbq?.("track", "Lead");
    window.gtag?.("event", "quiz_complete", {
      business_type: businessType,
      goal,
    });
  });
}

/**
 * A view of one directory listing, named.
 *
 * GA4 already counts the page view for /business/[slug]; what it cannot
 * do is tell you which business that was without reading slugs out of
 * URLs. This sends the name and slug as parameters so a report can be
 * grouped by listing the way the admin screen is.
 *
 * It is not the same number as the admin screen and is not meant to be.
 * lbs_listing_views records one row per visitor per listing per day;
 * this fires on every view, so a reader who opens a listing three times
 * is three events here and one there. Both are honest, and they answer
 * different questions: how much traffic, and how many people.
 *
 * Fires per page view rather than per mount. Strict Mode runs an effect
 * twice and client side navigation between two listings remounts this
 * with new props, so the guard is the slug rather than a bare ref.
 */
export function ListingView({
  slug,
  name,
  category,
}: {
  slug: string;
  name: string;
  category?: string;
}) {
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (reported.current === slug) return;
    reported.current = slug;
    return whenTagsReady(() => {
      window.gtag?.("event", "listing_view", {
        business_slug: slug,
        business_name: name,
        ...(category ? { business_category: category } : {}),
      });
    });
  }, [slug, name, category]);

  return null;
}

/**
 * The post-purchase conversion, from thank_you.php lines 13 to 21.
 *
 * The PHP guarded the Google Ads conversion behind a session flag it
 * cleared on read, so a refresh of the thank you page could not re-count
 * the sale. A Stripe session id is the equivalent one-shot token here,
 * and sessionStorage is the equivalent latch. The PHP left the Meta Lead
 * ungated and so re-fired it on every refresh; that is a bug rather than
 * an intent, so both events are latched together.
 */
export function LeadConversion({ dedupeKey }: { dedupeKey: string }) {
  useEffect(() => {
    const key = `lbs:lead-conversion:${dedupeKey}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Private browsing can throw on storage. Reporting the conversion
      // twice beats not reporting it at all.
    }

    return whenTagsReady(() => {
      window.gtag?.("event", "conversion", {
        send_to: GOOGLE_ADS_LEAD_CONVERSION,
      });
      window.fbq?.("track", "Lead");
    });
  }, [dedupeKey]);

  return null;
}

/**
 * Every navigation on the PHP site was a document load, so every page a
 * visitor saw produced a Meta PageView. Client side routing here fires
 * none after the first, which would collapse the pixel down to landing
 * pages only. GA4 is left alone: its enhanced measurement already counts
 * history changes, and sending our own page_view would double count it.
 */
function RouteChangePageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Comparing the URL rather than counting renders: an effect that runs
  // twice for one URL, as it does under Strict Mode, must still send one
  // PageView.
  const reported = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (reported.current === url) return;
    const isEntryPage = reported.current === null;
    reported.current = url;
    // The init snippet already sent the PageView for the entry page.
    if (isEntryPage) return;
    window.fbq?.("track", "PageView");
  }, [pathname, searchParams]);

  return null;
}

export function Analytics() {
  return (
    <>
      {/* Google tag (gtag.js), configured for GA4 and Google Ads both,
          the same pair of config calls seo_head.php makes. */}
      <Script
        id="gtag-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
window.gtag = function gtag(){window.dataLayer.push(arguments);};
gtag('js', new Date());
gtag('config', '${GA4_ID}');
gtag('config', '${GOOGLE_ADS_ID}');`,
        }}
      />

      {/* Google Tag Manager. seo_head.php emits no GTM <noscript> iframe
          and neither does header.php, so none is added here. */}
      <Script
        id="gtm-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
        }}
      />

      {/* Meta Pixel. The snippet injects its own async script tag, so
          the strategy only decides when the stub and queue appear. */}
      <Script
        id="meta-pixel-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>

      {/* useSearchParams opts its subtree out of prerendering, so it is
          fenced off here rather than dragging the whole app with it. */}
      <Suspense fallback={null}>
        <RouteChangePageView />
      </Suspense>
    </>
  );
}
