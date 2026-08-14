import type { Metadata } from "next";
import { MailingFilter } from "@/components/mailing-filter";
import { CtaBand } from "@/components/sections";
import { getMcCategories, getUpcomingMailings } from "@/lib/mission-control";
import { getCardDescriptions } from "@/lib/card-details";
import { CONTACT_PHONE, CONTACT_PHONE_TEL, SITE_NAME, SITE_URL } from "@/lib/seo";

// Reads Mission Control and the database for the live mailing schedule,
// so it cannot be prerendered: the build container can reach
// neither, and waiting on them is what failed the deploy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mailing Calendar: Upcoming Postcard Dates",
  description:
    "Every upcoming Spotlight Postcard mailing across the Charleston Lowcountry: dates, artwork deadlines, and spots remaining by neighborhood.",
  alternates: { canonical: `${SITE_URL}/mailing-calendar` },
  openGraph: {
    title: `Mailing Calendar | ${SITE_NAME}`,
    description: "Upcoming postcard mailings, deadlines, and availability.",
    siteName: SITE_NAME,
    type: "website",
  },
};

export default async function MailingCalendarPage() {
  const [mailings, descriptions, categoryOptions] = await Promise.all([
    getUpcomingMailings(),
    getCardDescriptions(),
    // Never fatal: the category search falls back to the common trades
    // when Mission Control has no vocabulary to give.
    getMcCategories().catch(() => [] as string[]),
  ]);
  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Mailing calendar
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[24ch] text-balance">
            Every upcoming card, every deadline.
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[56ch]">
            Reserve before the artwork deadline and your ad rides the next card.
            Spots close when a card fills or its category sells.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        {mailings.length === 0 ? (
          <div className="border border-line rounded-(--radius-card) bg-white p-8 text-center">
            <h2 className="text-[17px] font-semibold tracking-tight">
              The next round of cards is being scheduled
            </h2>
            <p className="text-sm text-body mt-2 max-w-[46ch] mx-auto leading-relaxed">
              Dates for upcoming neighborhood cards are not posted yet. Call us
              and we will tell you which zones still have room.
            </p>
            <a
              href={`tel:${CONTACT_PHONE_TEL}`}
              className="inline-block mt-4 text-sm font-semibold text-brand-deep hover:underline"
            >
              {CONTACT_PHONE}
            </a>
          </div>
        ) : (
        <MailingFilter
            mailings={mailings}
            descriptions={descriptions}
            categoryOptions={categoryOptions}
          />
        )}
        {mailings.length > 0 && (
          <p className="text-[12.5px] text-muted mt-3">
            {process.env.MC_BASE_URL
              ? "Live schedule, synced from our production system."
              : "Illustrative schedule until the live sync connects."}
          </p>
        )}

        <div className="mt-14">
          <CtaBand
            title="Want a reminder before your neighborhood's deadline?"
            sub="Join the list and we will email you when your zone opens."
            ctaLabel="Get Deadline Alerts"
            ctaHref="/contact"
          />
        </div>
      </div>
    </>
  );
}
