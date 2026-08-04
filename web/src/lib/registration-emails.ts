import "server-only";
import { alertsTo, sendEmail } from "@/lib/email";
import { CONTACT_PHONE } from "@/lib/seo";

/**
 * Somebody listed their business.
 *
 * A free listing is created unverified and shows nowhere until it is
 * approved, so without this it would sit invisible until somebody
 * happened to open the admin. The business, meanwhile, has filled in a
 * form and been told they are listed.
 *
 * A paid one is already live by the time this sends, because the
 * webhook verified it. That one is a heads-up rather than a queue item,
 * and it says so, so a glance at the subject line is enough to know
 * whether anything is waiting on you.
 */

export type SignupFacts = {
  businessName: string;
  email: string;
  plan: "basic" | "monthly" | "annual";
  businessId: number;
  slug: string;
  siteOrigin?: string;
};

const TERM = {
  basic: "Free",
  monthly: "Premium, monthly",
  annual: "Premium, yearly",
};

export function composeSignupAlert(f: SignupFacts) {
  const paid = f.plan !== "basic";
  const admin = f.siteOrigin ? `${f.siteOrigin}/admin/directory` : "/admin/directory";

  return {
    subject: paid
      ? `New Premium listing: ${f.businessName}`
      : `Listing to approve: ${f.businessName}`,
    text: [
      `${f.businessName} signed up for a directory listing.`,
      [`Plan: ${TERM[f.plan]}`, `Email: ${f.email}`].join("\n"),
      paid
        ? "They have paid, so the listing is already live. Nothing is waiting on you."
        : // Said plainly because the consequence is invisible: an
          // unapproved listing looks like no signup at all from the
          // outside, including to the business that just filled the form.
          "It is not public yet. A free listing stays unverified until you approve it, and until then nobody can find it.",
      paid
        ? `See it: ${f.siteOrigin ? `${f.siteOrigin}/business/${f.slug}` : `/business/${f.slug}`}`
        : `Approve it: ${admin}`,
    ].join("\n\n"),
  };
}

/** Never throws: a signup that saved is saved whatever the mail server does. */
export async function sendSignupAlert(f: SignupFacts): Promise<void> {
  await sendEmail({
    to: alertsTo(),
    ...composeSignupAlert(f),
    replyTo: f.email,
  }).catch((e) => console.error("[registration-email] alert failed:", e));
}

/** The welcome, once a Premium listing is actually live. */
export function composePremiumWelcome(f: SignupFacts) {
  const page = f.siteOrigin
    ? `${f.siteOrigin}/business/${f.slug}`
    : `/business/${f.slug}`;
  return {
    subject: `${f.businessName} is live in the directory`,
    text: [
      `Your Premium listing is live.`,
      `See it: ${page}`,
      // The sign-in instruction matters more than it looks: they have
      // an account they never chose a password for, and without this
      // the next step is a login screen they do not know they can pass.
      "To edit it, sign in with your email address and we will send you a code. No password to remember.",
      "You can change your phone, description, website, hours and social links yourself, and they go live straight away.",
      `Lowcountry Business Spotlight\n${CONTACT_PHONE}`,
    ].join("\n\n"),
  };
}

export async function sendPremiumWelcome(f: SignupFacts): Promise<void> {
  if (!f.email) return;
  await sendEmail({ to: f.email, ...composePremiumWelcome(f) }).catch((e) =>
    console.error("[registration-email] welcome failed:", e),
  );
}
