import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CtaBand } from "@/components/sections";
import { SUB_AREAS, subAreaBySlug } from "@/lib/sub-areas";
import { CORE_SIZES, FLAGSHIP_REACH, formatPrice, isOffered } from "@/lib/pricing";
import { getLivePricing } from "@/lib/pricing-store";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SUB_AREAS.map((a) => ({ area: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  const a = subAreaBySlug(area);
  if (!a) return { title: "Not found" };

  const title = `${a.name} Direct Mail Advertising`;
  const description = `Reach ${a.name} homes with shared 9x12 postcard advertising on the ${a.cardName} card — ${a.zipCodes.join(" and ")}, one business per category, from $249 a mailing.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/direct-mail-marketing/${a.slug}` },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/direct-mail-marketing/${a.slug}`,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}

/**
 * A neighbourhood inside a zone.
 *
 * The honest part of this page is the "which card" section. Somebody
 * arriving from a search for their own neighbourhood needs to know they
 * are buying a spot on the wider card before they enquire, not after.
 */
export default async function SubAreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const a = subAreaBySlug(area);
  if (!a) notFound();

  const pricing = await getLivePricing();
  const rates = pricing[FLAGSHIP_REACH];
  const sizes = CORE_SIZES.filter((s) => isOffered(rates[s]));

  const url = `${SITE_URL}/direct-mail-marketing/${a.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: `Direct mail advertising in ${a.name}`,
        serviceType: "Direct mail advertising",
        provider: { "@type": "LocalBusiness", name: SITE_NAME, url: SITE_URL },
        areaServed: {
          "@type": "Place",
          name: a.name,
          address: {
            "@type": "PostalAddress",
            addressLocality: a.parentZoneName,
            addressRegion: "SC",
            addressCountry: "US",
            postalCode: a.zipCodes.join(", "),
          },
        },
        url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Direct Mail Marketing",
            item: `${SITE_URL}/direct-mail-marketing`,
          },
          { "@type": "ListItem", position: 3, name: a.name, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-12 pb-12">
          <nav className="text-[12.5px] text-[#67768A]" aria-label="Breadcrumb">
            <Link href="/direct-mail-marketing" className="hover:text-white">
              Direct mail
            </Link>
            <span className="mx-1.5">/</span>
            <span>{a.name}</span>
          </nav>
          <h1 className="mt-4 text-[28px] md:text-[42px] font-bold tracking-[-0.032em] max-w-[20ch] text-balance">
            {a.name} direct mail advertising
          </h1>
          <p className="mt-4 text-[#93A5B8] max-w-[58ch] text-[16.5px] leading-relaxed">
            {a.standfirst}
          </p>
          <p className="mt-4 text-[13px] text-[#67768A] num">
            {a.zipCodes.join(" · ")}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12 grid gap-14">

        <section className="grid gap-4 max-w-[68ch]">
          {a.body.map((p) => (
            <p key={p.slice(0, 40)} className="text-[16px] leading-relaxed text-body">
              {p}
            </p>
          ))}
        </section>

        {/*
          Said plainly and early. A neighbourhood page that lets somebody
          assume a neighbourhood-only mailing has mis-sold the product
          before anyone has spoken to them.
        */}
        <section>
          <Card className="p-7 grid gap-3">
            <h2 className="text-[20px] font-bold tracking-[-0.02em]">
              Which card {a.name} is on
            </h2>
            <p className="text-[15.5px] leading-relaxed text-body max-w-[68ch]">
              {a.name} is reached on the <strong>{a.cardName} card</strong>,
              not a mailing of its own. That card covers{" "}
              {a.parentZoneName} more widely than{" "}
              {a.name} alone, so your ad lands in {a.name} homes and in the
              rest of the {a.parentZoneName} route with them.
            </p>
            <p className="text-[15.5px] leading-relaxed text-body max-w-[68ch]">
              For most businesses that is an advantage — more homes for the
              same spend, and the surrounding area is usually where the rest of
              your customers are anyway. If you need a drop confined to{" "}
              {a.name} and nowhere else, a shared card is the wrong product and
              solo mail is the right one; the{" "}
              <Link
                href="/guides/eddm-cost-charleston"
                className="text-brand-deep font-semibold"
              >
                EDDM guide
              </Link>{" "}
              covers what that costs.
            </p>
            <p className="text-[14px] text-muted">
              Full detail on the wider area is on the{" "}
              <a href={a.parentHref} className="text-brand-deep font-semibold">
                {a.parentZoneName} page
              </a>
              .
            </p>
          </Card>
        </section>

        <section className="grid gap-4">
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">
            What tends to work here
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2.5">
            {a.worksWell.map((w) => (
              <li
                key={w}
                className="text-[14.5px] text-body leading-snug pl-4 relative before:absolute before:left-0 before:top-[0.6em] before:w-1.5 before:h-1.5 before:rounded-full before:bg-brand border border-line rounded-(--radius-card) bg-white p-5 pl-8"
              >
                {w}
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4">
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">
            What a spot costs
          </h2>
          <Card className="p-7">
            <div className="overflow-x-auto">
              <table className="w-full text-[15px] border-collapse min-w-[380px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-widest text-muted">
                    <th className="font-semibold py-2 pr-4">Spot</th>
                    <th className="font-semibold py-2 pr-4">Size</th>
                    <th className="font-semibold py-2">Per mailing</th>
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((s) => (
                    <tr key={s} className="border-t border-line">
                      <td className="py-2.5 pr-4 font-semibold capitalize">{s}</td>
                      <td className="py-2.5 pr-4 text-muted">{rates[s].size}</td>
                      <td className="py-2.5 num font-semibold">
                        {formatPrice(rates[s].priceCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[13.5px] text-muted mt-4">
              Per mailing to 5,000 homes, with design, printing and postage
              included and one business per category. Full rates on the{" "}
              <Link href="/pricing" className="text-brand-deep font-semibold">
                pricing page
              </Link>
              .
            </p>
          </Card>
        </section>

        <CtaBand
          title={`Advertise in ${a.name}`}
          sub={`See when the ${a.cardName} card mails next and which categories are still open.`}
          ctaLabel="View pricing"
          ctaHref="/pricing"
        />
      </div>
    </>
  );
}
