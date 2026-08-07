import { NextResponse } from "next/server";
import { verifyCredentials, setSessionCookie } from "@/lib/auth";
import { recordLogin } from "@/lib/user-activity";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 422 },
    );
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return NextResponse.json(
      { error: "That email and password combination did not match." },
      { status: 401 },
    );
  }

  await setSessionCookie(user);
  // A real sign-in, as opposed to the cookie being refreshed after a
  // profile edit or an admin starting to view as somebody. Only these
  // three routes count, which is why this is not inside
  // setSessionCookie.
  await recordLogin(user.email);
  return NextResponse.json({ ok: true });
}
