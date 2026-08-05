import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { cleanOverrides, deleteRate, saveRate } from "@/lib/advertiser-rates";

/**
 * Setting what one advertiser pays.
 *
 * Admin only, obviously: a row here decides what somebody is charged.
 * The prices are re-validated on the server rather than trusted from the
 * form, so a tampered payload cannot post a rate of one cent.
 */
export async function POST(req: Request) {
  await requireAdmin();

  let body: {
    email?: unknown;
    overrides?: unknown;
    note?: unknown;
    active?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await saveRate({
    email: String(body.email ?? ""),
    overrides: cleanOverrides(body.overrides),
    note: String(body.note ?? ""),
    active: body.active !== false,
  });

  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.error }, { status: 422 });
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const email = String(new URL(req.url).searchParams.get("email") ?? "");
  if (!email) {
    return NextResponse.json({ error: "Which advertiser?" }, { status: 422 });
  }
  await deleteRate(email);
  return NextResponse.json({ ok: true });
}
