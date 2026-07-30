import { after, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { reviewEdit } from "@/lib/listing-edits";
import {
  WRITES_BLOCKED_MESSAGE,
  directoryWritesBlocked,
  logBlockedWrite,
} from "@/lib/write-guard";

/**
 * Decisions on the changes advertisers asked for.
 *
 * Only the fields that decide where a listing appears reach this queue;
 * everything else an advertiser edits publishes without us. Approving
 * writes through the same updateBusiness the admin screens use, so the
 * slug is left alone and a renamed business keeps the URL on its cards.
 */
export async function POST(req: Request) {
  const admin = await requireAdmin();

  let body: { id?: number; decision?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = Number(body.id);
  const decision = body.decision === "approve" ? "approve" : "reject";
  const reason = String(body.reason ?? "");
  if (!id) {
    return NextResponse.json({ error: "A request id is required" }, { status: 422 });
  }

  // Approving writes the live listing and emails the advertiser, so it
  // is as consequential as the advertiser's own save.
  if (directoryWritesBlocked()) {
    logBlockedWrite("listing edit review", { by: admin.email, id, decision });
    return NextResponse.json({ error: WRITES_BLOCKED_MESSAGE }, { status: 503 });
  }

  try {
    const result = await reviewEdit(id, decision, admin.email, reason);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    if (decision === "approve") {
      revalidatePath("/directory");
      if (result.slug) revalidatePath(`/business/${result.slug}`);
    }

    // Both outcomes are told to the advertiser. The portal promised an
    // email when a change goes live, and a rejection that says nothing
    // leaves them waiting on that promise indefinitely.
    after(async () => {
      const { sendDecision } = await import("@/lib/listing-emails");
      await sendDecision({
        field: result.field,
        businessName: result.businessName,
        slug: result.slug,
        advertiserEmail: result.requestedBy,
        newValue: result.newValue,
        approved: decision === "approve",
        // Read back from the decision rather than the request body, so
        // what the advertiser is told is what we actually filed.
        reason: result.note,
        siteOrigin: process.env.SITE_ORIGIN?.trim() || undefined,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin] listing edit review failed:", e);
    return NextResponse.json({ error: "That could not be saved." }, { status: 500 });
  }
}
