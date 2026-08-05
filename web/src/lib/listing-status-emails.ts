import "server-only";
import { sendEmail } from "@/lib/email";
import { CONTACT_PHONE, SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Telling a business what happened to their listing.
 *
 * Nothing did. A free listing was submitted into silence, reviewed in
 * silence and went live in silence, so the only way to find out was to
 * go and look. Premium never had this problem, because paying is what
 * approves it and the welcome goes out with the payment.
 *
 * The gap got worse the day it became possible to preview a listing
 * before approving it: review is now a real step with a real delay, and
 * a delay nobody has been told about reads as being ignored.
 */

type Facts = {
  businessName: string;
  email: string;
  slug: string;
};

/** Sent the moment they submit, so the wait is a known wait. */
export async function sendListingReceived(f: Facts): Promise<void> {
  if (!f.email) return;
  await sendEmail({
    to: f.email,
    subject: `We have your listing for ${f.businessName}`,
    text: [
      `Thanks for adding ${f.businessName} to the ${SITE_NAME} directory.`,
      "We read every listing before it goes on the site, so there is a short wait. You do not need to do anything; we will email you the moment it is live.",
      `If anything needs changing in the meantime, reply to this email or call ${CONTACT_PHONE}.`,
      SITE_NAME,
    ].join("\n\n"),
  }).catch((e) => console.error("[listing-status] received failed:", e));
}

/**
 * Sent on approval.
 *
 * The link and the nudge are the point. This is the moment a business is
 * most willing to finish the job, and a listing with no description and
 * no photo is the one nobody calls.
 */
export async function sendListingApproved(f: Facts): Promise<void> {
  if (!f.email) return;
  await sendEmail({
    to: f.email,
    subject: `${f.businessName} is live in the directory`,
    text: [
      `${f.businessName} is now on the ${SITE_NAME} directory.`,
      `See it here: ${SITE_URL}/business/${f.slug}`,
      `You can add photos, opening hours and an offer any time from your account: ${SITE_URL}/account/listings`,
      "Listings with a description and a photo get looked at far more than ones without, so it is worth five minutes.",
      SITE_NAME,
    ].join("\n\n"),
  }).catch((e) => console.error("[listing-status] approved failed:", e));
}

/**
 * Sent when a listing is turned down.
 *
 * With the reason, and with a way back. Most rejections are a thin
 * description or a category that does not fit, both of which a real
 * business will happily fix if anybody tells them.
 */
export async function sendListingRejected(
  f: Facts & { reason: string },
): Promise<void> {
  if (!f.email) return;
  await sendEmail({
    to: f.email,
    subject: `About your ${f.businessName} listing`,
    text: [
      `Thanks for submitting ${f.businessName} to the ${SITE_NAME} directory. We are not able to publish it as it stands.`,
      f.reason.trim() ? `Why: ${f.reason.trim()}` : "",
      `If that is something you can put right, reply to this email or call ${CONTACT_PHONE} and we will take another look. We have kept what you sent, so nothing needs typing again.`,
      SITE_NAME,
    ]
      .filter(Boolean)
      .join("\n\n"),
  }).catch((e) => console.error("[listing-status] rejected failed:", e));
}
