import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import {
  REQUIRED_EVENTS,
  expectedWebhookUrl,
  stripeKeyMode,
  stripePreflight,
  type CheckState,
} from "@/lib/stripe-preflight";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Stripe",
  robots: { index: false, follow: false },
};

const TONE: Record<CheckState, { dot: string; text: string; label: string }> = {
  ok: { dot: "bg-ok", text: "text-ok", label: "Ready" },
  warn: { dot: "bg-cta", text: "text-[#a05e00]", label: "Check" },
  fail: { dot: "bg-[#b42318]", text: "text-[#b42318]", label: "Blocking" },
};

/**
 * Whether this deploy can take live money and finish the job.
 *
 * Read-only: it asks Stripe what it has and compares it with what this
 * build needs. Nothing here creates or changes anything.
 */
export default async function AdminStripePage() {
  await requireAdmin();
  const checks = await stripePreflight();
  const mode = stripeKeyMode();
  const blocking = checks.filter((c) => c.state === "fail").length;
  const webhookUrl = expectedWebhookUrl();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 max-w-[70ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Stripe</h1>
        <p className="text-sm text-muted mt-1">
          Every check here is something that fails quietly: the payment
          succeeds, the customer is charged, and the part after the charge
          does not happen. Run this after any key or URL change.
        </p>
      </div>

      <div
        className={`mb-5 rounded-(--radius-card) border px-4.5 py-3.5 text-[14px] ${
          blocking
            ? "border-[#f3c6c2] bg-[#fdf3f2] text-[#7a271f]"
            : mode === "live"
              ? "border-[#c9e6cf] bg-[#f2faf4] text-[#1c5230]"
              : "border-[#f3ddbb] bg-cta-tint text-[#7a4a00]"
        }`}
      >
        {blocking > 0 ? (
          <>
            <b className="font-semibold">
              {blocking} blocking {blocking === 1 ? "issue" : "issues"}.
            </b>{" "}
            Do not point customers at checkout until these are clear.
          </>
        ) : mode === "live" ? (
          <>
            <b className="font-semibold">Live and ready.</b> Payments on this
            deploy are real.
          </>
        ) : (
          <>
            <b className="font-semibold">Test mode, and correctly set up.</b>{" "}
            Nothing is blocking, but no money is real yet. Swap the key and the
            webhook secret for their live equivalents to go live.
          </>
        )}
      </div>

      <ul className="border border-line rounded-(--radius-card) bg-white divide-y divide-line">
        {checks.map((c) => (
          <li key={c.label} className="px-4.5 py-3.5 flex gap-3.5 items-start">
            <span
              className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${TONE[c.state].dot}`}
              aria-hidden
            />
            <div className="grid gap-0.5">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <b className="text-[14px] font-semibold">{c.label}</b>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${TONE[c.state].text}`}
                >
                  {TONE[c.state].label}
                </span>
              </div>
              <p className="text-[13px] text-body leading-relaxed max-w-[76ch]">
                {c.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 border border-line rounded-(--radius-card) bg-surface p-4.5 text-[13px] text-body max-w-[76ch] grid gap-2">
        <b className="text-[13.5px] font-semibold">Going live</b>
        <p>
          In the Stripe dashboard, switch off test mode, then add an endpoint at{" "}
          <code className="num bg-white border border-line rounded px-1.5 py-0.5">
            {webhookUrl ?? "https://your-domain/api/stripe/webhook"}
          </code>{" "}
          subscribed to {REQUIRED_EVENTS.join(", ")}.
        </p>
        <p>
          Set <b className="font-semibold">STRIPE_SECRET_KEY</b> to the live key
          and <b className="font-semibold">STRIPE_WEBHOOK_SECRET</b>{" "}to that new
          endpoint&rsquo;s signing secret. They must be from the same mode: a
          test secret against a live key rejects every event as an invalid
          signature, which looks exactly like a working checkout.
        </p>
        <p>
          Keep the test-mode endpoint in place. It costs nothing and leaves
          staging working.
        </p>
      </div>
    </div>
  );
}
