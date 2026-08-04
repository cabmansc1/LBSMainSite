import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { setInquiryHandled } from "@/lib/inquiries";

/** Marking an inquiry dealt with, or putting it back. */
export async function POST(req: Request) {
  const session = await requireAdmin();

  let body: { id?: unknown; handled?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Which inquiry?" }, { status: 422 });
  }

  try {
    await setInquiryHandled(
      id,
      session.email,
      body.handled !== false,
      String(body.note ?? ""),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin] inquiry state write failed:", e);
    return NextResponse.json({ error: "That did not save." }, { status: 500 });
  }
}
