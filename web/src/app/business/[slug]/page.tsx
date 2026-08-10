import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Card } from "@/components/sections";
import { PhotoGrid } from "@/components/photo-lightbox";
import { InquiryForm } from "@/components/inquiry-form";
import { getPastCards } from "@/lib/past-cards";
import { kindEyebrow } from "@/lib/stories-types";
import {
  getBusinesses,
  getBusiness,
  getBusinessForPreview,
  getCategoryCounts,
} from "@/lib/directory";
import { AdSlot, AdsenseLoader } from "@/components/ad-slot";
import { dealsForBusiness } from "@/lib/lowco-deals";
import { advertiserAppearances } from "@/lib/mission-control";
import { SITE_URL } from "@/lib/seo";
import { RichText } from "@/components/rich-text";
import { richTextToPlain } from "@/lib/rich-text";

export const dynamic = "force-dynamic";

/** Category to schema type, ported from business.php. */
const SCHEMA_TYPE_BY_CATEGORY: Record<string, string> = {
  restaurant: "Restaurant",
  "restaurants-dining": "Restaurant",
  automotive: "AutoRepair",
  "health-wellness": "HealthAndBeautyBusiness",
  beauty: "BeautySalon",
  "beauty-personal-care": "BeautySalon",
  legal: "LegalService",
  "fitness-recreation": "SportsActivityLocation",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBusiness(slug);
  // Unpublished, so either it does not exist or only an admin can see
  // it. Said out loud rather than left to inherit whatever the root
  // metadata says, because the one thing that must never happen is a
  // listing nobody has approved turning up in a search result.
  if (!b) return { robots: { index: false, follow: false } };
  return {
    // Name and place only. Category too pushed these past 60 characters,
    // and the legacy titles that rank are just "Name - brand". Plenty of
    // listings already carry their city in the name, so it is not
    // repeated.
    title: b.name.toLowerCase().includes(b.locationArea.toLowerCase())
      ? b.name
      : `${b.name} | ${b.locationArea}, SC`,
    description:
      richTextToPlain(b.description).slice(0, 155) ||
      `${b.name} is a ${b.category.toLowerCase()} business in ${b.locationArea}, SC. See contact details, hours and offers in the Lowcountry Business Spotlight directory.`,
    alternates: { canonical: `${SITE_URL}/business/${slug}` },
  };
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let b = await getBusiness(slug);

  // A submission is unverified until it is approved, and unverified is
  // what this page refuses to render, so reviewing one meant approving
  // it first and looking afterwards. An admin gets to see it as it would
  // appear; everybody else still gets the 404.
  let preview = false;
  if (!b) {
    const { getSession } = await import("@/lib/auth");
    const viewer = await getSession().catch(() => null);
    if (viewer?.role === "admin") {
      b = await getBusinessForPreview(slug);
      preview = !!b;
    }
  }
  if (!b) notFound();

  // The request data is read HERE and passed down, never inside an
  // after() callback. A Server Component cannot use headers() or
  // cookies() inside after(): Next has to know during rendering which
  // parts of the tree touch request data, and after() runs once rendering
  // is over. Calling them in there throws, and because after() swallows
  // its own errors it throws silently, which is exactly how the view
  // counter once shipped counting nothing. The ad slots record their
  // impressions the same way and need the same value.
  const { headers } = await import("next/headers");
  const h = await headers();
  // The first hop is the real client; the rest are proxies adding
  // themselves, and taking the last would count every visitor as the
  // same one.
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const userAgent = h.get("user-agent") ?? "";
  const { getSession } = await import("@/lib/auth");
  const viewer = await getSession().catch(() => null);

  // After the response, so a visitor never waits on a write they will not
  // see, and a failure to count cannot stop a listing rendering. A preview
  // is not a view: nobody has found this listing, an admin is checking it.
  if (!preview) {
    const listingId = b.id;
    after(async () => {
      const { recordListingView } = await import("@/lib/listing-views");
      await recordListingView({
        businessId: listingId,
        ip,
        userAgent,
        isAdmin: viewer?.role === "admin",
      });
    });
  }

  // Featured listings carry no advertising, so a paying advertiser's page
  // never sells the same reader to a competitor. An unapproved listing
  // being previewed carries none either: there is no audience to sell.
  const { adsAllowed, getAdsense } = await import("@/lib/ads");
  const [showAds, adsense] = await Promise.all([
    preview ? Promise.resolve(false) : adsAllowed(b.id, b.isFeatured),
    getAdsense(),
  ]);

  // Cross-site and Mission Control lookups are best-effort extras; the
  // page renders fine when either source is unreachable.
  const [
    related,
    lowcoDeals,
    archive,
    appearances,
    theirStories,
    theirEvents,
    categoryCounts,
  ] = await Promise.all([
    // "More X Businesses" on the legacy page: internal links that keep a
    // visitor in the directory and spread crawl depth across listings.
    getBusinesses({ category: b.categorySlug })
      .then((rows) => rows.filter((r) => r.slug !== b.slug).slice(0, 6))
      .catch(() => []),
    dealsForBusiness(b.name).catch(() => []),
    getPastCards({ publishedOnly: true }).catch(() => []),
    advertiserAppearances({ name: b.name }).catch(
      () =>
        [] as {
          cardId: string;
          cardName?: string;
          zoneName: string;
          mailMonth: string;
          mailDateIso: string;
        }[],
    ),
    // Anything written about them, and anything they are putting on.
    // This is what makes filing a story against a business worth the
    // thirty seconds it takes: it turns up here on its own.
    (async () => {
      const { publishedStories } = await import("@/lib/stories");
      return publishedStories({ businessId: b.id, limit: 3 });
    })().catch(() => []),
    (async () => {
      const { publishedEvents } = await import("@/lib/events");
      return publishedEvents({ businessId: b.id, limit: 3 });
    })().catch(() => []),
    // The sidebar browser. A listing page used to be a cul-de-sac: the
    // only ways back into the directory were the breadcrumb and the
    // related list, both of which stay inside one category.
    getCategoryCounts().catch(() => []),
  ]);

  const sameAs = [
    b.website,
    b.socials?.facebook,
    b.socials?.instagram,
    b.socials?.tiktok,
    b.socials?.youtube,
  ].filter(Boolean);

  // The legacy page typed the schema by category and carried the map
  // coordinates and opening hours. Those are the signals that put a
  // listing in a local pack, so they carry over rather than flattening
  // every listing to a bare LocalBusiness.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPE_BY_CATEGORY[b.categorySlug] ?? "LocalBusiness",
    name: b.name,
    description: richTextToPlain(b.description),
    url: `${SITE_URL}/business/${b.slug}`,
    telephone: b.phone,
    image: b.logoUrl,
    sameAs: sameAs.length ? sameAs : undefined,
    address: b.address
      ? {
          "@type": "PostalAddress",
          streetAddress: b.address,
          addressLocality: b.locationArea,
          addressRegion: "SC",
        }
      : {
          "@type": "PostalAddress",
          addressLocality: b.locationArea,
          addressRegion: "SC",
        },
    geo:
      b.lat && b.lng
        ? { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng }
        : undefined,
    openingHoursSpecification: b.hours?.length
      ? b.hours
          .filter((h) => !/closed/i.test(h.text))
          .map((h) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: h.day,
            description: h.text,
          }))
      : undefined,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Directory",
        item: `${SITE_URL}/directory`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: b.category,
        item: `${SITE_URL}/directory/category/${b.categorySlug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: b.name,
        item: `${SITE_URL}/business/${b.slug}`,
      },
    ],
  };

  // Share links, as plain anchors. Every one of these is a URL the
  // network already understands, so the rail needs no JavaScript and
  // works on the first paint.
  const pageUrl = `${SITE_URL}/business/${b.slug}`;
  const enc = encodeURIComponent;
  const SHARES: {
    key: string;
    label: string;
    href: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "facebook",
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(pageUrl)}`,
      icon: (
        <path d="M14 8h2V5h-2.5A3.5 3.5 0 0 0 10 8.5V11H8v3h2v7h3v-7h2.3l.7-3H13V9a1 1 0 0 1 1-1z" />
      ),
    },
    {
      key: "x",
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${enc(pageUrl)}&text=${enc(b.name)}`,
      icon: (
        <path d="M17.5 3h2.9l-6.3 7.2L21.5 21h-5.8l-4.5-5.9L5.9 21H3l6.7-7.7L2.8 3h5.9l4.1 5.4L17.5 3zm-1 16.2h1.6L8.6 4.7H6.9l9.6 14.5z" />
      ),
    },
    {
      key: "linkedin",
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(pageUrl)}`,
      icon: (
        <path d="M6.9 8.5v10.6H3.6V8.5h3.3zM5.3 3.3a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8zM20.4 19.1h-3.3v-5.2c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8v5.3H10V8.5h3.1v1.4h.1c.5-.8 1.6-1.7 3.2-1.7 3.4 0 4 2.2 4 5.1v5.8z" />
      ),
    },
    {
      key: "email",
      label: "Share by email",
      href: `mailto:?subject=${enc(b.name)}&body=${enc(`${b.name} in the Lowcountry Business Spotlight directory: ${pageUrl}`)}`,
      icon: (
        <path d="M3 5.5h18c.6 0 1 .4 1 1V17c0 .8-.7 1.5-1.5 1.5h-17C2.7 18.5 2 17.8 2 17V6.5c0-.6.4-1 1-1zm9 7.1 8-4.6H4l8 4.6z" />
      ),
    },
  ];

  const SOCIALS: {
    key: string;
    href?: string;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "facebook",
      href: b.socials?.facebook,
      label: "Facebook",
      icon: (
        <path d="M14 8h2V5h-2.5A3.5 3.5 0 0 0 10 8.5V11H8v3h2v7h3v-7h2.3l.7-3H13V9a1 1 0 0 1 1-1z" />
      ),
    },
    {
      key: "instagram",
      href: b.socials?.instagram,
      label: "Instagram",
      icon: (
        <>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="12"
            cy="12"
            r="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="17.2" cy="6.8" r="1.3" />
        </>
      ),
    },
    {
      key: "tiktok",
      href: b.socials?.tiktok,
      label: "TikTok",
      icon: (
        <path d="M15 4a5 5 0 0 0 5 4v3a8 8 0 0 1-5-1.7V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V4h3z" />
      ),
    },
    {
      key: "youtube",
      href: b.socials?.youtube,
      label: "YouTube",
      icon: (
        <>
          <rect x="2.5" y="6" width="19" height="12" rx="3.5" />
          <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5z" fill="#fff" />
        </>
      ),
    },
  ];

  return (
    <>
      {preview && (
        // Unmissable on purpose. This page is indistinguishable from the
        // live one otherwise, and mistaking a preview for a published
        // listing is how something gets left unapproved for a week.
        <div className="bg-cta text-navy-950 px-6 py-2.5 text-[13px] font-bold text-center">
          Not published. Only you can see this.{" "}
          <Link href="/admin/directory" className="underline">
            Approve or remove it in Directory
          </Link>
        </div>
      )}
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-11 pb-13">
          <nav
            className="text-[12.5px] text-[#67768A] flex gap-2"
            aria-label="Breadcrumb"
          >
            <Link href="/directory" className="hover:text-white">
              Directory
            </Link>
            <span>/</span>
            <Link
              href={`/directory/category/${b.categorySlug}`}
              className="hover:text-white"
            >
              {b.category}
            </Link>
            <span>/</span>
            <b className="text-white font-semibold">{b.name}</b>
          </nav>
          <div className="mt-5 flex items-start justify-between gap-5">
            <div className="min-w-0">
              <h1 className="text-[26px] md:text-[36px] font-bold tracking-[-0.03em] leading-tight">
                {b.name}
              </h1>
              <p className="text-[#93A5B8] text-[14.5px] mt-1">
                {b.category} · {b.locationArea}, SC
                {b.isFeatured && (
                  <span className="inline-flex items-center gap-1 ml-3 text-xs font-bold text-navy-950 bg-cta rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2l2.9 6.3 6.6.6-5 4.5 1.5 6.6L12 16.9 6 20l1.5-6.6-5-4.5 6.6-.6z" />
                    </svg>
                    Featured
                  </span>
                )}
                {b.isVerified && (
                  <span className="inline-flex items-center gap-1 ml-3 text-xs font-semibold text-white bg-white/8 border border-white/16 rounded-full px-2.5 py-0.5">
                    <svg
                      className="text-brand"
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Verified
                  </span>
                )}
              </p>
            </div>
            {b.logoUrl ? (
              // Both shapes of logo URL optimize as things stand: the
              // legacy uploads host is in remotePatterns, and a logo
              // uploaded through this app is served same-origin from
              // /api/business-image/<id>. The box is a fixed square, so
              // saying so reserves the space and holds the srcset to
              // the two sizes it can actually draw. Eager because this
              // is the one image on the first screen of the page.
              <Image
                src={b.logoUrl}
                alt={`${b.name} logo`}
                width={112}
                height={112}
                loading="eager"
                className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white object-contain p-1.5 border border-white/15 shrink-0 ml-auto"
              />
            ) : (
              <span className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-brand text-navy-950 font-bold text-2xl flex items-center justify-center shrink-0 ml-auto">
                {b.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Three zones: the share rail, the listing, and a sidebar that is
          part navigation and part advertising. The rail and the sidebar
          both stick, so a long listing does not scroll either of them out
          of existence. Below lg they stack, rail first as a plain row. */}
      <div className="mx-auto max-w-[1120px] px-6 py-8 grid lg:grid-cols-[52px_minmax(0,1fr)_300px] gap-5 lg:gap-6 items-start">
        <aside className="lg:sticky lg:top-4 flex lg:grid gap-2 items-center lg:justify-items-center">
          <span className="hidden lg:block text-[10px] font-bold uppercase tracking-[0.09em] text-muted text-center leading-tight">
            Share
            <br />
            this
          </span>
          <span className="lg:hidden text-[11px] font-bold uppercase tracking-widest text-muted">
            Share
          </span>
          {SHARES.map((s) => (
            <a
              key={s.key}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              title={s.label}
              className="w-9 h-9 lg:w-10 lg:h-10 rounded-[8px] bg-navy-950 text-white flex items-center justify-center hover:bg-brand-deep transition-colors shrink-0"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                {s.icon}
              </svg>
            </a>
          ))}
        </aside>

        <div className="grid gap-3.5 min-w-0">
          <Card className="p-6.5 grid gap-3">
            <span
              className="block h-[3px] w-[54px] bg-brand rounded-full"
              aria-hidden
            />
            <RichText
              text={b.description}
              className="text-sm text-body leading-relaxed"
            />
            {b.tags && b.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {b.tags.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/directory/tag/${t.slug}`}
                    className="text-[11.5px] font-semibold text-brand-deep bg-brand-tint rounded-full px-2.5 py-1 hover:bg-brand hover:text-white transition-colors"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Contact as labelled rows, up here with the description
                rather than in a sidebar box. On a phone the sidebar was
                below everything, so the phone number was the last thing
                on the page for the reader most likely to want to call. */}
            <dl className="grid mt-3 border-t border-line">
              {b.phone && (
                <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3.5 items-baseline py-2.5 border-b border-line">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                    Phone
                  </dt>
                  <dd className="m-0 text-[14.5px]">
                    <a
                      href={`tel:${b.phone.replace(/\D/g, "")}`}
                      className="font-semibold text-brand-deep hover:underline"
                    >
                      {b.phone}
                    </a>
                  </dd>
                </div>
              )}
              {b.address ? (
                <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3.5 items-baseline py-2.5 border-b border-line">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                    Address
                  </dt>
                  <dd className="m-0 text-[14.5px]">
                    {b.address}{" "}
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`}
                      target="_blank"
                      rel="noopener"
                      className="text-brand-deep font-medium hover:underline whitespace-nowrap"
                    >
                      Map
                    </a>
                  </dd>
                </div>
              ) : (
                // Most listings carry a city and no street. An empty
                // Address row would read as missing data rather than as a
                // business that does not work from a shopfront.
                <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3.5 items-baseline py-2.5 border-b border-line">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                    Serves
                  </dt>
                  <dd className="m-0 text-[14.5px]">
                    {b.locationArea} and the surrounding Lowcountry
                  </dd>
                </div>
              )}
              {b.website && (
                <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3.5 items-baseline py-2.5 border-b border-line">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                    Website
                  </dt>
                  <dd className="m-0 text-[14.5px] min-w-0">
                    <a
                      href={b.website}
                      rel="nofollow noopener"
                      target="_blank"
                      className="text-brand-deep hover:underline break-all"
                    >
                      {b.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  </dd>
                </div>
              )}
              {SOCIALS.some((s) => s.href) && (
                <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3.5 items-baseline py-2.5 border-b border-line">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                    Social
                  </dt>
                  <dd className="m-0 flex gap-2">
                    {SOCIALS.filter((s) => s.href).map((s) => (
                      <a
                        key={s.key}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                        title={s.label}
                        className="w-9 h-9 rounded-[8px] bg-surface border border-line flex items-center justify-center text-brand-deep hover:bg-brand hover:text-white hover:border-brand transition-colors"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          {s.icon}
                        </svg>
                      </a>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            <div className="flex items-center gap-2.5 flex-wrap pt-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Categories:
              </span>
              <Link
                href={`/directory/category/${b.categorySlug}`}
                className="bg-navy-950 text-white text-[11.5px] font-bold uppercase tracking-[0.05em] px-3 py-1.5 rounded-[6px] hover:bg-brand-deep transition-colors"
              >
                {b.category}
              </Link>
              <Link
                href={`/directory/location/${b.locationSlug}`}
                className="bg-navy-950 text-white text-[11.5px] font-bold uppercase tracking-[0.05em] px-3 py-1.5 rounded-[6px] hover:bg-brand-deep transition-colors"
              >
                {b.locationArea}
              </Link>
            </div>
          </Card>

          <AdSlot
            slot="in_content"
            allowed={showAds}
            categorySlug={b.categorySlug}
            locationSlug={b.locationSlug}
            userAgent={userAgent}
          />

          {/*
            Anything we have written about them, and anything they are
            putting on. Both come from the joins set when a story or an
            event is filed, which is what makes that thirty seconds
            worth spending: nobody links this by hand.
          */}
          {(theirStories.length > 0 || theirEvents.length > 0) && (
            <Card className="p-6.5 grid gap-4">
              {theirStories.length > 0 && (
                <div className="grid gap-2.5">
                  <h2 className="text-[17px] font-semibold tracking-tight">
                    {theirStories.length === 1
                      ? "We wrote about them"
                      : "We have written about them"}
                  </h2>
                  {theirStories.map((st) => (
                    <Link
                      key={st.id}
                      href={`/stories/${st.slug}`}
                      className="block border border-line rounded-[10px] px-4 py-3 hover:border-navy-950"
                    >
                      <span className="block text-[11px] uppercase tracking-widest font-semibold text-brand-deep">
                        {kindEyebrow(st.kind)}
                        {st.sponsored && " · Sponsored"}
                      </span>
                      <span className="block mt-1 text-[15px] font-semibold leading-snug">
                        {st.title}
                      </span>
                      {st.publishedLabel && (
                        <span className="block mt-1 text-[12.5px] text-muted num">
                          {st.publishedLabel}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {theirEvents.length > 0 && (
                <div className="grid gap-2.5">
                  <h2 className="text-[17px] font-semibold tracking-tight">
                    Coming up
                  </h2>
                  {theirEvents.map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/events/${ev.slug}`}
                      className="flex items-start gap-3.5 border border-line rounded-[10px] px-4 py-3 hover:border-navy-950"
                    >
                      <span className="shrink-0 w-[48px] rounded-[9px] bg-navy-950 text-white text-center py-1.5">
                        <b className="block text-[17px] leading-none num">
                          {ev.dayOfMonth}
                        </b>
                        <span className="text-[10px] uppercase tracking-widest">
                          {ev.monthLabel}
                        </span>
                      </span>
                      <span className="block">
                        <span className="block text-[15px] font-semibold leading-snug">
                          {ev.title}
                        </span>
                        <span className="block mt-0.5 text-[12.5px] text-muted">
                          {ev.timeLabel}
                          {ev.venueName && ` · ${ev.venueName}`}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Photos moved up from below the hours. They are the thing a
              reader actually stops on, and they were sitting under four
              panels that only some listings have. */}
          {b.photos && b.photos.length > 0 && (
            <Card className="p-6.5 grid gap-3">
              <h2 className="text-[17px] font-semibold tracking-tight">
                Photos
              </h2>
              <PhotoGrid photos={b.photos.slice(0, 9)} />
            </Card>
          )}

          {appearances.length > 0 && (
            <Card className="p-6.5 grid gap-3 bg-brand-tint border-brand/25">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-brand-deep">
                  As seen in mailboxes
                </span>
                <p className="text-sm text-body leading-relaxed mt-1">
                  {b.name} has appeared on {appearances.length}{" "}
                  {appearances.length === 1
                    ? "Spotlight card"
                    : "Spotlight cards"}{" "}
                  mailed to local homes.
                </p>
              </div>
              {/* One line per card, because prose joined with "and" turns
                  unreadable the moment a business has ridden three of
                  them. Cards in the archive link to their own page: the
                  listing and the card page each make the other real. */}
              {/* Seventeen lines is a wall, not a list. Show the recent
                  ones and count the rest. */}
              <ul className="grid gap-1.5">
                {appearances.slice(0, 6).map((a) => {
                  const inArchive = archive.find(
                    (c) =>
                      c.mcCardId === a.cardId ||
                      (c.zoneName === a.zoneName &&
                        c.mailMonth === a.mailMonth),
                  );
                  // Two cards can share a zone and a month. Tell them
                  // apart by mail date rather than card name: Mission
                  // Control names cards for the campaign, so one mailing
                  // on April 30 is called "May 2026" and printing that
                  // beside "April 2026" reads like a mistake.
                  const sameMonth = appearances.filter(
                    (x) =>
                      x.zoneName === a.zoneName && x.mailMonth === a.mailMonth,
                  );
                  const exactDate =
                    a.mailDateIso &&
                    new Date(a.mailDateIso).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      // A mail date is a day, not a moment. See lib/time.ts.
                      timeZone: "UTC",
                    });
                  const label =
                    sameMonth.length > 1 && exactDate
                      ? `${a.zoneName}, ${exactDate}`
                      : `${a.zoneName}, ${a.mailMonth}`;
                  return (
                    <li
                      key={a.cardId}
                      className="flex items-baseline gap-2 text-sm"
                    >
                      <span
                        aria-hidden
                        className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 translate-y-[-2px]"
                      />
                      {inArchive ? (
                        <Link
                          href={`/cards/${inArchive.slug}`}
                          className="font-semibold text-brand-deep hover:underline"
                        >
                          {label}
                        </Link>
                      ) : (
                        <span className="text-body">{label}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {appearances.length > 6 && (
                <p className="text-[13px] text-body">
                  and {appearances.length - 6} more, going back to{" "}
                  {appearances[appearances.length - 1].mailMonth}.
                </p>
              )}
              <Link
                href="/gallery"
                className="text-[13px] font-semibold text-brand-deep hover:underline"
              >
                Browse past cards
              </Link>
            </Card>
          )}

          {lowcoDeals.length > 0 && (
            <Card className="p-6.5 grid gap-3 border-l-[3px] border-l-[#8CBB39]">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Live deals on
                </span>
                <Image
                  src="/brand/lowcodeals.png"
                  alt="LowCoDeals"
                  width={68}
                  height={20}
                  className="h-5 w-auto"
                />
              </div>
              <div className="grid gap-2.5">
                {lowcoDeals.map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center justify-between gap-4 bg-surface border border-line rounded-[10px] px-4 py-3 hover:border-faint transition-colors"
                  >
                    <span className="text-sm font-semibold">{d.title}</span>
                    <span className="text-[13px] num shrink-0">
                      {d.dealPrice !== undefined && d.dealPrice > 0 && (
                        <b className="font-bold text-[#5C8420]">
                          ${d.dealPrice.toLocaleString("en-US")}
                        </b>
                      )}{" "}
                      {d.originalPrice !== undefined && d.originalPrice > 0 && (
                        <s className="text-faint text-xs">
                          ${d.originalPrice.toLocaleString("en-US")}
                        </s>
                      )}
                    </span>
                  </a>
                ))}
              </div>
              <p className="text-xs text-muted">
                Deals are claimed on our sister site LowCoDeals.com.
              </p>
            </Card>
          )}

          {b.offer && (
            <Card className="p-6.5 grid gap-2 border-l-[3px] border-l-cta">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                Current offer
              </span>
              <h3 className="text-[16.5px] font-semibold">{b.offer.title}</h3>
              {b.offer.description && (
                <p className="text-sm text-body">{b.offer.description}</p>
              )}
              <p className="text-xs text-muted">
                Mention Lowcountry Business Spotlight when you call.
              </p>
            </Card>
          )}

          {b.hours && (
            <Card className="p-6.5 grid gap-3">
              <h2 className="text-[17px] font-semibold tracking-tight">
                Hours
              </h2>
              <dl className="grid gap-1.5 text-sm max-w-[320px]">
                {b.hours.map((h) => (
                  <div key={h.day} className="flex justify-between gap-6">
                    <dt className="text-muted">{h.day}</dt>
                    <dd className="font-medium num">{h.text}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {(b.address || b.locationArea) && (
            <Card className="p-6.5 grid gap-3">
              <h2 className="text-[17px] font-semibold tracking-tight">
                Location
              </h2>
              {/* The area and the street address are stated once, in the
                  contact rows at the top. Repeating them here read as
                  padding. */}
              {b.lat && b.lng && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand-deep hover:underline"
                >
                  Open in Google Maps
                </a>
              )}
              <p className="text-[13px] text-muted">
                Looking for more {b.category.toLowerCase()} businesses nearby?
                Browse the{" "}
                <Link
                  href={`/directory/location/${b.locationSlug}`}
                  className="text-brand-deep font-medium hover:underline"
                >
                  {b.locationArea} directory
                </Link>
                .
              </p>
            </Card>
          )}

          <Card className="p-6.5 grid gap-4">
            <h2 className="text-[17px] font-semibold tracking-tight">
              Contact {b.name}
            </h2>
            <InquiryForm businessSlug={b.slug} />
          </Card>

          {related.length > 0 && (
            <Card className="p-6.5 grid gap-3.5">
              <h2 className="text-[17px] font-semibold tracking-tight">
                More {b.category} businesses
              </h2>
              <ul className="grid sm:grid-cols-2 gap-2.5">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/business/${r.slug}`}
                      className="block border border-line rounded-[10px] px-4 py-3 hover:border-faint transition-colors"
                    >
                      <b className="block text-[14px] font-semibold">
                        {r.name}
                      </b>
                      <span className="text-[12.5px] text-muted">
                        {r.locationArea}, SC
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/directory/category/${b.categorySlug}`}
                className="text-sm font-semibold text-brand-deep hover:underline"
              >
                See all {b.category} businesses
              </Link>
            </Card>
          )}

          {/* Only when nobody owns it. This used to show on every
              listing, including one the reader had just edited, and it
              sent them to a registration form that would refuse them:
              signing up refuses an address that already has an account.
              An owner who is signed out gets pointed at sign-in instead,
              which is the thing that actually helps them. */}
          {!b.claimed && (
            <Card className="p-6.5 grid gap-2.5 bg-surface">
              <h3 className="text-[15px] font-semibold">
                Is this your business?
              </h3>
              <p className="text-[13px] text-body leading-relaxed">
                Claim this listing to update your details, add photos and
                offers, and see how many people view your page.
              </p>
              <Link
                href="/register"
                className="text-sm font-semibold text-brand-deep hover:underline"
              >
                Claim this listing
              </Link>
            </Card>
          )}
        </div>

        {/* The sidebar. Navigation first, because the reason a listing
            page needed one is that it was a dead end, and advertising
            around it. Sticky so the tower is on screen for the whole
            read rather than only its opening paragraph. */}
        <aside className="grid gap-3.5 lg:sticky lg:top-4">
          <AdSlot
            slot="sidebar_tower"
            allowed={showAds}
            categorySlug={b.categorySlug}
            locationSlug={b.locationSlug}
            userAgent={userAgent}
          />

          {categoryCounts.length > 0 && (
            <Card className="p-5 grid gap-3">
              <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
                Find a business by category
              </h2>
              {/* Capped in height and scrolled, so eleven categories do
                  not push the rest of the sidebar off the screen. */}
              <div className="max-h-[260px] overflow-y-auto grid pr-1">
                {categoryCounts.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/directory/category/${c.slug}`}
                    className={`flex items-baseline gap-2 py-2 border-b border-dotted border-line-strong last:border-b-0 text-[13.5px] hover:text-brand-deep transition-colors ${
                      c.slug === b.categorySlug
                        ? "font-semibold text-brand-deep"
                        : "text-body"
                    }`}
                  >
                    {c.name}
                    <span className="ml-auto text-[12px] text-faint num">
                      {c.count}
                    </span>
                  </Link>
                ))}
              </div>
              <Link
                href="/directory"
                className="text-[13px] font-semibold text-brand-deep hover:underline"
              >
                Browse the whole directory
              </Link>
            </Card>
          )}

          <AdSlot
            slot="sidebar_rect"
            allowed={showAds}
            categorySlug={b.categorySlug}
            locationSlug={b.locationSlug}
            userAgent={userAgent}
          />
        </aside>
      </div>

      <div className="mx-auto max-w-[1120px] px-6 pb-10">
        <AdSlot
          slot="footer_leader"
          allowed={showAds}
          categorySlug={b.categorySlug}
          locationSlug={b.locationSlug}
          userAgent={userAgent}
        />
      </div>

      {/* One loader for the page, not one per slot. */}
      <AdsenseLoader enabled={showAds && adsense.enabled} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}
