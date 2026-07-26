import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, SectionHeading, TestimonialStrip, FillMeter } from "@/components/sections";
import { hasTestimonials } from "@/lib/testimonials";
import { ZoneMiniMap } from "@/components/zone-mini-map";
import { ZONES, zoneBySlug } from "@/lib/zones";
import { getZoneMailing } from "@/lib/mission-control";
import { POSTCARD_PRICING, formatPrice } from "@/lib/pricing";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Zone landing pages at their EXACT legacy URLs:
 * /summerville-direct-mail-marketing, /mount-pleasant-direct-mail-marketing, etc.
 * A top-level dynamic segment keeps the URL shape without a /areas prefix.
 */
const SUFFIX = "-direct-mail-marketing";

const parseZone = (slug: string) =>
  slug.endsWith(SUFFIX) ? zoneBySlug(slug.slice(0, -SUFFIX.length)) : undefined;

export function generateStaticParams() {
  return ZONES.map((z) => ({ slug: `${z.slug}${SUFFIX}` }));
}

// dynamicParams stays enabled: unknown top-level paths (favicon probes,
// bots) fall through to parseZone() -> notFound() as clean 404s instead
// of throwing internal NoFallbackError noise in server logs.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const zone = parseZone(slug);
  if (!zone) return {};
  const title = `Direct Mail Marketing in ${zone.name}, SC`;
  const description = `Reach ${zone.households5k} ${zone.name} households with a shared 9x12 Spotlight Postcard. One exclusive spot per industry, free ad design, from $249 per mailing.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${slug}` },
    openGraph: { title, description, siteName: SITE_NAME, type: "website" },
  };
}

export default async function ZonePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const zone = parseZone(slug);
  if (!zone) notFound();

  const mailing = await getZoneMailing(zone.slug);
  const fromPrice = formatPrice(POSTCARD_PRICING["5k"].small.priceCents);
  const nearby = ZONES.filter((z) => z.slug !== zone.slug).slice(0, 4);

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Direct Mail Marketing in ${zone.name}, SC`,
    provider: { "@type": "LocalBusiness", name: SITE_NAME, url: SITE_URL },
    areaServed: { "@type": "City", name: zone.name },
    description: `Shared 9x12 postcard advertising mailed to ${zone.households5k} households in ${zone.name}, South Carolina.`,
  };

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-11 pb-15">
          <nav className="text-[12.5px] text-[#67768A] flex gap-2" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/coverage-map" className="hover:text-white">Service Areas</Link>
            <span>/</span>
            <b className="text-white font-semibold">{zone.name}</b>
          </nav>
          <h1 className="mt-4 text-[28px] md:text-[44px] font-bold tracking-[-0.03em] leading-[1.1] max-w-[22ch] text-balance">
            Direct mail marketing in{" "}
            <em className="not-italic text-brand">{zone.name}, SC</em>
          </h1>
          <p className="mt-4 text-[#93A5B8] max-w-[56ch]">
            Reach {zone.name} households with a shared 9×12 Spotlight Postcard.
            One exclusive spot per industry, from {fromPrice} per mailing.
          </p>
          <div className="mt-6">
            <Button href="/pricing">Reserve a {zone.name} Spot</Button>
          </div>
          <div className="mt-6.5 flex flex-wrap gap-3">
            {[
              { value: zone.households5k, label: "Households / mailing" },
              { value: zone.zipCodes.join(" · "), label: "ZIP codes covered" },
              { value: mailing?.mailMonth ?? "Coming soon", label: "Next mailing" },
            ].map((chip) => (
              <div
                key={chip.label}
                className="bg-white/4 border border-white/12 rounded-[10px] px-4.5 py-3"
              >
                <b className="block text-base font-bold num">{chip.value}</b>
                <span className="text-[11px] text-[#67768A] uppercase tracking-wider font-semibold">
                  {chip.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5 items-start">
          <div className="grid gap-3.5">
            {mailing && mailing.status !== "waitlist" && (
              <div className="bg-white border border-line-strong border-l-[3px] border-l-cta rounded-[10px] px-4.5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm">
                  <b className="font-semibold">
                    {mailing.spotsTotal - mailing.spotsTaken} of {mailing.spotsTotal} spots remaining
                  </b>{" "}
                  on the {mailing.mailMonth} {zone.name} card
                </span>
                <FillMeter taken={mailing.spotsTaken} total={mailing.spotsTotal} />
              </div>
            )}
            <Card className="p-6.5 grid gap-2.5">
              <h2 className="text-[17px] font-semibold tracking-tight">
                Why {zone.name} responds to direct mail
              </h2>
              <p className="text-sm text-body leading-relaxed">
                New households arrive in {zone.name} every month, all actively
                looking for their dentist, their HVAC company, their Friday-night
                pizza. The mailbox is the one channel every new neighbor checks.
              </p>
            </Card>
            <Card className="p-6.5 grid gap-2.5">
              <h2 className="text-[17px] font-semibold tracking-tight">
                Complete coverage, verified routes
              </h2>
              <p className="text-sm text-body leading-relaxed">
                We mail full USPS carrier routes across{" "}
                {zone.zipCodes.join(", ")}. Real deliveries to real doorsteps,
                not impressions on a screen.
              </p>
            </Card>
            <Card className="p-6.5 grid gap-2.5">
              <h2 className="text-[17px] font-semibold tracking-tight">
                Multi-zone bundles
              </h2>
              <p className="text-sm text-body leading-relaxed">
                Pair {zone.name} with a neighboring zone and save on both cards.
                Ask about multi-card commitments.
              </p>
            </Card>
          </div>

          <Card className="p-6.5 grid gap-4 content-start">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              Where we mail
            </span>
            <ZoneMiniMap highlight={zone.slug} />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              Explore nearby zones
            </span>
            <ul className="grid gap-2.5">
              {nearby.map((z) => (
                <li key={z.slug}>
                  <Link
                    href={`/${z.slug}${SUFFIX}`}
                    className="flex items-center justify-between text-sm font-medium text-body hover:text-brand-deep border-b border-line pb-2.5"
                  >
                    {z.name}
                    <span className="text-muted text-xs num">{z.households5k} homes</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Button href="/coverage-map" variant="quiet" small>
              See the full coverage map
            </Button>
          </Card>
        </div>
      </section>

      {hasTestimonials(`zone:${zone.slug}`) && (
      <section className="bg-surface border-y border-line">
        <div className="mx-auto max-w-[1120px] px-6 py-16">
          <SectionHeading
            eyebrow="Advertisers nearby"
            title={`Businesses growing with LBS`}
          />
          <TestimonialStrip placement={`zone:${zone.slug}`} />
          <div className="mt-8">
            <Button href="/pricing">See {zone.name} Pricing</Button>
          </div>
        </div>
      </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
    </>
  );
}
