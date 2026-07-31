import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sendDirectoryInvites } from "@/lib/directory-invite-email";

/**
 * Sends the directory invite to the advertisers chosen in the admin.
 *
 * Admin only, and there is no schedule behind it: this is the one email
 * in the app that is a pitch, and a pitch that goes out on a timer is
 * how a business ends up mailing somebody the week they asked to be
 * left alone.
 */
export async function POST(req: Request) {
  await requireAdmin();

  let body: { userIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userIds = Array.isArray(body.userIds)
    ? body.userIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  if (userIds.length === 0) {
    return NextResponse.json({ error: "Nobody selected" }, { status: 422 });
  }

  try {
    const results = await sendDirectoryInvites(userIds);
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    console.error("[admin] directory invites failed:", e);
    return NextResponse.json({ error: "Sending failed" }, { status: 500 });
  }
}
