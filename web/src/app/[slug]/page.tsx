import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, SectionHeading, TestimonialStrip, FillMeter } from "@/components/sections";
import { hasTestimonials } from "@/lib/testimonials";
import { ZoneMiniMap } from "@/components/zone-mini-map";
import { zoneBySlug } from "@/lib/zones";
import {
  getLiveMailingAreaFor,
  getLiveZone,
  getLiveZones,
  zoneNumbersFor,
} from "@/lib/zone-store";
import { getZoneMailing } from "@/lib/mission-control";
import { formatPrice } from "@/lib/pricing";
import { getLivePricing } from "@/lib/pricing-store";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { fillZoneNumbers, zoneContent } from "@/lib/zone-content";
import { getPastCards } from "@/lib/past-cards";
import {
  TENTATIVE_MAIL_LABEL,
  hasMailDate,
  mailMonthLabel,
} from "@/lib/mailings";

/**
 * Zone landing pages at their EXACT legacy URLs:
 * /summerville-direct-mail-marketing, /mount-pleasant-direct-mail-marketing, etc.
 * A top-level dynamic segment keeps the URL shape without a /areas prefix.
 */
const SUFFIX = "-direct-mail-marketing";

const parseZone = (slug: string) =>
  slug.endsWith(SUFFIX) ? zoneBySlug(slug.slice(0, -SUFFIX.length)) : undefined;

