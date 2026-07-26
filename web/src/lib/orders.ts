import "server-only";
import { sql } from "drizzle-orm";

/**
 * Order records for the self-serve postcard checkout.
 *
 * The webhook is the only thing that marks an order paid. The success
 * page polls this table; it never flips status itself, which is the race
 * the legacy checkout had between the success page and the webhook.
 *
 * The legacy directory_card_orders table models neighborhood cards
 * (card_id, spot_type_id, user_id), so postcard orders get their own
 * table rather than being forced into that shape.
 */

export type OrderStatus = "pending" | "paid" | "cancelled" | "refunded";

export type Order = {
  id: number;
  reference: string;
  kind: string;
  status: OrderStatus;
  businessName: string;
  email: string;
  phone: string;
  category: string;
  zoneSlug: string;
  spot: string;
  reach: string;
  amountCents: number;
  stripeSessionId: string | null;
  stripePaymentIntent: string | null;
  createdAt: string | null;
  paidAt: string | null;
};

let tableReady = false;

/**
 * Created once per process rather than per request. The legacy site ran
 * DDL on public page loads; this runs on the checkout POST path only,
 * and only the first time.
 */
export async function ensureOrdersTable() {
  if (tableReady) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reference VARCHAR(40) NOT NULL UNIQUE,
      kind VARCHAR(32) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      business_name VARCHAR(190) NOT NULL,
      email VARCHAR(255) DEFAULT '',
      phone VARCHAR(40) DEFAULT '',
      category VARCHAR(120) DEFAULT '',
      zone_slug VARCHAR(120) DEFAULT '',
      spot VARCHAR(60) DEFAULT '',
      reach VARCHAR(16) DEFAULT '',
      amount_cents INT NOT NULL DEFAULT 0,
      stripe_session_id VARCHAR(255) DEFAULT NULL,
      stripe_payment_intent VARCHAR(255) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME DEFAULT NULL,
      INDEX (stripe_session_id),
      INDEX (status),
      INDEX (zone_slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  tableReady = true;
}

/** Short human reference an advertiser can quote on the phone. */
export function newReference() {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `LBS-${rand}`;
}

export async function createPendingOrder(input: {
  reference: string;
  kind: string;
  businessName: string;
  email?: string;
  phone?: string;
  category: string;
  zoneSlug: string;
  spot: string;
  reach?: string;
  amountCents: number;
}): Promise<number | null> {
  try {
    await ensureOrdersTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`INSERT INTO lbs_orders
          (reference, kind, status, business_name, email, phone, category,
           zone_slug, spot, reach, amount_cents)
          VALUES (${input.reference}, ${input.kind}, 'pending',
                  ${input.businessName}, ${input.email ?? ""}, ${input.phone ?? ""},
                  ${input.category}, ${input.zoneSlug}, ${input.spot},
                  ${input.reach ?? ""}, ${input.amountCents})`,
    );
    const rows = (await db.execute(
      sql`SELECT id FROM lbs_orders WHERE reference = ${input.reference} LIMIT 1`,
    )) as unknown as [{ id: number }[]];
    return rows[0]?.[0]?.id ?? null;
  } catch (e) {
    // Bookkeeping must never block a customer's payment. Stripe metadata
    // and the Mission Control push remain durable records.
    console.error("[orders] could not record pending order:", e);
    return null;
  }
}

export async function attachSession(reference: string, sessionId: string) {
  try {
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`UPDATE lbs_orders SET stripe_session_id = ${sessionId}
          WHERE reference = ${reference}`,
    );
  } catch (e) {
    console.error("[orders] could not attach session:", e);
  }
}

/**
 * Idempotent: the WHERE clause means a replayed webhook cannot double
 * apply, and a cancelled or refunded order is never resurrected.
 */
export async function markPaid(opts: {
  sessionId: string;
  paymentIntent?: string;
  reference?: string;
  /** What Stripe actually collected. A promotion code makes this lower
   *  than the price the order was created at, and the receipt, the admin
   *  and the books all have to show what was really paid. */
  amountCents?: number;
}): Promise<boolean> {
  try {
    await ensureOrdersTable();
    const { db } = await import("@/lib/db");
    const result = (await db.execute(
      sql`UPDATE lbs_orders
          SET status = 'paid', paid_at = NOW(),
              stripe_payment_intent = ${opts.paymentIntent ?? null},
              stripe_session_id = ${opts.sessionId},
              amount_cents = COALESCE(${opts.amountCents ?? null}, amount_cents)
          WHERE status = 'pending'
            AND (stripe_session_id = ${opts.sessionId}
                 OR reference = ${opts.reference ?? ""})`,
    )) as unknown as [{ affectedRows?: number }];
    return (result[0]?.affectedRows ?? 0) > 0;
  } catch (e) {
    console.error("[orders] could not mark paid:", e);
    return false;
  }
}

export async function markRefunded(paymentIntent: string) {
  try {
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`UPDATE lbs_orders SET status = 'refunded'
          WHERE stripe_payment_intent = ${paymentIntent} AND status = 'paid'`,
    );
  } catch (e) {
    console.error("[orders] could not mark refunded:", e);
  }
}

const row = (r: Record<string, unknown>): Order => ({
  id: Number(r.id),
  reference: String(r.reference ?? ""),
  kind: String(r.kind ?? ""),
  status: String(r.status ?? "pending") as OrderStatus,
  businessName: String(r.business_name ?? ""),
  email: String(r.email ?? ""),
  phone: String(r.phone ?? ""),
  category: String(r.category ?? ""),
  zoneSlug: String(r.zone_slug ?? ""),
  spot: String(r.spot ?? ""),
  reach: String(r.reach ?? ""),
  amountCents: Number(r.amount_cents ?? 0),
  stripeSessionId: (r.stripe_session_id as string) ?? null,
  stripePaymentIntent: (r.stripe_payment_intent as string) ?? null,
  createdAt: r.created_at ? String(r.created_at) : null,
  paidAt: r.paid_at ? String(r.paid_at) : null,
});

export async function getOrderBySession(sessionId: string): Promise<Order | null> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_orders WHERE stripe_session_id = ${sessionId} LIMIT 1`,
    )) as unknown as [Record<string, unknown>[]];
    const r = rows[0]?.[0];
    return r ? row(r) : null;
  } catch {
    return null;
  }
}

export async function getPostcardOrders(): Promise<Order[]> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_orders ORDER BY id DESC LIMIT 200`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map(row);
  } catch (e) {
    console.error("[orders] list failed:", e);
    return [];
  }
}

export async function getOrdersForEmail(email: string): Promise<Order[]> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_orders WHERE email = ${email} ORDER BY id DESC LIMIT 50`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map(row);
  } catch {
    return [];
  }
}
