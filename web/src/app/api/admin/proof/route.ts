import { after, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { proofByteLimit, saveProof } from "@/lib/proofs";

/**
 * Uploading a proof for an advertiser.
 *
 * The reason this exists rather than the admin signing in as the
 * customer and using their upload form: that path is for artwork coming
 * the other way, so it emails them "we have your artwork" about a file
 * we made ourselves, and counts them as having sent something in when
 * they have not.
 *
 * Notifying is an explicit choice per upload. Sending a proof and filing
 * a copy of one are different acts, and only one of them should put mail
 * in a customer's inbox.
 */
export async function POST(req: Request) {
  const session = await requireAdmin();

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Send the file as form data." }, { status: 400 });
  }

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const cardId = String(form.get("cardId") ?? "").trim();
  const note = String(form.get("note") ?? "");
  const notify = String(form.get("notify") ?? "") === "1";

  if (!email || !cardId) {
    return NextResponse.json(
      { error: "Which advertiser, and which card?" },
      { status: 422 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file." }, { status: 422 });
  }
  // Checked before the body is pulled into a Buffer, so an oversized
  // file is refused rather than read into memory first.
  if (file.size > proofByteLimit()) {
    return NextResponse.json(
      {
        error: `That file is over ${Math.round(proofByteLimit() / 1024 / 1024)}MB.`,
      },
      { status: 413 },
    );
  }

  const saved = await saveProof({
    email,
    cardId,
    filename: file.name,
    mime: file.type,
    bytes: Buffer.from(await file.arrayBuffer()),
    note,
    uploadedBy: session.email,
  });
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 422 });
  }

  after(async () => {
    if (notify) {
      const { sendProofReady } = await import("@/lib/proof-emails");
      await sendProofReady({
        email,
        cardId,
        version: saved.version,
        note,
      });
    }
    // Recorded either way, so the feed shows a proof was sent even when
    // it was filed quietly, and says which of the two it was.
    const { recordActivity } = await import("@/lib/admin-activity");
    await recordActivity({
      kind: "proof",
      title: `Proof v${saved.version} for ${email}`,
      detail: notify
        ? "Sent to the advertiser to approve."
        : "Filed without emailing them.",
      href: "/admin/artwork",
    });
  });

  return NextResponse.json({ ok: true, ...saved });
}
