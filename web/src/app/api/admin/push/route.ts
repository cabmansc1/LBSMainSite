import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  deletePushSubscription,
  pushEnabled,
  savePushSubscription,
  vapidPublicKey,
} from "@/lib/push";

/**
 * Registering a browser for push, and testing that it works.
 *
 * Admin only. These notifications carry customer names and card details,
 * and a subscription endpoint is a way to send this server's messages to
 * a device, so neither belongs behind anything weaker than the session
 * that guards the rest of /admin.
 */

/** The public key the browser needs, plus whether this deploy can push. */
export async function GET() {
  await requireAdmin();
  return NextResponse.json({
    enabled: pushEnabled(),
    publicKey: vapidPublicKey(),
  });
}

export async function POST(req: Request) {
  const session = await requireAdmin();

  let body: {
    action?: string;
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "test") {
    // Sent through the same path a real event takes, so a test that
    // arrives proves the real thing will. Recorded too: a test that
    // shows up in the feed confirms both halves at once.
    const { recordActivity } = await import("@/lib/admin-activity");
    await recordActivity({
      kind: "artwork",
      title: "Test notification",
      detail: `Sent from the admin by ${session.email}.`,
      href: "/admin",
    });
    return NextResponse.json({ ok: true, tested: true });
  }

  const sub = body.subscription;
  if (body.action === "unsubscribe") {
    if (!sub?.endpoint) {
      return NextResponse.json({ error: "No subscription" }, { status: 422 });
    }
    await deletePushSubscription(sub.endpoint);
    return NextResponse.json({ ok: true });
  }

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json(
      { error: "That subscription is missing its keys." },
      { status: 422 },
    );
  }

  const saved = await savePushSubscription(session.email, {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
  return saved
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Could not save that." }, { status: 500 });
}
