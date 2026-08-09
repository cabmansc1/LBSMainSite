import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeTokenValid } from "@/lib/newsletter-audience";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

/**
 * Unsubscribing, in one press.
 *
 * The press matters. Doing the removal on the GET would be friendlier
 * still, and it would also mean every corporate link scanner that opens
 * URLs in incoming mail unsubscribes the recipient before they have read
 * a word. Outlook Safe Links and Mimecast both do exactly that. So the
 * page confirms and the form posts, which no scanner will do.
 *
 * The link is signed, so the address in the URL cannot be edited to
 * unsubscribe somebody else, and a bad signature says so rather than
 * quietly appearing to work.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string; done?: string; failed?: string }>;
}) {
  const { e, t, done, failed } = await searchParams;
  const email = (e ?? "").trim();
  const signed = email && t ? unsubscribeTokenValid(email, t) : false;

  return (
    <div className="mx-auto max-w-[560px] px-6 py-20">
      {done ? (
        <>
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">
            You are unsubscribed
          </h1>
          <p className="mt-3 text-body">
            We have taken {email ? <b>{email}</b> : "that address"} off the
            advertiser update. You will not get another one.
          </p>
          <p className="mt-3 text-body">
            This changes nothing about a card you have booked. Receipts, artwork
            reminders and anything else about an order you have placed still
            come through as normal.
          </p>
        </>
      ) : failed ? (
        <>
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">
            That did not go through
          </h1>
          <p className="mt-3 text-body">
            Something went wrong at our end, so you are still on the list. Try
            again in a minute, or write to us and we will take you off by hand.
          </p>
        </>
      ) : signed ? (
        <>
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">
            Unsubscribe from the advertiser update
          </h1>
          <p className="mt-3 text-body">
            Press the button and we will stop sending the twice-monthly update
            to <b>{email}</b>.
          </p>
          <form action="/api/unsubscribe" method="post" className="mt-6">
            <input type="hidden" name="e" value={email} />
            <input type="hidden" name="t" value={t ?? ""} />
            <button
              type="submit"
              className="text-[14px] font-semibold px-5 py-2.5 rounded-[10px] bg-navy-950 text-white"
            >
              Unsubscribe me
            </button>
          </form>
          <p className="mt-5 text-[13px] text-muted">
            Anything about an order you have placed keeps coming either way.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">
            That link is not right
          </h1>
          <p className="mt-3 text-body">
            It may have been cut short by your email program. Use the
            unsubscribe link at the bottom of the email itself, or write to us
            and we will take you off the list.
          </p>
        </>
      )}

      <p className="mt-6">
        <Link href="/" className="text-brand-deep font-semibold text-[14px]">
          Back to Lowcountry Business Spotlight
        </Link>
      </p>
    </div>
  );
}
