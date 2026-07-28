import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { looksLikePhone, saveProfilePhone } from "@/lib/profile";

/**
 * Fills in contact details checkout let the advertiser skip.
 *
 * Scoped to the signed-in account's own email, taken from the session
 * rather than the request body, so this cannot be used to write a phone
 * number onto somebody else's orders.
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

  const phone = String(body.phone ?? "");
  if (!looksLikePhone(phone)) {
    return NextResponse.json(
      { error: "That does not look like a phone number." },
      { status: 422 },
    );
  }

  const saved = await saveProfilePhone(session.email, phone);
  if (!saved) {
    return NextResponse.json(
      { error: "We could not save that just now." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
