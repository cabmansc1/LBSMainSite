import "server-only";
import { sql } from "drizzle-orm";
import { alreadyApplied } from "@/lib/db-errors";

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
  /**
   * Mission Control card id. A zone is not a card, so without this
   * there is no way to ask afterwards whether a paid advertiser landed
   * where they bought. Empty on orders taken before this was recorded.
   */
  cardId: string;
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
      card_id VARCHAR(64) DEFAULT '',
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

  // CREATE TABLE IF NOT EXISTS does nothing to a table that already
  // exists, so a column added later needs its own step. Duplicate
  // column is the expected outcome on every run after the first.
  try {
    await db.execute(
      sql`ALTER TABLE lbs_orders ADD COLUMN card_id VARCHAR(64) DEFAULT '' AFTER zone_slug`,
    );
  } catch (e) {
    // Drizzle wraps the driver error, so the MySQL code is on `cause`
    // rather than on the error itself. Reading only the top level meant
    // the expected outcome, the column already existing, logged a full
    // stack trace on every boot and buried the failures that matter.
    if (!alreadyApplied(e)) {
      console.error("[orders] could not add card_id column:", e);
    }
  }

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
  cardId?: string;
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
           zone_slug, card_id, spot, reach, amount_cents)
          VALUES (${input.reference}, ${input.kind}, 'pending',
                  ${input.businessName}, ${input.email ?? ""}, ${input.phone ?? ""},
                  ${input.category}, ${input.zoneSlug}, ${input.cardId ?? ""},
                  ${input.spot}, ${input.reach ?? ""}, ${input.amountCents})`,
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
  cardId: String(r.card_id ?? ""),
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

/**
 * The order behind a Stripe payment.
 *
 * Refund handling needs it: the money knows its payment intent and
 * nothing else, and what an admin has to be told is which business, on
 * which card, still holds which category.
 */
export async function getOrderByPaymentIntent(
  paymentIntent: string,
): Promise<Order | null> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_orders WHERE stripe_payment_intent = ${paymentIntent} LIMIT 1`,
    )) as unknown as [Record<string, unknown>[]];
    const found = rows[0]?.[0];
    return found ? row(found) : null;
  } catch (e) {
    console.error("[orders] lookup by payment intent failed:", e);
    return null;
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

/**
 * Cards this address has a settled order against, by Mission Control id.
 *
 * For the payment chip an advertiser sees. That chip reads Mission
 * Control, and Mission Control only learns a card was paid for when our
 * Stripe webhook tells it. A delivery that fails leaves the money taken,
 * this table saying paid, and the advertiser looking at "Unpaid" on a
 * card they have settled — which is the one thing on their page they
 * would ring about.
 *
 * Refunded is not settled, so the status test is exact rather than
 * "anything but pending".
 *
 * Empty on failure. This is a second opinion on somebody else's answer,
 * and a second opinion that cannot be reached should change nothing.
 */
export async function paidCardIdsForEmail(email: string): Promise<Set<string>> {
  const out = new Set<string>();
  if (!email.trim()) return out;
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT DISTINCT card_id FROM lbs_orders
          WHERE email = ${email} AND status = 'paid' AND card_id <> ''`,
    )) as unknown as [{ card_id: string }[]];
    for (const r of rows[0] ?? []) {
      const id = String(r.card_id ?? "").trim();
      if (id) out.add(id);
    }
  } catch (e) {
    console.error("[orders] paid card lookup failed:", e);
  }
  return out;
}

/**
 * Settled orders that name a card, for reconciling against Mission
 * Control. Orders with no card id predate that column and cannot be
 * compared against anything.
 */
export async function getPaidOrdersWithCards(days = 60): Promise<
  {
    reference: string;
    businessName: string;
    email: string;
    cardId: string;
    amountCents: number;
    paidAt: string | null;
  }[]
> {
  try {
    const { db } = await import("@/lib/db");
    const window = sql.raw(String(Math.max(1, Math.min(3650, Math.round(days)))));
    const rows = (await db.execute(
      sql`SELECT reference, business_name, email, card_id, amount_cents, paid_at
          FROM lbs_orders
          WHERE status = 'paid' AND card_id <> ''
            AND paid_at >= DATE_SUB(NOW(), INTERVAL ${window} DAY)
          ORDER BY paid_at DESC`,
    )) as unknown as [
      {
        reference: string;
        business_name: string;
        email: string;
        card_id: string;
        amount_cents: number;
        paid_at: string | Date | null;
      }[],
    ];
    return (rows[0] ?? []).map((r) => ({
      reference: String(r.reference ?? ""),
      businessName: String(r.business_name ?? ""),
      email: String(r.email ?? ""),
      cardId: String(r.card_id ?? ""),
      amountCents: Number(r.amount_cents ?? 0),
      paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
    }));
  } catch (e) {
    console.error("[orders] paid-with-card lookup failed:", e);
    return [];
  }
}

/**
 * Removes orders outright.
 *
 * Deliberately not exposed anywhere a customer can reach, and not part
 * of any automatic cleanup. An order is the record that someone paid,
 * so the only good reason to delete one is that it was never a real
 * sale: test purchases, mostly.
 *
 * Refunding happens in Stripe and is reflected here by the webhook.
 * Deleting a paid order does not refund it, which is why the admin
 * confirms with the amount in front of it.
 */
export async function deleteOrders(ids: number[]): Promise<number> {
  const clean = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (clean.length === 0) return 0;
  try {
    await ensureOrdersTable();
    const { db } = await import("@/lib/db");
    const result = (await db.execute(
      sql`DELETE FROM lbs_orders WHERE id IN (${sql.join(
        clean.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )) as unknown as [{ affectedRows?: number }];
    return result[0]?.affectedRows ?? 0;
  } catch (e) {
    console.error("[orders] could not delete:", e);
    return 0;
  }
}
