import type { Metadata } from "next";
import Link from "next/link";
import { StatusChip, FillMeter, CtaBand } from "@/components/sections";
import { getUpcomingMailings } from "@/lib/mission-control";
import { cardCoverage } from "@/lib/card-coverage";
import { zoneBySlug } from "@/lib/zones";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

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

const chipFor = (status: string, left: number) => {
  if (status === "waitlist") return <StatusChip tone="info">Waitlist</StatusChip>;
  if (status === "full") return <StatusChip tone="danger">Full</StatusChip>;
  if (left <= 2) return <StatusChip tone="warn">{left} left</StatusChip>;
  return <StatusChip tone="ok">Open</StatusChip>;
};

export default async function MailingCalendarPage() {
  const mailings = await getUpcomingMailings();
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
              href="tel:+18432122969"
              className="inline-block mt-4 text-sm font-semibold text-brand-deep hover:underline"
            >
              843-212-2969
            </a>
          </div>
        ) : (
        <div className="border border-line rounded-(--radius-card) bg-white overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px] min-w-[720px]">
            <thead>
              <tr>
                {["Neighborhood", "Mails", "Artwork deadline", "Reach", "Availability", "Status", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {mailings.map((m) => {
                const left = m.spotsTotal - m.spotsTaken;
                return (
                  <tr
                    key={m.cardId ?? `${m.zoneSlug}-${m.mailMonth}`}
                    className="hover:bg-surface"
                  >
                    <td className="px-4 py-3.5 border-b border-line font-semibold">
                      {m.zoneName}
                      {cardCoverage(m).name && (
                        <span className="block text-[12.5px] font-medium text-muted">
                          {cardCoverage(m).name}
                        </span>
                      )}
                      {cardCoverage(m).zips.length > 0 && (
                        <span className="block text-[12px] text-muted num">
                          ZIP {cardCoverage(m).zips.join(", ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line">{m.mailMonth}</td>
                    <td className="px-4 py-3.5 border-b border-line">{m.artworkDeadline}</td>
                    <td className="px-4 py-3.5 border-b border-line num">{m.households}</td>
                    <td className="px-4 py-3.5 border-b border-line">
                      <FillMeter taken={m.spotsTaken} total={m.spotsTotal} />
                    </td>
                    <td className="px-4 py-3.5 border-b border-line">
                      {chipFor(m.status, left)}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line">
                      {zoneBySlug(m.zoneSlug) ? (
                        <Link
                          href={`/${m.zoneSlug}-direct-mail-marketing`}
                          className="text-brand-deep font-semibold hover:underline whitespace-nowrap"
                        >
                          {m.status === "waitlist" ? "Join waitlist" : "Reserve"}
                        </Link>
                      ) : (
                        <a
                          href="tel:+18432122969"
                          className="text-brand-deep font-semibold hover:underline whitespace-nowrap"
                        >
                          Call to book
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
