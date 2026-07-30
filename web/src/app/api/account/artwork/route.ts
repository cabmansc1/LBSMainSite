import { after, NextResponse } from "next/server";
import { getSession, isImpersonating } from "@/lib/auth";
import { getPortalContext, MC_UNAVAILABLE } from "@/lib/portal";
import { MAX_ARTWORK_BYTES, saveArtwork } from "@/lib/artwork";

/**
 * An advertiser sending us their print file.
 *
 * The card is checked against the same list the portal page rendered,
 * so somebody cannot post another business's card id and attach a file
 * to their campaign. If Mission Control is unreachable we say so rather
 * than reporting an empty card list as "that card is not yours", which
 * would read as an accusation over what is really an outage.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Send the file as form data." },
      { status: 400 },
    );
  }

  const cardId = String(form.get("cardId") ?? "").trim();
  if (!cardId) {
    return NextResponse.json({ error: "Which card?" }, { status: 422 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file." }, { status: 422 });
  }
  // Checked here as well as in saveArtwork, so an oversized upload is
  // refused before the whole body is pulled into memory as a Buffer.
  if (file.size > MAX_ARTWORK_BYTES) {
    return NextResponse.json(
      { error: "That file is over 25MB. Email us a link instead." },
      { status: 413 },
    );
  }

  const ctx = await getPortalContext(session);
  if (ctx.warnings.includes(MC_UNAVAILABLE)) {
    return NextResponse.json(
      { error: "We could not check your cards just now. Try again shortly." },
      { status: 503 },
    );
  }
  const card = ctx.cards.find((c) => c.cardId === cardId);
  if (!card) {
    return NextResponse.json(
      { error: "That card is not on your account." },
      { status: 403 },
    );
  }

  const filename = file.name || "artwork";
  const note = String(form.get("note") ?? "");
  const bytes = Buffer.from(await file.arrayBuffer());

  const saved = await saveArtwork({
    email: session.email,
    cardId,
    filename,
    mime: file.type || "",
    note,
    // Support uploading a file a customer emailed in is genuinely useful,
    // so impersonation is allowed here, unlike on the profile form. It is
    // recorded, because "you sent us this" should not be said to somebody
    // who did not.
    uploadedBy: isImpersonating(session) ? "admin" : "",
    bytes,
  });
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 422 });
  }

  // After the response. The advertiser gets their confirmation the
  // moment the file is safe, rather than watching a spinner while a
  // mail server negotiates, and a slow send cannot fail an upload that
  // already succeeded.
  after(async () => {
    const { sendArtworkEmails } = await import("@/lib/artwork-emails");
    await sendArtworkEmails({
      email: session.email,
      businessName: ctx.listings[0]?.name,
      filename,
      bytes: bytes.length,
      note,
      cardName: card.zoneName,
      mailMonth: card.mailMonth,
      artworkDeadline: card.artworkDeadline,
      uploadedBy: isImpersonating(session)
        ? session.impersonatedBy?.email
        : undefined,
      siteOrigin: process.env.SITE_ORIGIN?.trim() || undefined,
    });
  });

  return NextResponse.json({ ok: true, id: saved.id });
}
