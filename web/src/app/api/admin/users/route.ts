import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  setUserPassword,
  setUserActive,
  linkListingToUser,
  createLoginForEmail,
} from "@/lib/admin-data";

/**
 * Admin actions on advertiser accounts. Passwords are hashed with bcrypt
 * before storage; the plaintext an admin chooses is never written to the
 * database or the logs, and is only echoed back to the admin who set it.
 */
export async function POST(req: Request) {
  await requireAdmin();

  let body: { action?: string; [k: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Creating a login has no id yet, so it is handled before the check
  // every other action needs.
  if (body.action === "create") {
    const result = await createLoginForEmail({
      email: String(body.email ?? ""),
      firstName: String(body.firstName ?? ""),
      lastName: String(body.lastName ?? ""),
    });
    return result.ok
      ? NextResponse.json(result)
      : NextResponse.json({ error: result.error }, { status: 422 });
  }

  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "An account id is required" }, { status: 422 });
  }

  try {
    if (body.action === "set-password") {
      const password = String(body.password ?? "");
      if (password.length < 10) {
        return NextResponse.json(
          { error: "Use at least 10 characters" },
          { status: 422 },
        );
      }
      await setUserPassword(id, password);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "set-active") {
      await setUserActive(id, body.active !== false);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "link-listing") {
      const businessId = Number(body.businessId);
      if (!businessId) {
        return NextResponse.json({ error: "A listing is required" }, { status: 422 });
      }
      await linkListingToUser(businessId, id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[admin] user action failed:", e);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
