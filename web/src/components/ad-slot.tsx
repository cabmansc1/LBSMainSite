import { after } from "next/server";
import { AD_SLOT_BY_ID, type AdSlotId } from "@/lib/ads-types";

/**
 * One advertising position on a page.
 *
 * Three outcomes, in order: a sponsored advertiser's creative, a Google
 * unit, or nothing. Nothing means nothing rendered at all, not an empty
 * box with a border. An unsold slot should be invisible.
 *
 * The user agent is passed in rather than read here. This renders inside
 * a Server Component, where headers() cannot be called inside after(),
 * and the impression is recorded in after() so a visitor never waits on
 * a counter.
 */
export async function AdSlot({
  slot,
  categorySlug,
  locationSlug,
  userAgent,
  allowed = true,
  className = "",
}: {
  slot: AdSlotId;
  categorySlug?: string;
  locationSlug?: string;
  userAgent: string;
  /** False on listings that carry no advertising. Renders nothing. */
  allowed?: boolean;
  className?: string;
}) {
  if (!allowed) return null;

  const spec = AD_SLOT_BY_ID.get(slot);
  if (!spec) return null;

  const { pickAd, getAdsense } = await import("@/lib/ads");
  const ad = await pickAd({ slot, categorySlug, locationSlug });

  if (ad) {
    const adId = ad.id;
    after(async () => {
      const { recordImpression } = await import("@/lib/ads");
      await recordImpression(adId, userAgent);
    });

    return (
      <aside
        className={`flex justify-center ${className}`}
        aria-label="Advertisement"
      >
        <div className="grid gap-1 justify-items-center">
          <a
            href={`/api/ad-click/${ad.id}`}
            target="_blank"
            // nofollow and sponsored because that is what this is, and
            // Google is explicit that an unmarked paid link is a manual
            // action waiting to happen.
            rel="nofollow sponsored noopener"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/ad-image/${ad.id}`}
              alt={ad.alt || "Advertisement"}
              width={spec.width}
              height={spec.height}
              className="block max-w-full h-auto rounded-[10px]"
            />
          </a>
          <span className="text-[10px] uppercase tracking-widest text-faint">
            Advertisement
          </span>
        </div>
      </aside>
    );
  }

  // Nobody bought it, so let Google fill it if it is configured to.
  const adsense = await getAdsense();
  const unit = adsense.units[slot];
  if (!adsense.enabled || !adsense.client || !unit) return null;

  return (
    <aside
      className={`flex justify-center ${className}`}
      aria-label="Advertisement"
    >
      <ins
        className="adsbygoogle block"
        style={{
          display: "block",
          width: spec.width,
          maxWidth: "100%",
          height: spec.height,
        }}
        data-ad-client={adsense.client}
        data-ad-slot={unit}
        data-full-width-responsive="true"
      />
      <script
        // The loader is idempotent and AdSense expects exactly this push
        // per unit. Inline rather than a shared island because a slot
        // that renders nothing should also load nothing.
        dangerouslySetInnerHTML={{
          __html: `(adsbygoogle=window.adsbygoogle||[]).push({});`,
        }}
      />
    </aside>
  );
}

/**
 * The AdSense loader, rendered once on a page that has at least one
 * Google-filled slot. Separate from the slot itself because loading it
 * per slot would fetch the same script four times.
 */
export async function AdsenseLoader({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  const { getAdsense } = await import("@/lib/ads");
  const adsense = await getAdsense();
  if (!adsense.enabled || !adsense.client) return null;
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
        adsense.client,
      )}`}
      crossOrigin="anonymous"
    />
  );
}
