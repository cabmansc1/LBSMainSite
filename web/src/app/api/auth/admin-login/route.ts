import { NextResponse } from "next/server";
import { verifyAdminCredentials, setSessionCookie } from "@/lib/auth";

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

  const admin = await verifyAdminCredentials(email, password);
  if (!admin) {
    return NextResponse.json(
      { error: "That email and password combination did not match." },
      { status: 401 },
    );
  }

  await setSessionCookie(admin);
  return NextResponse.json({ ok: true });
}
