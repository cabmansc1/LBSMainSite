import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { ghlWebhookUrl } from "@/lib/ghl";
import { emailEnabled } from "@/lib/email";
import { mcEnabled, mcKeySource } from "@/lib/mission-control";
import { GHL_SURFACES } from "@/lib/ghl-sample";
import { pushEnabled } from "@/lib/push";
import { smsEnabled } from "@/lib/alerts-sms";
import { slackEnabled } from "@/lib/alerts-slack";
import { facebookEnabled } from "@/lib/facebook";
import { AdminGhlTest } from "@/components/admin-ghl-test";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Integrations",
  robots: { index: false, follow: false },
};

export default async function AdminIntegrationsPage() {
  await requireAdmin();

  const wired = GHL_SURFACES.filter((s) => !!ghlWebhookUrl(s));
  const catchAll = !!process.env.GHL_WEBHOOK_URL?.trim();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Integrations</h1>
        <p className="text-sm text-muted mt-1 max-w-[74ch]">
          What this deployment can reach, and a way to fire a sample at
          GoHighLevel without submitting a real form and then having to clean
          up after it.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-7">
        {[
          {
            label: "Email",
            value: emailEnabled() ? "Sending" : "Preview only",
            note: emailEnabled()
              ? process.env.EMAIL_FROM ?? ""
              : "No RESEND_API_KEY, bodies print to the log",
          },
          {
            label: "GoHighLevel",
            value: `${wired.length} of ${GHL_SURFACES.length}`,
            note: catchAll ? "Catch-all URL is set" : "No catch-all URL",
          },
          {
            label: "Mission Control",
            value: mcEnabled() ? "Connected" : "Not configured",
            note:
              process.env.MC_READ_ONLY === "1"
                ? `${mcKeySource()}, writes blocked`
                : `${mcKeySource()}, WRITES LIVE`,
          },
          // The alert channels. An unconfigured one is not broken, it
          // just prints what it would have sent to the log, so the
          // wording says which of the two it is doing.
          {
            label: "Phone push",
            value: pushEnabled() ? "Ready" : "Not configured",
            note: pushEnabled()
              ? "Switch it on per browser from the Dashboard"
              : "No VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY",
          },
          {
            label: "SMS",
            value: smsEnabled() ? "Sending" : "Preview only",
            note: smsEnabled()
              ? `${process.env.ALERT_SMS_TO ?? ""} from ${process.env.TWILIO_FROM ?? ""}`
              : "Needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, ALERT_SMS_TO",
          },
          {
            label: "Slack",
            value: slackEnabled() ? "Posting" : "Not configured",
            note: slackEnabled()
              ? "Incoming webhook is set"
              : "No SLACK_WEBHOOK_URL",
          },
          {
            label: "Facebook Page",
            value: facebookEnabled() ? "Ready to post" : "Not configured",
            note: facebookEnabled()
              ? "Share a card from the gallery admin"
              : "Needs FACEBOOK_PAGE_ID and FACEBOOK_PAGE_TOKEN",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="border border-line rounded-(--radius-card) bg-white p-5"
          >
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              {s.label}
            </div>
            <div className="text-[19px] font-bold tracking-tight mt-1">
              {s.value}
            </div>
            <div className="text-[12px] text-muted mt-0.5 break-words">
              {s.note}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mb-3">
        Send a sample to GoHighLevel
      </h2>
      <p className="text-[13px] text-muted mb-4 max-w-[74ch]">
        An inbound webhook trigger will not let you map fields until it has
        seen a request. These send the real payload shapes so you can build
        each mapping once and know it matches what a live submission sends.
        Every sample carries an <code>lbs-test</code> tag and a sample@example.com
        address, so anything that reaches a live workflow is one filter away
        from being deleted. Nothing here writes to the database.
      </p>

      <AdminGhlTest />
    </div>
  );
}
