import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPortalContext } from "@/lib/portal";
import { Card } from "@/components/sections";
import {
  VIEW_WINDOWS,
  parseViewWindow,
  viewWindowLabel,
} from "@/lib/view-windows";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Results",
  robots: { index: false, follow: false },
};

/**
 * Honest results: what we can actually count today is cards mailed,
 * homes reached, and inquiries. Scan tracking is reported per QR page,
 * so it is named as coming rather than faked.
 */
export default async function AccountResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // In the URL so a refresh keeps the window, matching the admin
  // screen. Validated against the list of choices, since ?days= is
  // something anybody can type.
  const windowDays = parseViewWindow((await searchParams).days);
  const session = await getSession();
  if (!session) redirect("/login");
  const { pastCards, currentCards, inquiries, listings } =
    await getPortalContext(session);

  const homesReached = pastCards.reduce((sum, c) => {
    const n = Number(String(c.households).replace(/[^0-9]/g, ""));
    return sum + (isFinite(n) ? n : 0);
  }, 0);

  // Their own listing's views, counted here rather than taken from the
  // legacy column, which stopped meaning anything when traffic moved and
  // is not a number to put in front of the person it describes.
  const { viewsFor } = await import("@/lib/listing-views");
  const views = await viewsFor(listings.map((l) => l.id), windowDays);
  const viewsTotal = [...views.values()].reduce((n, v) => n + v, 0);

  const stats = [
    { label: "Cards mailed", value: String(pastCards.length) },
    {
      label: "Homes reached",
      value: homesReached ? homesReached.toLocaleString("en-US") : "0",
    },
    ...(listings.length > 0
      ? [
          {
            label: `Listing views (${viewWindowLabel(windowDays).toLowerCase()})`,
            value: viewsTotal.toLocaleString("en-US"),
          },
        ]
      : []),
    { label: "Inquiries", value: String(inquiries.length) },
    { label: "Running now", value: String(currentCards.length) },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.025em]">Results</h1>
        <p className="text-sm text-muted mt-1">
          What your cards and listing have produced.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-[10.5px] font-bold uppercase tracking-widest text-muted">
              {s.label}
            </div>
            <div className="text-[24px] font-bold tracking-tight num mt-1.5">
              {s.value}
            </div>
          </Card>
        ))}
      </div>

      {/* Under the row rather than inside the views tile: five windows
          will not fit across a quarter-width card without wrapping into
          a mess, and putting them here keeps every tile the same shape.
          The label says which figure they move, since they sit below
          four numbers and only change one of them. */}
      {listings.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-muted">Listing views over</span>
          {VIEW_WINDOWS.map((d) => (
            <Link
              key={d}
              href={`/account/results?days=${d}`}
              scroll={false}
              aria-current={d === windowDays ? "true" : undefined}
              className={`text-[12px] rounded-full border px-2.5 py-1 transition-colors ${
                d === windowDays
                  ? "bg-navy-950 border-navy-950 text-white font-semibold"
                  : "border-line bg-white text-body hover:border-navy-950"
              }`}
            >
              {viewWindowLabel(d)}
            </Link>
          ))}
          {/* Said plainly, because it is the difference between this
              number and the one an advertiser expects. Somebody who
              refreshes their own listing all afternoon should not
              believe they were found forty times. */}
          <span className="text-[12px] text-muted basis-full">
            Counted once per visitor per day, and only since the new site
            started counting.
          </span>
        </div>
      )}

      {pastCards.length > 0 && (
        <>
          <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mt-8 mb-3">
            By card
          </h2>
          <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
            <table className="w-full border-collapse text-[13.5px] min-w-[520px]">
              <thead>
                <tr>
                  {["Card", "Mailed", "Homes", "Ad size"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pastCards.map((c) => (
                  <tr key={c.cardId} className="hover:bg-surface">
                    <td className="px-4 py-3.5 border-b border-line font-semibold">
                      {c.zoneName}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line">
                      {c.mailMonth}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line num">
                      {c.households ?? <span className="text-faint">TBD</span>}
                    </td>
                    <td className="px-4 py-3.5 border-b border-line text-muted">
                      {c.adSize}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Card className="p-5 mt-6 grid gap-1.5 bg-surface">
        <h2 className="text-[14.5px] font-semibold">QR scan tracking</h2>
        <p className="text-[13px] text-body leading-relaxed">
          Scans are counted per QR code. Once your card carries a Spotlight QR
          code, scan counts appear here by month and by card.
        </p>
        <Link
          href="/contact"
          className="text-[13px] font-semibold text-brand-deep hover:underline"
        >
          Ask about a QR code for your next card
        </Link>
      </Card>
    </>
  );
}
