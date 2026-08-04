import { after, NextResponse } from "next/server";
import { getSession, isImpersonating } from "@/lib/auth";
import { respondToProof } from "@/lib/proofs";

/**
 * An advertiser approving their proof, or asking for changes.
 *
 * Blocked while viewing as somebody, because an approval is the record
 * of a customer agreeing to what goes to print. It is the one thing on
 * this site that must be theirs and not ours, and support looking at
 * their account must not be able to produce one.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (isImpersonating(session)) {
    return NextResponse.json(
      {
        error:
          "You are viewing as this advertiser. Only they can approve their own proof.",
      },
      { status: 403 },
    );
  }

  let body: { id?: unknown; status?: unknown; response?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = Number(body.id);
  const status = String(body.status ?? "");
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Which proof?" }, { status: 422 });
  }
  if (status !== "approved" && status !== "changes") {
    return NextResponse.json({ error: "Unknown answer" }, { status: 422 });
  }

  const note = String(body.response ?? "").trim();
  if (status === "changes" && note.length < 3) {
    // An unexplained "no" costs a phone call to find out what is wrong,
    // which is the call this whole flow exists to avoid.
    return NextResponse.json(
      { error: "Tell us what needs changing." },
      { status: 422 },
    );
  }

  const result = await respondToProof({
    id,
    email: session.email,
    status,
    response: note,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  after(async () => {
    const { recordActivity } = await import("@/lib/admin-activity");
    await recordActivity({
      kind: "proof",
      title:
        status === "approved"
          ? `Proof approved by ${session.email}`
          : `Changes asked for by ${session.email}`,
      detail: [`v${result.proof.version}`, note].filter(Boolean).join(" - "),
      href: "/admin/artwork",
    });
  });

  return NextResponse.json({ ok: true, status });
}
