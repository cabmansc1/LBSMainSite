import type { Metadata } from "next";
import Link from "next/link";
import { Card, CtaBand } from "@/components/sections";
import { getLowCoDeals } from "@/lib/lowco-deals";
import { getBusinesses } from "@/lib/directory";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local Deals: Current Offers from Lowcountry Businesses",
  description:
    "Live deals and special offers from Charleston-area businesses, from LowCoDeals and Lowcountry Business Spotlight directory members.",
  alternates: { canonical: `${SITE_URL}/deals` },
  openGraph: {
    title: `Local Deals | ${SITE_NAME}`,
    description: "Current offers from Lowcountry businesses.",
    siteName: SITE_NAME,
    type: "website",
  },
};

const money = (n?: number) =>
  n === undefined || isNaN(n) ? undefined : `$${n.toLocaleString("en-US")}`;

export default async function DealsPage() {
  const [deals, businesses] = await Promise.all([
    getLowCoDeals(),
    getBusinesses(),
  ]);
  const listingOffers = businesses.filter((b) => b.offer);

  const offerJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: deals.slice(0, 25).map((d, i) => ({
      "@type": "Offer",
      position: i + 1,
      name: d.title,
      url: d.url,
      price: d.dealPrice,
      priceCurrency: d.dealPrice !== undefined ? "USD" : undefined,
      offeredBy: { "@type": "LocalBusiness", name: d.businessName },
    })),
  };

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Local deals
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[24ch] text-balance">
            Real offers from Lowcountry businesses.
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[56ch]">
            Live deals from our sister site LowCoDeals, plus current offers
            from directory members. New deals added all the time.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        {deals.length > 0 && (
          <section className="mb-14">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
              On LowCoDeals.com
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {deals.map((d) => (
                <a key={d.id} href={d.url} target="_blank" rel="noopener">
                  <Card className="overflow-hidden hover:border-faint transition-colors h-full grid content-start">
                    {d.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.imageUrl}
                        alt=""
                        loading="lazy"
                        className="w-full aspect-[16/9] object-cover"
                      />
                    )}
                    <div className="p-5 grid gap-1.5">
                      <h3 className="text-[15.5px] font-semibold tracking-tight leading-snug">
                        {d.title}
                      </h3>
                      <p className="text-[12.5px] text-muted">{d.businessName}</p>
                      {(d.dealPrice !== undefined || d.originalPrice !== undefined) && (
                        <p className="text-[14px] num">
                          {money(d.dealPrice) && (
                            <b className="font-bold text-ok">{money(d.dealPrice)}</b>
                          )}{" "}
                          {money(d.originalPrice) && (
                            <s className="text-faint text-[12.5px]">
                              {money(d.originalPrice)}
                            </s>
                          )}
                        </p>
                      )}
                      <span className="text-[12.5px] font-semibold text-brand-deep mt-1">
                        Claim on LowCoDeals →
                      </span>
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </section>
        )}

        {listingOffers.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
              Directory member offers
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listingOffers.map((b) => (
                <Link key={b.id} href={`/business/${b.slug}`}>
                  <Card className="p-5 grid gap-1.5 hover:border-faint transition-colors h-full content-start">
                    <h3 className="text-[15.5px] font-semibold tracking-tight">
                      {b.offer!.title}
                    </h3>
                    <p className="text-[12.5px] text-muted">
                      {b.name} · {b.locationArea}
                    </p>
                    <span className="text-[12.5px] font-semibold text-brand-deep mt-1">
                      View listing →
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-14">
          <CtaBand
            title="Want your deal in front of 5,000 mailboxes too?"
            sub="Pair a LowCoDeals offer with a Spotlight Postcard and own your category."
            ctaLabel="See Postcard Pricing"
            ctaHref="/pricing"
          />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }}
      />
    </>
  );
}
