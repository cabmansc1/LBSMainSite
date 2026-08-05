import "server-only";
import { sendEmail } from "@/lib/email";
import { SITE_NAME, SITE_URL, CONTACT_PHONE } from "@/lib/seo";

/**
 * "Your proof is ready."
 *
 * Sent only when the admin asks for it at upload time. Filing a copy of
 * a proof and sending one to a customer are different acts, and the
 * second should never happen as a side effect of the first.
 *
 * The link goes to the portal rather than attaching the file. An
 * approval has to be recorded against the version they actually saw, and
 * a PDF in an inbox can be answered by replying to the wrong email a
 * fortnight later.
 */
export async function sendProofReady(f: {
  email: string;
  cardId: string;
  version: number;
  note?: string;
}): Promise<void> {
  const paragraphs = [
    "Your ad proof is ready to look at.",
    f.note?.trim() ? f.note.trim() : "",
    `Open it here and either approve it or tell us what to change: ${SITE_URL}/account/cards`,
    f.version > 1
      ? `This is version ${f.version}, so it already has your earlier changes in it.`
      : "",
    `Approving is what tells us it can go to print. If anything is wrong, say so on that page or call ${CONTACT_PHONE}.`,
    SITE_NAME,
  ].filter(Boolean);

  await sendEmail({
    to: f.email,
    subject:
      f.version > 1
        ? `Your updated ad proof (v${f.version})`
        : "Your ad proof is ready",
    text: paragraphs.join("\n\n"),
  }).catch((e) => console.error("[proof-email] send failed:", e));
}
