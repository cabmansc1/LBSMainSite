import { NextResponse } from "next/server";
import { verifyLoginCode } from "@/lib/login-codes";
import { findOrCreatePortalUser, setSessionCookie } from "@/lib/auth";
import { recordLogin } from "@/lib/user-activity";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const code = String(body.code ?? "");
  if (!email || !code) {
    return NextResponse.json(
      { error: "Enter the code we emailed you." },
      { status: 422 },
    );
  }

  const check = await verifyLoginCode(email, code);
  if (!check.ok) {
    const message =
      check.reason === "expired"
        ? "That code has expired. Request a new one."
        : check.reason === "too-many"
          ? "Too many wrong attempts. Request a new code."
          : check.reason === "unavailable"
            ? "We could not sign you in just now. Try again shortly."
            : "That code is not right.";
    return NextResponse.json(
      { error: message },
      { status: check.reason === "unavailable" ? 503 : 401 },
    );
  }

  // The code is already consumed at this point. If no account can be
  // resolved the code is spent either way, which is correct: it proved
  // control of the mailbox and should not be reusable afterwards.
  const user = await findOrCreatePortalUser(email);
  if (!user) {
    return NextResponse.json(
      {
        error:
          "That email is not attached to any orders or listings yet. If you think it should be, get in touch.",
      },
      { status: 403 },
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
