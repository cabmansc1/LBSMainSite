import "server-only";
import { sql } from "drizzle-orm";
import { KIND_LABEL, type ActivityEvent } from "@/lib/admin-activity";

/**
 * Browser push, so the phone buzzes with the site closed.
 *
 * The only channel here that needs a key pair. VAPID identifies this
 * server to Apple's, Google's and Mozilla's push services; without it
 * they refuse the request. Generate one with:
 *
 *   node -e "console.log(require('web-push').generateVAPIDKeys())"
 *
 * and set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT (a
 * mailto: for yourself). The public key is also handed to the browser,
 * so it is not a secret; the private one is.
 *
 * A subscription is a per-browser thing, not a per-person thing: signing
 * in on a phone and a laptop makes two, and both should ring. They also
 * expire on their own, which is why a dead one is deleted rather than
 * retried forever.
 */

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_push_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      endpoint VARCHAR(500) NOT NULL,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_endpoint (endpoint),
      INDEX (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
const vapidPrivateKey = () => process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
const vapidSubject = () =>
  process.env.VAPID_SUBJECT?.trim() || "mailto:hello@lowcountrybusinessspotlight.com";

export const pushEnabled = () => !!vapidPublicKey() && !!vapidPrivateKey();

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function savePushSubscription(
  email: string,
  sub: PushSubscriptionInput,
): Promise<boolean> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return false;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    // The endpoint is the identity. Re-subscribing the same browser
    // returns the same one, and a second row for it would mean two
    // notifications for every event.
    await db.execute(
      sql`INSERT INTO lbs_push_subscriptions (email, endpoint, p256dh, auth)
          VALUES (${email.toLowerCase()}, ${sub.endpoint.slice(0, 500)},
                  ${sub.keys.p256dh.slice(0, 255)}, ${sub.keys.auth.slice(0, 255)})
          ON DUPLICATE KEY UPDATE
            email = VALUES(email), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
    );
    return true;
  } catch (e) {
    console.error("[push] could not save subscription:", e);
    return false;
  }
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`DELETE FROM lbs_push_subscriptions WHERE endpoint = ${endpoint}`,
    );
  } catch (e) {
    console.error("[push] could not delete subscription:", e);
  }
}

/** How many browsers this admin has switched on. */
export async function countSubscriptions(email: string): Promise<number> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM lbs_push_subscriptions
          WHERE email = ${email.toLowerCase()}`,
    )) as unknown as [{ n: number | string }[]];
    return Number(rows[0]?.[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

/** Sends to every registered browser. */
export async function pushToAdmins(event: ActivityEvent): Promise<void> {
  if (!pushEnabled()) {
    console.log(`[push preview] would notify: ${event.title}`);
    return;
  }

  let subs: {
    id: number;
    email: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }[];
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT id, email, endpoint, p256dh, auth FROM lbs_push_subscriptions`,
    )) as unknown as [
      {
        id: number;
        email: string;
        endpoint: string;
        p256dh: string;
        auth: string;
      }[],
    ];
    subs = rows[0] ?? [];
  } catch (e) {
    console.error("[push] subscription read failed:", e);
    return;
  }
  if (subs.length === 0) return;

  // A subscription belongs to a browser but is stamped with the admin
  // who registered it, which is what lets the recipients screen decide
  // who gets what. Null means nobody is configured there, and then every
  // switched-on browser is notified, as it was before routing existed.
  const { routeFor } = await import("@/lib/alert-routing");
  const routed = await routeFor(event.kind, "push");
  if (routed !== null) {
    const wanted = new Set(routed.map((r) => r.email.toLowerCase()));
    subs = subs.filter((s) => wanted.has(String(s.email).toLowerCase()));
    if (subs.length === 0) return;
  }

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(vapidSubject(), vapidPublicKey(), vapidPrivateKey());

  const payload = JSON.stringify({
    title: `${KIND_LABEL[event.kind] ?? "Update"}: ${event.title}`,
    body: event.detail ?? "",
    // The service worker opens this. Relative so it works on whatever
    // origin the browser already has.
    url: event.href || "/admin",
    tag: event.kind,
  });

  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
        );
      } catch (e) {
        // 404 and 410 mean the browser threw the subscription away:
        // uninstalled, permission revoked, profile cleared. Anything
        // else might be temporary and is left alone.
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(s.endpoint);
        else console.error(`[push] send failed (${status ?? "?"}):`, e);
      }
    }),
  );

  for (const endpoint of dead) await deletePushSubscription(endpoint);
  if (dead.length > 0) {
    console.log(`[push] pruned ${dead.length} expired subscription(s)`);
  }
}
