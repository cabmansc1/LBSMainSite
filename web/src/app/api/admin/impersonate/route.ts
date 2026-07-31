import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getSession, setSessionCookie, type SessionUser } from "@/lib/auth";

/**
 * Support impersonation: an admin views the portal as an advertiser.
 *
 * Genuinely useful and genuinely dangerous, and the difference is
 * entirely in the guards:
 *
 *   - starting requires a real admin session
 *   - the resulting session is NOT an admin, so /admin closes behind you
 *   - it records who started it, inside the signed cookie, so it cannot
 *     be stripped to shed the restrictions
 *   - mutating routes refuse it (see isImpersonating)
 *   - stopping restores the admin from that same signed record, so it
 *     never needs to trust a client-supplied identity
 */

export async function POST(req: Request) {
  const admin = await getSession();
  if (admin?.role !== "admin") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  // Already looking through someone's eyes. Chaining would make the
  // trail ambiguous about who is actually responsible.
  if (admin.impersonatedBy) {
    return NextResponse.json(
      { error: "Stop the current session first." },
      { status: 409 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userId = Number(body.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Which account?" }, { status: 422 });
  }

  const { db } = await import("@/lib/db");
  const rows = (await db.execute(
    sql`SELECT id, email, first_name FROM directory_users
        WHERE id = ${userId} LIMIT 1`,
  )) as unknown as [{ id: number; email: string; first_name: string }[]];
  const target = rows[0]?.[0];
  if (!target) {
    return NextResponse.json({ error: "No such account" }, { status: 404 });
  }

  // Deliberately loud. Impersonation is the kind of thing that should
  // leave a trace somebody can find later without going looking.
  console.warn(
    `[impersonate] ${admin.email} (#${admin.id}) started viewing as ${target.email} (#${target.id})`,
  );

  const as: SessionUser = {
    id: target.id,
    email: target.email,
    firstName: target.first_name ?? "",
    // No role. The admin area closes behind you, which is the point:
    // you are seeing what they see.
    impersonatedBy: { id: admin.id, email: admin.email },
  };
  await setSessionCookie(as);
  return NextResponse.json({ ok: true, email: target.email });
}

/** Ends impersonation and restores the admin who started it. */
export async function DELETE() {
  const current = await getSession();
  const by = current?.impersonatedBy;
  if (!current || !by) {
    return NextResponse.json({ error: "Not viewing as anyone" }, { status: 400 });
  }

  console.warn(
    `[impersonate] ${by.email} (#${by.id}) stopped viewing as ${current.email}`,
  );

  // Restored from the signed record rather than from anything the
  // client sent, and the admin role is re-granted only here.
  await setSessionCookie({
    id: by.id,
    email: by.email,
    firstName: "",
    role: "admin",
  });
  return NextResponse.json({ ok: true });
}
