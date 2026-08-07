import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import {
  getWaitlistEntries,
  countLegacyWaitlistRows,
} from "@/lib/waitlist";
import { ZONES } from "@/lib/zones";
import { emailEnabled } from "@/lib/email";
import { AdminWaitlist } from "@/components/admin-waitlist";
import { sweepWaitlistIfDue } from "@/lib/waitlist-sweep";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Waitlist",
  robots: { index: false, follow: false },
};

export default async function AdminWaitlistPage() {
  await requireAdmin();

  // Belt and braces for the scheduler. If the cron is not wired up yet,
  // or has been quiet, opening this page catches anything that has come
  // free. Throttled, so refreshing does not ask Mission Control about
  // every zone each time, and awaited so the list below reflects it
  // rather than showing state that changed a moment ago.
  await sweepWaitlistIfDue().catch(() => {});

  const [entries, legacy] = await Promise.all([
    getWaitlistEntries(),
    countLegacyWaitlistRows(),
  ]);

  const zoneNames = Object.fromEntries(ZONES.map((z) => [z.slug, z.name]));

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Waitlist</h1>
        <p className="text-sm text-muted mt-1 max-w-[74ch]">
          Businesses whose category was already taken on the card that was
          filling, plus anyone who asked about the 2,500 household card. Each
          one was promised a message when something opens. Send notice writes
          that message and marks the row, and it only marks the addresses the
          mail actually reached.
        </p>
      </div>

      {legacy > 0 && (
        <p className="mb-5 border border-[#f3c9c4] bg-[#fdf3f2] rounded-(--radius-card) px-5 py-3.5 text-[13px] text-body">
          The abandoned <code>waitlist_entries</code> table holds {legacy}{" "}
          {legacy === 1 ? "row" : "rows"} that are not shown here. Those
          predate this page and were expected to be zero. Worth moving across.
        </p>
      )}

      <AdminWaitlist
        entries={entries}
        zoneNames={zoneNames}
        emailConfigured={emailEnabled()}
      />
    </div>
  );
}
