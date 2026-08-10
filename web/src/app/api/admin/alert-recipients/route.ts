import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { CATEGORY_KINDS, type ActivityKind } from "@/lib/admin-activity";
import {
  CHANNELS,
  deleteRecipient,
  saveRecipient,
  setMuted,
  type AlertChannel,
} from "@/lib/alert-routing";

/**
 * Managing who gets alerts.
 *
 * Admin only, and worth being strict about: a row here decides where a
 * customer's name and card details are sent, so an address added by
 * anybody else would be a way to subscribe to them.
 */

/** Anything not a real kind is dropped rather than stored and ignored later. */
function cleanPrefs(raw: unknown): Record<AlertChannel, ActivityKind[]> {
  const out = { email: [], sms: [], push: [] } as Record<
    AlertChannel,
    ActivityKind[]
  >;
  if (!raw || typeof raw !== "object") return out;
  const known = new Set<string>(CATEGORY_KINDS);
  for (const channel of CHANNELS) {
    const list = (raw as Record<string, unknown>)[channel];
    if (!Array.isArray(list)) continue;
    out[channel] = [
      ...new Set(list.map((k) => String(k)).filter((k) => known.has(k))),
    ] as ActivityKind[];
  }
  return out;
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: {
    action?: unknown;
    kind?: unknown;
    muted?: unknown;
    id?: unknown;
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    active?: unknown;
    prefs?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Muting a kind is a different question from who wants it, so it is
  // its own action rather than a field smuggled onto a recipient.
  if (body.action === "mute") {
    const kind = String(body.kind ?? "");
    if (!new Set<string>(CATEGORY_KINDS).has(kind)) {
      return NextResponse.json({ error: "Unknown alert kind" }, { status: 422 });
    }
    await setMuted(kind as ActivityKind, body.muted === true);
    return NextResponse.json({ ok: true });
  }

  const result = await saveRecipient({
    id: Number(body.id) || undefined,
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    phone: String(body.phone ?? ""),
    active: body.active !== false,
    prefs: cleanPrefs(body.prefs),
  });

  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.error }, { status: 422 });
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Which recipient?" }, { status: 422 });
  }
  await deleteRecipient(id);
  return NextResponse.json({ ok: true });
}
