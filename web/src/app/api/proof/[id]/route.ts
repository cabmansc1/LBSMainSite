import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProofBytes } from "@/lib/proofs";

/**
 * Serves a proof.
 *
 * Two audiences, one route: the admin who made it and the advertiser it
 * is for. Authorized by comparing the session email to the proof's own,
 * so an id belonging to somebody else returns nothing however it was
 * come by.
 *
 * Inline rather than as an attachment, because the point is to look at
 * it and say yes. Downloading a PDF to approve it is a step nobody
 * should have to take.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const proof = await getProofBytes(Number(id));
  if (!proof) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mine = proof.email.toLowerCase() === session.email.toLowerCase();
  if (!mine && session.role !== "admin") {
    // 404 rather than 403: telling a caller that an id exists but is not
    // theirs is a way to enumerate customers.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const safe = proof.filename.replace(/[^\w.() -]+/g, "_").slice(0, 120);

  return new NextResponse(new Uint8Array(proof.bytes), {
    headers: {
      "Content-Type": proof.mime,
      "Content-Length": String(proof.bytes.length),
      "Content-Disposition": `inline; filename="${safe}"`,
      // Somebody's unpublished advertisement behind a session.
      "Cache-Control": "private, no-store",
    },
  });
}