/**
 * Rendered per request rather than prerendered.
 *
 * These pages carry live spot counts, live pricing and the archive of
 * cards mailed in the zone, so a build-time snapshot was already going
 * stale within the minute. Worse, it made the build depend on Mission
 * Control and the database being reachable from inside the Docker build,
 * which they are not: eleven pages each waited out the 60 second render
 * limit and the deploy failed.
 *
 * Unknown top-level paths (favicon probes, bots) still fall through to
 * parseZone() -> notFound() as clean 404s.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stub = parseZone(slug);
  if (!stub) return {};
  // Live, so a count corrected in the admin reaches the search snippet
  // and not only the page body.
  const zone = (await getLiveZone(stub.slug)) ?? stub;
  const area = await getLiveMailingAreaFor(zone.slug);
  // The legacy title and description are the ones with search history
  // behind them, so they carry over rather than being reinvented.
  const content = zoneContent(zone.slug, zoneNumbersFor(zone, area));
  const title = content?.title ?? `Direct Mail Marketing in ${zone.name}, SC`;
  const description =
    content?.description ??
    // reachArea, not the zone name, for a zone that never mails alone:
    // quoting a two-island figure beside one island's name is the thing
    // this is here to avoid.
    `Reach ${zone.households5k} ${zone.reachArea ?? zone.name} households with a shared 9x12 Spotlight Postcard. One exclusive spot per industry, free ad design, from $249 per mailing.`;
  return {
    // Absolute: the legacy title already ends in the brand, and the
    // layout template would push it past what a result page shows.
    title: { absolute: title },
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
  const stub = parseZone(slug);
  if (!stub) notFound();

  // Everything the admin can correct, read at request time. Falling
  // back to the code zone means a settings outage costs a number, not
  // the page.
  const [liveZones, area] = await Promise.all([
    getLiveZones(),
    getLiveMailingAreaFor(stub.slug),
  ]);
  const zone = liveZones.find((z) => z.slug === stub.slug) ?? stub;
  const numbers = zoneNumbersFor(zone, area);

  const mailing = await getZoneMailing(zone.slug);
  // Cards already mailed here: the proof that this zone is a real route
  // and not a map we drew, and a link into the directory listings.
  const mailed = await getPastCards({
    publishedOnly: true,
    zoneSlug: zone.slug,
  }).catch(() => []);
  const livePricing = await getLivePricing();
  const fromPrice = formatPrice(livePricing["5k"].small.priceCents);
  const nearby = liveZones.filter((z) => z.slug !== zone.slug).slice(0, 4);
  const content = zoneContent(zone.slug, numbers);

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Direct Mail Marketing in ${zone.name}, SC`,
    provider: { "@type": "LocalBusiness", name: SITE_NAME, url: SITE_URL },
    areaServed: { "@type": "City", name: zone.name },
    description: `Shared 9x12 postcard advertising mailed to ${zone.households5k} households in ${zone.reachArea ?? zone.name}, South Carolina.`,
  };

  const faqJsonLd = content?.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: content.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

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
            Reach {zone.reachArea ?? zone.name} households with a shared 9×12
            Spotlight Postcard. One exclusive spot per industry, from{" "}
            {fromPrice} per mailing.
          </p>
          <div className="mt-6">
            <Button href={`/postcards/${zone.slug}/checkout`}>
              Reserve a {zone.name} Spot
            </Button>
          </div>
          <div className="mt-6.5 flex flex-wrap gap-3">
            {[
              {
                value: zone.households5k,
                label: zone.reachArea ? "Households / mailing, both islands" : "Households / mailing",
              },
              { value: zone.zipCodes.join(" · "), label: "ZIP codes covered" },
              {
                // A planned card with no date yet says so, rather than
                // printing Mission Control's literal "TBD".
                value: hasMailDate(mailing?.mailMonth)
                  ? (mailing?.mailMonth as string)
                  : "Coming soon",
                label: TENTATIVE_MAIL_LABEL,
              },
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
          {/* Spelled out under the figure, because a number covering two
              islands sitting on one island's page is exactly the claim
              that needs its working shown. */}
          {zone.reachNote && (
            <p className="mt-3.5 text-[13px] text-[#93A5B8] max-w-[62ch]">
              {fillZoneNumbers(zone.reachNote, numbers)}
            </p>
          )}
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
                  {/* "on the December card" reads as a card that exists.
                      A planned one is an intention, and saying which it
                      is here is cheaper than a phone call later. */}
                  {mailing.status === "planned"
                    ? `on the ${zone.name} card planned for ${mailMonthLabel(mailing.mailMonth)}`
                    : `on the ${mailing.mailMonth} ${zone.name} card`}
                </span>
                <FillMeter taken={mailing.spotsTaken} total={mailing.spotsTotal} />
              </div>
            )}
            {content ? (
              <Card className="p-6.5 grid gap-4">
                <div className="grid gap-2">
                  <h2 className="text-[17px] font-semibold tracking-tight">
                    {content.statsTitle}
                  </h2>
                  <p className="text-sm text-body leading-relaxed">
                    {content.statsIntro}
                  </p>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {content.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-surface border border-line rounded-[10px] px-3.5 py-3"
                    >
                      <dt className="text-[17px] font-bold tracking-tight num">
                        {stat.value}
                      </dt>
                      <dd className="text-[11.5px] text-muted leading-snug mt-0.5">
                        {stat.label}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ) : (
              <Card className="p-6.5 grid gap-2.5">
                <h2 className="text-[17px] font-semibold tracking-tight">
                  Why {zone.name} responds to direct mail
                </h2>
                <p className="text-sm text-body leading-relaxed">
                  New households arrive in {zone.name} every month, all actively
                  looking for their dentist, their HVAC company, their
                  Friday-night pizza. The mailbox is the one channel every new
                  neighbor checks.
                </p>
              </Card>
            )}
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
          </div>

          <Card className="p-6.5 grid gap-4 content-start">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              Where we mail
            </span>
            <ZoneMiniMap highlight={zone.slug} zones={liveZones} />
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

      {mailed.length > 0 && (
        <section className="bg-surface border-t border-line">
          <div className="mx-auto max-w-[1120px] px-6 py-16">
            <SectionHeading
              eyebrow="Proof"
              title={`Cards we have mailed in ${zone.name}`}
              sub="Real printed cards, the neighborhoods they reached, and the businesses that rode them."
            />
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-8">
              {mailed.slice(0, 6).map((c) => {
                const img =
                  c.images.find((i) => i.side === "front") ?? c.images[0];
                return (
                  <li key={c.slug}>
                    <Link
                      href={`/cards/${c.slug}`}
                      className="block bg-white border border-line rounded-(--radius-card) overflow-hidden hover:border-faint transition-colors"
                    >
                      {img && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/api/card-image/${img.id}`}
                          alt={img.alt}
                          className="w-full h-auto"
                          loading="lazy"
                        />
                      )}
                      <span className="block px-4 py-3">
                        <b className="block text-[14.5px] font-semibold">
                          {c.cardName ?? c.zoneName}
                        </b>
                        <span className="text-[12.5px] text-muted">
                          Mailed {c.mailMonth}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-7">
              <Button href="/gallery" variant="quiet" small>
                See every card we have mailed
              </Button>
            </div>
          </div>
        </section>
      )}

      {content?.prose && (
        <section className="border-t border-line">
          <div className="mx-auto max-w-[760px] px-6 py-16 grid gap-5">
            <h2 className="text-[24px] md:text-[30px] font-bold tracking-[-0.03em]">
              {content.prose.title}
            </h2>
            {content.prose.intro.map((p, i) => (
              <p
                key={i}
                className="text-[15.5px] text-body leading-[1.75]"
                dangerouslySetInnerHTML={{ __html: p }}
              />
            ))}
            {content.prose.items.map((item) => (
              <div key={item.title} className="grid gap-3.5 mt-3">
                <h3 className="text-[18px] font-bold tracking-tight">
                  {item.title}
                </h3>
                {item.body.map((p, i) => (
                  <p
                    key={i}
                    className="text-[15.5px] text-body leading-[1.75]"
                    dangerouslySetInnerHTML={{ __html: p }}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {content?.sections.map((section) => (
        <section key={section.title} className="border-t border-line">
          <div className="mx-auto max-w-[1120px] px-6 py-16">
            <SectionHeading
              eyebrow={zone.name}
              title={section.title}
              sub={section.intro[0]}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-8">
              {section.items.map((item) => (
                <Card key={item.title} className="p-6 grid gap-2.5 content-start">
                  <h3 className="text-[15.5px] font-bold tracking-tight">
                    {item.title}
                  </h3>
                  {item.body.map((p, i) => (
                    <p
                      key={i}
                      className="text-[13.5px] text-body leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: p }}
                    />
                  ))}
                </Card>
              ))}
            </div>
          </div>
        </section>
      ))}

      {content?.faqs.length ? (
        <section className="bg-surface border-t border-line">
          <div className="mx-auto max-w-[760px] px-6 py-16">
            <SectionHeading eyebrow="Questions" title={content.faqTitle} />
            <div className="mt-8 bg-white border border-line rounded-(--radius-card) overflow-hidden">
              {content.faqs.map((f) => (
                <details
                  key={f.q}
                  className="border-b border-line last:border-b-0 group"
                >
                  <summary className="cursor-pointer list-none px-6 py-4.5 flex items-center justify-between gap-4 text-[15px] font-semibold">
                    {f.q}
                    <span className="text-muted text-lg leading-none group-open:hidden">
                      +
                    </span>
                    <span className="text-muted text-lg leading-none hidden group-open:inline">
                      &minus;
                    </span>
                  </summary>
                  <p className="px-6 pb-5 text-[14.5px] text-body leading-relaxed">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

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
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
    </>
  );
}
