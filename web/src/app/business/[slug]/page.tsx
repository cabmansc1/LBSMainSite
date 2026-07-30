import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/sections";
import { InquiryForm } from "@/components/inquiry-form";
import { getPastCards } from "@/lib/past-cards";
import { getBusinesses, getBusiness } from "@/lib/directory";
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
  if (!b) return {};
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
  const b = await getBusiness(slug);
  if (!b) notFound();

  // Cross-site and Mission Control lookups are best-effort extras; the
  // page renders fine when either source is unreachable.
  const [related, lowcoDeals, archive, appearances] = await Promise.all([
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
      : { "@type": "PostalAddress", addressLocality: b.locationArea, addressRegion: "SC" },
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
      { "@type": "ListItem", position: 1, name: "Directory", item: `${SITE_URL}/directory` },
      { "@type": "ListItem", position: 2, name: b.category, item: `${SITE_URL}/directory/category/${b.categorySlug}` },
      { "@type": "ListItem", position: 3, name: b.name, item: `${SITE_URL}/business/${b.slug}` },
    ],
  };

  const SOCIALS: { key: string; href?: string; label: string; icon: React.ReactNode }[] = [
    {
      key: "facebook",
      href: b.socials?.facebook,
      label: "Facebook",
      icon: <path d="M14 8h2V5h-2.5A3.5 3.5 0 0 0 10 8.5V11H8v3h2v7h3v-7h2.3l.7-3H13V9a1 1 0 0 1 1-1z" />,
    },
    {
      key: "instagram",
      href: b.socials?.instagram,
      label: "Instagram",
      icon: (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="17.2" cy="6.8" r="1.3" />
        </>
      ),
    },
    {
      key: "tiktok",
      href: b.socials?.tiktok,
      label: "TikTok",
      icon: <path d="M15 4a5 5 0 0 0 5 4v3a8 8 0 0 1-5-1.7V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V4h3z" />,
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
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-11 pb-13">
          <nav className="text-[12.5px] text-[#67768A] flex gap-2" aria-label="Breadcrumb">
            <Link href="/directory" className="hover:text-white">Directory</Link>
            <span>/</span>
            <Link href={`/directory/category/${b.categorySlug}`} className="hover:text-white">
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
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.9 6.3 6.6.6-5 4.5 1.5 6.6L12 16.9 6 20l1.5-6.6-5-4.5 6.6-.6z" />
                    </svg>
                    Featured
                  </span>
                )}
                {b.isVerified && (
                  <span className="inline-flex items-center gap-1 ml-3 text-xs font-semibold text-white bg-white/8 border border-white/16 rounded-full px-2.5 py-0.5">
                    <svg className="text-brand" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Verified
                  </span>
                )}
              </p>
            </div>
            {b.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.logoUrl}
                alt={`${b.name} logo`}
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

      <div className="mx-auto max-w-[1120px] px-6 py-10 grid lg:grid-cols-[1.25fr_.75fr] gap-5 items-start">
        <div className="grid gap-3.5">
          <Card className="p-6.5 grid gap-3">
            <h2 className="text-[17px] font-semibold tracking-tight">About</h2>
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
          </Card>

          {appearances.length > 0 && (
            <Card className="p-6.5 grid gap-3 bg-brand-tint border-brand/25">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-brand-deep">
                  As seen in mailboxes
                </span>
                <p className="text-sm text-body leading-relaxed mt-1">
                  {b.name} has appeared on {appearances.length}{" "}
                  {appearances.length === 1 ? "Spotlight card" : "Spotlight cards"}{" "}
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
                      (c.zoneName === a.zoneName && c.mailMonth === a.mailMonth),
                  );
                  // Two cards can share a zone and a month. Tell them
                  // apart by mail date rather than card name: Mission
                  // Control names cards for the campaign, so one mailing
                  // on April 30 is called "May 2026" and printing that
                  // beside "April 2026" reads like a mistake.
                  const sameMonth = appearances.filter(
                    (x) => x.zoneName === a.zoneName && x.mailMonth === a.mailMonth,
                  );
                  const exactDate =
                    a.mailDateIso &&
                    new Date(a.mailDateIso).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/lowcodeals.png"
                  alt="LowCoDeals"
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

          {b.photos && b.photos.length > 1 && (
            <Card className="p-6.5 grid gap-3">
              <h2 className="text-[17px] font-semibold tracking-tight">Photos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {b.photos.slice(0, 9).map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.url}
                    src={p.url}
                    alt={p.alt}
                    loading="lazy"
                    className="w-full aspect-square object-cover rounded-[10px] border border-line bg-surface"
                  />
                ))}
              </div>
            </Card>
          )}

          {b.hours && (
            <Card className="p-6.5 grid gap-3">
              <h2 className="text-[17px] font-semibold tracking-tight">Hours</h2>
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
              <h2 className="text-[17px] font-semibold tracking-tight">Location</h2>
              <p className="text-sm text-body leading-relaxed">
                {b.name} serves {b.locationArea} and the surrounding Lowcountry.
                {b.address ? ` You can find them at ${b.address}.` : ""}
              </p>
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
                      <b className="block text-[14px] font-semibold">{r.name}</b>
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

          <Card className="p-6.5 grid gap-2.5 bg-surface">
            <h3 className="text-[15px] font-semibold">Is this your business?</h3>
            <p className="text-[13px] text-body leading-relaxed">
              Claim this listing to update your details, add photos and offers,
              and see how many people view your page.
            </p>
            <Link
              href="/register"
              className="text-sm font-semibold text-brand-deep hover:underline"
            >
              Claim this listing
            </Link>
          </Card>
        </div>

        <aside className="grid gap-3.5 order-first lg:order-none">
          <Card className="p-6.5 grid gap-3.5 content-start">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              Details
            </span>
            {b.phone && (
              <a href={`tel:${b.phone.replace(/\D/g, "")}`} className="text-[15px] font-semibold text-brand-deep hover:underline">
                {b.phone}
              </a>
            )}
            {b.website && (
              <a href={b.website} rel="nofollow noopener" target="_blank" className="text-sm text-brand-deep hover:underline break-all">
                Visit website
              </a>
            )}
            {b.address && <p className="text-sm text-body">{b.address}</p>}
            {b.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`}
                target="_blank"
                rel="noopener"
                className="text-sm font-semibold text-brand-deep hover:underline"
              >
                Open in Google Maps
              </a>
            )}
            {b.socials && (
              <div className="flex gap-2.5 pt-1">
                {SOCIALS.filter((s) => s.href).map((s) => (
                  <a
                    key={s.key}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className="w-10 h-10 rounded-[10px] bg-surface border border-line flex items-center justify-center text-brand-deep hover:bg-brand hover:text-white hover:border-brand transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      {s.icon}
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>

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
