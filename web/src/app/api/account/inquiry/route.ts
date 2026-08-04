import { NextResponse } from "next/server";
import { getSession, isImpersonating } from "@/lib/auth";
import { setInquiryHandled } from "@/lib/inquiries";

/**
 * An advertiser marking their own inquiry dealt with.
 *
 * Scoped by ownership rather than trusting the id: the id comes from the
 * browser, and without the check anybody signed in could clear somebody
 * else's messages. Confirmed against the same listings the portal used
 * to render them.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (isImpersonating(session)) {
    return NextResponse.json(
      { error: "You are viewing as this advertiser. Stop to make changes." },
      { status: 403 },
    );
  }

  let body: { id?: unknown; handled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Which message?" }, { status: 422 });
  }

  const { getPortalContext } = await import("@/lib/portal");
  const ctx = await getPortalContext(session);
  if (!ctx.inquiries.some((q) => q.id === id)) {
    // Not "forbidden": saying which of the two it is tells a caller
    // whether an id they guessed exists.
    return NextResponse.json({ error: "That message is not yours." }, { status: 404 });
  }

  try {
    await setInquiryHandled(id, session.email, body.handled !== false);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[account] inquiry state write failed:", e);
    return NextResponse.json({ error: "That did not save." }, { status: 500 });
  }
}
