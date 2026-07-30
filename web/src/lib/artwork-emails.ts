import "server-only";
import { alertsTo, sendEmail } from "@/lib/email";

/**
 * Notifications when artwork arrives.
 *
 * The upload replaced a mailto: link, and in doing so it quietly removed
 * the only two messages that existed. Emailing a file produces a sent
 * item for the advertiser and an inbox item for us; a form post produces
 * neither. "Got it" on screen is gone the moment the tab closes, and
 * "did you get my artwork?" was already a support question back when
 * there was at least a sent folder to point at.
 *
 * So both sides get a message: a receipt the advertiser can keep, and an
 * alert so a file cannot sit in the database unnoticed until the card
 * prints without it.
 */

const size = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export type ArtworkFacts = {
  email: string;
  businessName?: string;
  filename: string;
  bytes: number;
  note?: string;
  cardName?: string;
  mailMonth?: string;
  artworkDeadline?: string;
  /** Set when an admin uploaded on the advertiser's behalf. */
  uploadedBy?: string;
  /** Absolute link to the admin artwork page. */
  siteOrigin?: string;
};

/** The receipt. Deliberately short: it exists to be findable later. */
export function composeArtworkReceipt(f: ArtworkFacts) {
  const card = f.cardName
    ? `${f.cardName}${f.mailMonth ? `, mailing ${f.mailMonth}` : ""}`
    : f.mailMonth
      ? `your ${f.mailMonth} card`
      : "your card";

  const paragraphs = [
    `We have your artwork for ${card}.`,
    [`File: ${f.filename} (${size(f.bytes)})`, f.note && `Your note: ${f.note}`]
      .filter(Boolean)
      .join("\n"),
    "We will look it over and come back to you if anything about it needs changing for print. You do not need to do anything else right now.",
    // Said plainly, because the alternative is somebody assuming a
    // corrected file overwrote the old one and that we will guess which
    // to use.
    "If you need to send a different version, upload it in your account under Cards. We keep every version and print the newest, so nothing you have already sent gets lost.",
    "Lowcountry Business Spotlight\n(843) 212-2969",
  ];
  const text = paragraphs.join("\n\n");

  return {
    subject: `We have your artwork for ${f.mailMonth ?? "your card"}`,
    text,
  };
}

export function composeArtworkAlert(f: ArtworkFacts) {
  const who = f.businessName ? `${f.businessName} (${f.email})` : f.email;
  const facts = [
    f.cardName && `Card: ${f.cardName}`,
    f.mailMonth && `Mails: ${f.mailMonth}`,
    f.artworkDeadline && `Artwork due: ${f.artworkDeadline}`,
    `File: ${f.filename} (${size(f.bytes)})`,
    f.note && `Note: ${f.note}`,
    f.uploadedBy && `Uploaded by ${f.uploadedBy}, not the advertiser.`,
  ].filter(Boolean);

  return {
    subject: `Artwork in: ${f.businessName ?? f.email}`,
    text: [
      `${who} sent artwork.`,
      facts.join("\n"),
      f.siteOrigin ? `${f.siteOrigin}/admin/artwork` : "See /admin/artwork",
    ].join("\n\n"),
  };
}

/**
 * Never throws and never blocks the upload. A file that saved is saved,
 * and failing the request because a mail server was slow would tell the
 * advertiser their artwork did not arrive when it did.
 */
export async function sendArtworkEmails(f: ArtworkFacts): Promise<void> {
  const receipt = composeArtworkReceipt(f);
  const alert = composeArtworkAlert(f);
  await Promise.all([
    sendEmail({ to: f.email, ...receipt }).catch((e) =>
      console.error("[artwork-email] receipt failed:", e),
    ),
    sendEmail({ to: alertsTo(), ...alert, replyTo: f.email }).catch((e) =>
      console.error("[artwork-email] alert failed:", e),
    ),
  ]);
}
