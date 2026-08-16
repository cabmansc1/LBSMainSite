import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { listIssues } from "@/lib/advertiser-newsletter";
import { AdminNewsletterBuild } from "@/components/admin-newsletter-build";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Advertiser update",
  robots: { index: false, follow: false },
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-surface text-muted",
  sending: "bg-cta-tint text-[#7a4a00]",
  sent: "bg-[#E7F3EC] text-[#1F6B45]",
  cancelled: "bg-surface text-muted",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sending: "Part sent",
  sent: "Sent",
  cancelled: "Cancelled",
};

/**
 * The Spotlight Advertiser Update, twice a month.
 *
 * The schedule builds the draft and emails a link. Nothing here has ever
 * sent anything on its own, and it is not meant to: a hundred businesses
 * is exactly the size of list where an unreviewed mistake is expensive.
 */
export default async function AdminNewsletterPage() {
  await requireAdmin();
  const issues = await listIssues();

  return (
    <div className="mx-auto max-w-[900px] px-6 py-8">
      <div className="mb-5 max-w-[74ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          Advertiser update
        </h1>
        <p className="text-sm text-muted mt-1">
          Out on the 1st and the 15th. Each advertiser sees their own cards and
          artwork deadlines at the top, and everyone gets the same open zones
          and news below. Drafts build themselves; you press Send.
        </p>
      </div>

      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <AdminNewsletterBuild />
        <Link
          href="/admin/content?page=newsletter"
          className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-line-strong bg-white"
        >
          Change how a new issue starts
        </Link>
        <Link
          href="/admin/newsletter/optouts"
          className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-line-strong bg-white"
        >
          Off the list
        </Link>
      </div>
      <p className="text-[12.5px] text-muted mb-5 max-w-[74ch]">
        Every issue can be reworded on its own page. Changing it there
        affects that issue alone; changing it under{" "}
        <b className="text-ink">Change how a new issue starts</b> affects
        every issue built from then on and leaves existing ones as they are.
      </p>

      {issues.length === 0 ? (
        <p className="text-[13.5px] text-muted">
          No issues yet. Build one to see what it would say right now.
        </p>
      ) : (
        <div className="border border-line rounded-(--radius-card) bg-white overflow-hidden">
          {issues.map((i) => (
            <Link
              key={i.id}
              href={`/admin/newsletter/${i.id}`}
              className="block border-b border-line last:border-b-0 px-4 py-3.5 hover:bg-surface"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <b className="text-[14.5px]">{i.content.subject}</b>
                <span
                  className={`text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                    STATUS_TONE[i.status] ?? "bg-surface text-muted"
                  }`}
                >
                  {STATUS_LABEL[i.status] ?? i.status}
                </span>
                <span className="ml-auto text-[12.5px] text-muted num">
                  {i.status === "sent" || i.status === "sending"
                    ? `${i.sendCount} sent${i.sentAt ? ` · ${i.sentAt}` : ""}`
                    : `built ${i.createdAt ?? ""}`}
                </span>
              </div>
              <p className="text-[12.5px] text-muted mt-1 num">
                For {i.builtFor} &middot; {i.content.cards.length}{" "}
                {i.content.cards.length === 1 ? "open card" : "open cards"}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-2 max-w-[74ch]">
        <p className="text-[12.5px] text-muted">
          To have drafts build themselves, point a scheduler at{" "}
          <code className="num">/api/cron/newsletter?key=</code> plus your
          CRON_SECRET, on the 1st and the 15th. Until that is set up, use the
          button above.
        </p>
        <p className="text-[12.5px] text-muted">
          Nobody is ever named to anybody else. The personal section is built
          per recipient from that advertiser&rsquo;s own cards, and the shared
          section only names a business if you write one into the story.
        </p>
      </div>
    </div>
  );
}
