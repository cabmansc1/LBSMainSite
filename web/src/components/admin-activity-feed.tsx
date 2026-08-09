import Link from "next/link";
import {
  KIND_LABEL,
  type ActivityFeed,
  type ActivityKind,
} from "@/lib/admin-activity";

/**
 * What has happened, newest first, with a line marking where you left off.
 *
 * A server component: this is a list of rows that changes when the page
 * is loaded and never in between, so shipping React to make it
 * interactive would buy nothing.
 *
 * Rows below the marker are kept rather than hidden. "Nothing new" is
 * the common answer and an empty box is a worse way to say it than a
 * list with nothing above the line.
 */

const TONE: Record<ActivityKind, string> = {
  artwork: "bg-brand-tint text-brand-deep",
  order: "bg-ok/10 text-ok",
  refund: "bg-danger/10 text-danger",
  inquiry: "bg-surface text-body",
  signup: "bg-surface text-body",
  listing_edit: "bg-surface text-body",
  waitlist: "bg-cta-tint text-[#7a4a00]",
  proof: "bg-brand-tint text-brand-deep",
  // Red, like a refund. Both are the money not being where the books say.
  payment_gap: "bg-danger/10 text-danger",
  // Neutral: a draft waiting to be read is a job on the list, not a
  // problem, and nothing has gone out until somebody presses Send.
  newsletter: "bg-surface text-body",
};

/**
 * Times are stored as MySQL DATETIME in the server's zone and read back
 * as a string. Rendering it verbatim is the honest option: parsing it as
 * if it carried a zone is how a card that arrived this morning starts
 * claiming it arrived at four in the afternoon.
 */
const when = (iso: string) => iso.replace("T", " ").slice(0, 16);

export function AdminActivityFeed({ feed }: { feed: ActivityFeed }) {
  if (feed.rows.length === 0) {
    return (
      <div className="border border-line rounded-(--radius-card) bg-white px-5 py-4">
        <b className="text-[14px]">Activity</b>
        <p className="text-[13px] text-muted mt-1">
          Nothing yet. Artwork uploads, paid orders and refunds land here.
        </p>
      </div>
    );
  }

  const newCount = feed.rows.filter((r) => r.id > feed.lastSeenId).length;

  return (
    <div className="border border-line rounded-(--radius-card) bg-white">
      <div className="flex items-baseline justify-between gap-3 px-5 py-4 border-b border-line">
        <b className="text-[14px]">Activity</b>
        <span className="text-[12.5px] text-muted">
          {newCount > 0
            ? `${newCount} since you last looked`
            : "Nothing new since you last looked"}
        </span>
      </div>
      <ul>
        {feed.rows.map((r, i) => {
          const isNew = r.id > feed.lastSeenId;
          // Drawn once, between the last new row and the first old one,
          // so there is somewhere definite for the eye to stop.
          const divider =
            isNew && feed.rows[i + 1] && feed.rows[i + 1].id <= feed.lastSeenId;

          const body = (
            <>
              <span className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    TONE[r.kind] ?? "bg-surface text-body"
                  }`}
                >
                  {KIND_LABEL[r.kind] ?? r.kind}
                </span>
                <span className="font-semibold text-[13.5px]">{r.title}</span>
                {isNew && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cta shrink-0" />
                )}
              </span>
              {r.detail && (
                <span className="block text-[12.5px] text-muted mt-0.5">
                  {r.detail}
                </span>
              )}
              <span className="block text-[12px] text-faint mt-0.5 num">
                {when(r.createdAt)}
              </span>
            </>
          );

          return (
            <li
              key={r.id}
              className={`border-b border-line last:border-0 ${
                divider ? "border-b-2 border-b-cta" : ""
              }`}
            >
              {r.href ? (
                <Link
                  href={r.href}
                  className="block px-5 py-3 hover:bg-surface transition-colors"
                >
                  {body}
                </Link>
              ) : (
                <span className="block px-5 py-3">{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
