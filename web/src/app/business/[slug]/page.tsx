import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/sections";
import { InquiryForm } from "@/components/inquiry-form";
import { getBusiness } from "@/lib/directory";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBusiness(slug);
  if (!b) return {};
  return {
    title: `${b.name}: ${b.category} in ${b.locationArea}, SC`,
    description: b.description.slice(0, 155),
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: b.name,
    description: b.description,
    url: `${SITE_URL}/business/${b.slug}`,
    telephone: b.phone,
    address: b.address
      ? { "@type": "PostalAddress", streetAddress: b.address, addressRegion: "SC" }
      : undefined,
  };

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
          <div className="mt-5 flex items-start gap-4 flex-wrap">
            {b.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.logoUrl}
                alt={`${b.name} logo`}
                className="w-16 h-16 rounded-xl bg-white object-contain p-1"
              />
            ) : (
              <span className="w-14 h-14 rounded-xl bg-brand text-navy-950 font-bold text-xl flex items-center justify-center">
                {b.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")}
              </span>
            )}
            <div>
              <h1 className="text-[26px] md:text-[36px] font-bold tracking-[-0.03em] leading-tight">
                {b.name}
              </h1>
              <p className="text-[#93A5B8] text-[14.5px] mt-1">
                {b.category} · {b.locationArea}, SC
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
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-10 grid lg:grid-cols-[1.25fr_.75fr] gap-5 items-start">
        <div className="grid gap-3.5">
          <Card className="p-6.5 grid gap-3">
            <h2 className="text-[17px] font-semibold tracking-tight">About</h2>
            <p className="text-sm text-body leading-relaxed">{b.description}</p>
          </Card>

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

          <Card className="p-6.5 grid gap-4">
            <h2 className="text-[17px] font-semibold tracking-tight">
              Contact {b.name}
            </h2>
            <InquiryForm businessSlug={b.slug} />
          </Card>
        </div>

        <aside className="grid gap-3.5">
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
          </Card>

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
        </aside>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
