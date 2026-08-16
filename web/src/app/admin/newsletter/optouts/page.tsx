import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AdminOptOuts } from "@/components/admin-optouts";
import { listOptOutEntries } from "@/lib/newsletter-audience";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Off the list",
  robots: { index: false, follow: false },
};

/**
 * Who the advertiser update will not reach.
 *
 * This exists because there is no mailing list to delete a row from.
 * The audience is rebuilt on every send from the Mission Control
 * roster, past customers, the directory and the leads table, so taking
 * somebody out of any one of those does not stop the email — they come
 * straight back the next time the audience is built, and deleting a
 * directory listing to stop a newsletter would throw away a business
 * record to solve a mailing problem.
 *
 * The suppression list is the one thing that does stop it, and until
 * this screen the only way onto it was the recipient pressing
 * unsubscribe themselves. A request made any other way — a reply, a
 * phone call, somebody saying it in person — had nowhere to go.
 */
export default async function AdminOptOutsPage() {
  await requireAdmin();
  const entries = await listOptOutEntries();

  return (
    <div className="mx-auto max-w-[900px] px-6 py-8">
      <Link
        href="/admin/newsletter"
        className="text-[12.5px] font-semibold text-brand-deep hover:underline"
      >
        ← Advertiser update
      </Link>
      <div className="mt-3 mb-6 max-w-[74ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          Off the list
        </h1>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          The advertiser update has no subscriber list to delete from — it is
          built fresh each time from your card roster, the directory and your
          leads. This is the list of people it skips, and it is the only thing
          that keeps somebody off for good.
        </p>
      </div>

      <AdminOptOuts entries={entries} />

      <p className="text-[12.5px] text-muted mt-8 max-w-[74ch] leading-relaxed">
        This covers the advertiser update only. If someone also asked to stop
        hearing about deadlines, remove them from{" "}
        <Link href="/admin/waitlist" className="text-brand-deep font-semibold">
          the waitlist
        </Link>{" "}
        as well, and if their details were pushed to GoHighLevel they have to
        come out there too — this site can add contacts to it but cannot remove
        them.
      </p>
    </div>
  );
}
