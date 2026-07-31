import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { emailEnabled } from "@/lib/email";
import {
  RESEND_AFTER_DAYS,
  getInviteCandidates,
  inviteEligibility,
} from "@/lib/directory-invite-email";
import { AdminDirectoryInvites } from "@/components/admin-directory-invites";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Directory invites",
  robots: { index: false, follow: false },
};

/**
 * Advertisers who pay for a postcard spot and are not in the free
 * directory.
 *
 * The portal shows them a banner, but most advertisers never sign in,
 * so the banner reaches the smaller half. This is the other half, and
 * it is the one pitch this app sends: reviewed before it goes, never on
 * a timer.
 */
export default async function AdminDirectoryInvitesPage() {
  await requireAdmin();
  const candidates = await getInviteCandidates();
  const rows = candidates.map((c) => ({
    ...c,
    ...inviteEligibility(c),
  }));
  const ready = rows.filter((r) => r.ok).length;

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 max-w-[72ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          Directory invites
        </h1>
        <p className="text-sm text-muted mt-1">
          Advertisers who have paid for a card spot and have no directory
          listing. A free listing costs them nothing and gives the directory
          the businesses people are already seeing on the postcard.
        </p>
      </div>

      {!emailEnabled() && (
        <p className="mb-4 text-[13px] text-[#7a4a00] bg-cta-tint border border-[#f3ddbb] rounded-lg px-4 py-2.5">
          No RESEND_API_KEY on this deploy, so sending here writes the full
          message to the log instead of the inbox. Useful for checking the
          wording, and nobody receives anything.
        </p>
      )}

      <p className="mb-4 text-[13px] text-body">
        <b className="font-semibold num">{ready}</b> of{" "}
        <span className="num">{rows.length}</span> can be emailed now. The rest
        were emailed or said no recently, and are shown with the reason rather
        than hidden, so the list is the whole picture. Nobody is emailed twice
        within {RESEND_AFTER_DAYS} days.
      </p>

      <AdminDirectoryInvites rows={rows} />
    </div>
  );
}
