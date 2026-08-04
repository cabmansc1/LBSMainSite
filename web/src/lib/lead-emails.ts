import "server-only";
import { sendAlertEmail, sendEmail } from "@/lib/email";
import { CONTACT_PHONE } from "@/lib/seo";

/**
 * Notifications for a captured lead.
 *
 * Ported from process_form.php and save-quiz-lead.php, which between
 * them sent three messages the rebuild was not sending at all: an admin
 * alert on every contact-form lead, an admin alert on every quiz lead,
 * and the quiz recommendation back to the person who took it.
 *
 * Losing those is not the same class of problem as losing a database
 * row. A lead sitting unread in a table nobody refreshes is a lead you
 * do not know you have, and the quiz recommendation is the only thing
 * the visitor was promised in exchange for their address.
 *
 * Sending never blocks or fails the submission. The PHP deferred these
 * behind finishRequestAndContinue() for the same reason: nobody should
 * watch a spinner while SMTP negotiates.
 */

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const count = (n: number) => Math.round(n).toLocaleString("en-US");

/** Lines with nothing in them are noise in a notification. */
const block = (title: string, rows: [string, string | undefined][]) => {
  const kept = rows.filter(([, v]) => v && v.trim());
  if (kept.length === 0) return "";
  return `${title}\n${kept.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n`;
};

export type AdvertiseLeadFacts = {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  category?: string;
  location?: string;
  message?: string;
  ipAddress?: string | null;
  submittedAt: string;
};

export function composeAdvertiseAlert(f: AdvertiseLeadFacts) {
  const subject = `New Lead: ${f.companyName}`;
  const text =
    "New lead submission.\n\n" +
    block("WHO", [
      ["Company", f.companyName],
      ["Contact", f.contactName],
      ["Email", f.email],
      ["Phone", f.phone],
    ]) +
    block("WHAT THEY SAID", [
      ["Category", f.category],
      ["Area", f.location],
      ["Message", f.message],
    ]) +
    block("METADATA", [
      ["IP", f.ipAddress ?? "unknown"],
      ["Submitted", f.submittedAt],
    ]) +
    "Reply to this email to answer them directly.\n";
  return { subject, text };
}

export type QuizLeadFacts = {
  email: string;
  businessLabel?: string;
  goalLabel?: string;
  mailingSize?: number;
  budget?: number;
  recommendedAd?: string;
  recommendedPrice?: number;
  ipAddress?: string | null;
  submittedAt: string;
};

export function composeQuizAlert(f: QuizLeadFacts) {
  const subject = `New Quiz Lead: ${f.businessLabel || "unknown business type"}`;
  const text =
    "New lead from the Find Your Ad quiz.\n\n" +
    block("WHO", [["Email", f.email]]) +
    block("THEIR ANSWERS", [
      ["Business type", f.businessLabel],
      ["Goal", f.goalLabel],
      ["Mailing size", f.mailingSize ? `${count(f.mailingSize)} households` : undefined],
      ["Budget", f.budget ? money(f.budget) : undefined],
    ]) +
    block("WHAT WE RECOMMENDED", [
      ["Ad size", f.recommendedAd],
      ["Price", f.recommendedPrice ? money(f.recommendedPrice) : undefined],
    ]) +
    block("METADATA", [
      ["IP", f.ipAddress ?? "unknown"],
      ["Submitted", f.submittedAt],
    ]) +
    "Reply to this email to answer them directly.\n";
  return { subject, text };
}

/**
 * The quiz result, sent to the person who took it.
 *
 * The PHP version quoted response-rate statistics as bare facts. They
 * are industry claims rather than our measurements, so they are dropped
 * rather than restated: this rebuild has spent a lot of effort removing
 * invented figures from customer-facing copy and it would be odd to mail
 * some back out.
 *
 * Nothing is printed that was not computed from their own answers.
 */
export function composeQuizRecommendation(f: QuizLeadFacts, siteUrl: string) {
  const subject = "Your ad recommendation from Lowcountry Business Spotlight";
  const text =
    "Thanks for taking the Find Your Ad quiz. Here is what you told us " +
    "and what we would suggest.\n\n" +
    block("YOUR ANSWERS", [
      ["Business type", f.businessLabel],
      ["Goal", f.goalLabel],
      ["Reach", f.mailingSize ? `${count(f.mailingSize)} households` : undefined],
      ["Budget", f.budget ? money(f.budget) : undefined],
    ]) +
    (f.recommendedAd
      ? block("OUR SUGGESTION", [
          ["Ad size", f.recommendedAd],
          ["Price", f.recommendedPrice ? money(f.recommendedPrice) : undefined],
        ])
      : "") +
    "One business per category per card, so the spot is yours alone on " +
    "the card you book. Design, print and postage are included.\n\n" +
    "See what is filling now and pick a neighborhood:\n" +
    `${siteUrl}/pricing\n\n` +
    "Prefer to talk it through? Reply to this email or call " +
    `${CONTACT_PHONE}.\n\n` +
    "Lowcountry Business Spotlight\n";
  return { subject, text };
}

/**
 * Fire and forget. Callers schedule this after the response, so a
 * rejected promise has nowhere useful to go: it is logged here and the
 * lead is already saved and already in GoHighLevel either way.
 */
export async function sendAdvertiseLeadAlert(f: AdvertiseLeadFacts) {
  try {
    const { subject, text } = composeAdvertiseAlert(f);
    await sendAlertEmail("inquiry", { subject, text, replyTo: f.email });
  } catch (e) {
    console.error("[lead-emails] advertise alert failed:", e);
  }
}

export async function sendQuizLeadEmails(f: QuizLeadFacts, siteUrl: string) {
  // The alert matters more than the recommendation: one is a sale to
  // chase, the other is a courtesy. Sent first so a failure on the
  // second cannot cost the first.
  try {
    const alert = composeQuizAlert(f);
    await sendAlertEmail("inquiry", {
      subject: alert.subject,
      text: alert.text,
      replyTo: f.email,
    });
  } catch (e) {
    console.error("[lead-emails] quiz alert failed:", e);
  }
  try {
    const rec = composeQuizRecommendation(f, siteUrl);
    await sendEmail({ to: f.email, subject: rec.subject, text: rec.text });
  } catch (e) {
    console.error("[lead-emails] quiz recommendation failed:", e);
  }
}
