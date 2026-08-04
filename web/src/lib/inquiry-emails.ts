import "server-only";
import { sendAlertEmail, sendEmail } from "@/lib/email";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Telling somebody an inquiry arrived.
 *
 * Nothing did. The endpoint wrote the row and stopped, with a comment
 * saying email would be attached in a later phase, and that phase never
 * came. So a customer filled in a form on a business's listing, was told
 * their message had been sent, and it went into a table nobody was
 * watching. The business heard nothing. We heard nothing.
 *
 * Two messages, because they are for different people and only one of
 * them is ours to act on. The business gets the message and the sender's
 * address, so they can simply reply. We get a copy, since a directory
 * whose inquiries quietly go nowhere is a directory that stops being
 * worth paying for, and knowing they arrive is the only way to notice.
 */

export type InquiryFacts = {
  businessName: string;
  businessEmail: string;
  businessSlug: string;
  fromName: string;
  fromEmail: string;
  message: string;
};

export function composeInquiryToBusiness(f: InquiryFacts) {
  return {
    subject: `New inquiry for ${f.businessName}`,
    text: [
      `${f.fromName} sent you a message through your ${SITE_NAME} listing.`,
      f.message,
      `Reply straight to this email and it goes to ${f.fromEmail}.`,
      `Your listing: ${SITE_URL}/business/${f.businessSlug}`,
    ].join("\n\n"),
  };
}

export function composeInquiryAlert(f: InquiryFacts) {
  return {
    subject: `Inquiry: ${f.businessName}`,
    text: [
      `${f.fromName} (${f.fromEmail}) messaged ${f.businessName}.`,
      f.message,
      f.businessEmail
        ? `Sent on to ${f.businessEmail}.`
        : "That listing has no email address, so nobody was told but you.",
      `${SITE_URL}/admin/inquiries`,
    ].join("\n\n"),
  };
}

/**
 * Never throws. The inquiry is already saved by the time this runs, and
 * telling somebody their message failed to send when it is sitting in
 * our database would be false.
 */
export async function sendInquiryEmails(f: InquiryFacts): Promise<void> {
  const jobs: Promise<unknown>[] = [];

  if (f.businessEmail) {
    // replyTo is the whole point: a business owner should be able to
    // press reply and be talking to the customer, not to us.
    jobs.push(
      sendEmail({
        to: f.businessEmail,
        ...composeInquiryToBusiness(f),
        replyTo: f.fromEmail,
      }).catch((e) => console.error("[inquiry-email] to business failed:", e)),
    );
  }

  jobs.push(
    sendAlertEmail("inquiry", {
      ...composeInquiryAlert(f),
      replyTo: f.fromEmail,
    }).catch((e) => console.error("[inquiry-email] alert failed:", e)),
  );

  await Promise.all(jobs);
}
