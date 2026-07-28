import { NextResponse } from "next/server";
import { getSession, setSessionCookie } from "@/lib/auth";
import {
  looksLikePhone,
  saveProfileName,
  saveProfilePassword,
  saveProfilePhone,
} from "@/lib/profile";

/**
 * The account's own details.
 *
 * Everything is scoped to the signed-in session, never to an id or an
 * email in the request body, so this cannot be pointed at somebody
 * else's record.
 *
 * Email is deliberately not editable here. It is the identity codes are
 * sent to and the key orders and Mission Control advertisers are matched
 * on, so changing it is an account merge rather than a field edit. That
 * belongs with an admin, not on a self-serve form.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const action = String(body.action ?? "phone");

  if (action === "phone") {
    const phone = String(body.phone ?? "");
    if (!looksLikePhone(phone)) {
      return NextResponse.json(
        { error: "That does not look like a phone number." },
        { status: 422 },
      );
    }
    const saved = await saveProfilePhone(session.email, phone);
    return saved
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "We could not save that just now." }, { status: 500 });
  }

  if (action === "name") {
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    if (!firstName) {
      return NextResponse.json({ error: "Enter your first name." }, { status: 422 });
    }
    const saved = await saveProfileName(session.id, firstName, lastName);
    if (!saved) {
      return NextResponse.json({ error: "We could not save that just now." }, { status: 500 });
    }
    // The session carries the name for the portal chrome, so refresh it
    // rather than leaving the sidebar showing the old one until they
    // next sign in.
    await setSessionCookie({ ...session, firstName });
    return NextResponse.json({ ok: true });
  }

  if (action === "password") {
    const password = String(body.password ?? "");
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Use at least 8 characters." },
        { status: 422 },
      );
    }
    const saved = await saveProfilePassword(session.id, password);
    return saved
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "We could not save that just now." }, { status: 500 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 422 });
}
