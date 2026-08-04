import type { Metadata } from "next";
import Link from "next/link";
import { Card, SectionHeading, CtaBand } from "@/components/sections";
import { ZONES } from "@/lib/zones";
import { CONTACT_PHONE, CONTACT_PHONE_TEL, SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Successor to the legacy coming-soon-service-areas page (indexed, in the
 * live sitemap). Lists live zones and captures interest for areas we do
 * not mail yet.
 */
export const metadata: Metadata = {
  title: "Service Areas: Live Now and Coming Soon",
  description:
    "Direct mail marketing expanding across the Charleston Lowcountry. See every service area available now and request early access for upcoming zones.",
  alternates: { canonical: `${SITE_URL}/coming-soon-service-areas` },
  openGraph: {
    title: `Service Areas | ${SITE_NAME}`,
    description:
      "Every Lowcountry zone we mail today, plus the areas coming next.",
    siteName: SITE_NAME,
    type: "website",
  },
};

/** Areas we do not mail yet, carried over from the legacy page. */
const REQUESTED_AREAS = [
  "West Ashley",
  "Ladson",
  "Hanahan",
  "Folly Beach",
  "Kiawah and Seabrook",
];

export default function ComingSoonServiceAreasPage() {
  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Service areas
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[22ch] text-balance">
            Expanding across the Lowcountry.
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[58ch]">
            These neighborhoods get a Spotlight Postcard today. If yours is not
            on the list yet, tell us and we will start there when demand builds.
          </p>
          <p className="mt-4">
            <a
              href={`tel:${CONTACT_PHONE_TEL}`}
              className="text-brand font-semibold hover:underline"
            >
              Call {CONTACT_PHONE}
            </a>
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        <SectionHeading
          eyebrow="Available now"
          title="Zones mailing today"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {ZONES.map((z) => (
            <Link key={z.slug} href={`/${z.slug}-direct-mail-marketing`}>
              <Card className="p-6 grid gap-2 content-start h-full hover:border-faint transition-colors">
                <h2 className="text-[16.5px] font-semibold tracking-tight">
                  {z.name}
                </h2>
                <p className="text-[12.5px] text-muted num">
                  {z.households5k} households · ZIP {z.zipCodes.join(", ")}
                </p>
                <span className="text-[13px] font-semibold text-brand-deep mt-1">
                  View {z.name} pricing →
                </span>
              </Card>
            </Link>
          ))}
        </div>

        <section className="mt-14">
          <SectionHeading
            eyebrow="Coming soon"
            title="Areas we are watching"
          />
          <Card className="p-7 grid gap-4">
            <p className="text-sm text-body leading-relaxed max-w-[62ch]">
              We open a new zone when enough local businesses ask for it. These
              are the areas most requested so far. Tell us which one you want
              and you get first pick of your category when it launches.
            </p>
            <div className="flex flex-wrap gap-2">
              {REQUESTED_AREAS.map((a) => (
                <span
                  key={a}
                  className="text-[13px] font-semibold text-body bg-surface border border-line rounded-full px-3.5 py-1.5"
                >
                  {a}
                </span>
              ))}
            </div>
            <p className="text-sm">
              <Link
                href="/contact"
                className="font-semibold text-brand-deep hover:underline"
              >
                Request your area
              </Link>
              <span className="text-muted">
                {" "}
                and we will let you know the moment it opens.
              </span>
            </p>
          </Card>
        </section>

        <div className="mt-14">
          <CtaBand
            title="Your area is already live?"
            sub="Check which categories are still open on the next card in your zone."
            ctaLabel="See Coverage Map"
            ctaHref="/coverage-map"
          />
        </div>
      </div>
    </>
  );
}
