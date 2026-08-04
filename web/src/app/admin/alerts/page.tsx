import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { alertsTo } from "@/lib/email";
import { CATEGORY_KINDS, KIND_LABEL } from "@/lib/admin-activity";
import { CHANNELS, CHANNEL_LABEL, getRecipients } from "@/lib/alert-routing";
import { AdminAlertRecipients } from "@/components/admin-alert-recipients";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Alerts",
  robots: { index: false, follow: false },
};

/**
 * Who gets told what, and how.
 *
 * The alternative was three environment variables and a redeploy, which
 * could say "send every alert to one inbox" and nothing more specific
 * than that.
 */
export default async function AdminAlertsPage() {
  await requireAdmin();
  const recipients = await getRecipients();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 max-w-[74ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Alerts</h1>
        <p className="text-sm text-muted mt-1">
          Who hears about artwork, orders, refunds and the rest, and whether
          they hear by email, text or a notification on their phone. The
          activity feed on the Dashboard always has everything regardless of
          what is set here.
        </p>
      </div>

      <AdminAlertRecipients
        recipients={recipients}
        kinds={CATEGORY_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
        channels={CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABEL[c] }))}
        fallbackEmail={alertsTo()}
      />

      <p className="text-[12.5px] text-muted mt-5 max-w-[74ch]">
        Text messages need Twilio credentials and push needs a VAPID key pair,
        both under Integrations. Without them, a ticked box is recorded and the
        message is written to the log instead of being sent, so the routing can
        be set up before the accounts exist.
      </p>
    </div>
  );
}
