import "server-only";
import { sql } from "drizzle-orm";
import { POSTCARD_PRICING, type Reach, type SpotSize } from "@/lib/pricing";
import { getLivePricing, type PriceOverrides } from "@/lib/pricing-store";

/**
 * What one advertiser has been agreed, rather than what is on the wall.
 *
 * Some accounts are on a permanent rate. Until now the only way to
 * honour one was to take the payment outside the site, which is how an
 * advertiser ends up with no order, no receipt and no card in their
 * portal, and why so much of the customer list only exists in Mission
 * Control.
 *
 * Stored in exactly the shape the admin's own price overrides use, so
 * this is a third layer on the same merge rather than a second pricing
 * system: code defaults, then the admin's list price, then this. One
 * function answers "what does this person pay", which is the only way
 * the page and the charge cannot disagree.
 *
 * A rate is per reach and spot size because that is what the price table
 * is keyed by. There is no zone dimension: a small spot costs the same
 * in every zone, and inventing a per-zone rate here would imply a
 * distinction the product does not make.
 */

export type AdvertiserRate = {
  email: string;
  /** Same shape as the admin's global overrides. Empty means list price. */
  overrides: PriceOverrides;
  note: string;
  active: boolean;
  updatedAt: string | null;
};

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_advertiser_rates (
      email VARCHAR(255) NOT NULL PRIMARY KEY,
      overrides TEXT NOT NULL,
      note VARCHAR(500) NOT NULL DEFAULT '',
      active TINYINT NOT NULL DEFAULT 1,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

/** Anything that is not a real reach, size and price is dropped. */
export function cleanOverrides(raw: unknown): PriceOverrides {
  const out: PriceOverrides = {};
  if (!raw || typeof raw !== "object") return out;
  const reaches = Object.keys(POSTCARD_PRICING) as Reach[];
  for (const reach of reaches) {
    const row = (raw as Record<string, unknown>)[reach];
    if (!row || typeof row !== "object") continue;
    const sizes = Object.keys(POSTCARD_PRICING[reach]) as SpotSize[];
    for (const size of sizes) {
      const cents = Number((row as Record<string, unknown>)[size]);
      // Zero is not "free", it is how the admin takes a size off sale,
      // and an agreed rate of nothing is a comp rather than a price. So
      // only a real positive number counts as a rate.
      if (Number.isFinite(cents) && cents > 0) {
        out[reach] ??= {};
        out[reach]![size] = Math.round(cents);
      }
    }
  }
  return out;
}

export async function getRate(email: string): Promise<AdvertiserRate | null> {
  const key = email.trim().toLowerCase();
  if (!key) return null;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT email, overrides, note, active, updated_at
          FROM lbs_advertiser_rates WHERE email = ${key} LIMIT 1`,
    )) as unknown as [Record<string, unknown>[]];
    const r = rows[0]?.[0];
    if (!r) return null;
    return {
      email: String(r.email ?? ""),
      overrides: cleanOverrides(JSON.parse(String(r.overrides ?? "{}"))),
      note: String(r.note ?? ""),
      active: Number(r.active ?? 0) === 1,
      updatedAt: r.updated_at ? String(r.updated_at) : null,
    };
  } catch (e) {
    // List price, which is the safe direction: charging somebody more
    // than agreed is a conversation, charging them less than we meant to
    // is money gone.
    console.error("[rates] read failed:", e);
    return null;
  }
}

export async function getAllRates(): Promise<AdvertiserRate[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT email, overrides, note, active, updated_at
          FROM lbs_advertiser_rates ORDER BY email`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map((r) => ({
      email: String(r.email ?? ""),
      overrides: cleanOverrides(JSON.parse(String(r.overrides ?? "{}"))),
      note: String(r.note ?? ""),
      active: Number(r.active ?? 0) === 1,
      updatedAt: r.updated_at ? String(r.updated_at) : null,
    }));
  } catch (e) {
    console.error("[rates] list failed:", e);
    return [];
  }
}

export async function saveRate(input: {
  email: string;
  overrides: PriceOverrides;
  note?: string;
  active?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "That is not a valid email address." };
  }
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const json = JSON.stringify(cleanOverrides(input.overrides));
    await db.execute(
      sql`INSERT INTO lbs_advertiser_rates (email, overrides, note, active)
          VALUES (${email}, ${json}, ${(input.note ?? "").slice(0, 500)},
                  ${input.active === false ? 0 : 1})
          ON DUPLICATE KEY UPDATE
            overrides = VALUES(overrides), note = VALUES(note),
            active = VALUES(active)`,
    );
    return { ok: true };
  } catch (e) {
    console.error("[rates] save failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

export async function deleteRate(email: string): Promise<void> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`DELETE FROM lbs_advertiser_rates WHERE email = ${email.trim().toLowerCase()}`,
    );
  } catch (e) {
    console.error("[rates] delete failed:", e);
  }
}

/**
 * The price table as one person sees it.
 *
 * Everything that shows or charges a postcard price should come through
 * here rather than getLivePricing, passing the signed-in address when
 * there is one. That is the whole design: a page that quotes a number
 * and a checkout that charges one must not be able to reach different
 * answers, and they cannot if there is only one function.
 *
 * No email, or no rate, returns exactly what getLivePricing returns.
 */
export async function getPricingFor(
  email?: string | null,
): Promise<typeof POSTCARD_PRICING> {
  const live = await getLivePricing();
  if (!email) return live;

  const rate = await getRate(email);
  if (!rate || !rate.active) return live;

  const merged = structuredClone(live);
  for (const reach of Object.keys(merged) as Reach[]) {
    for (const size of Object.keys(merged[reach]) as SpotSize[]) {
      const cents = rate.overrides[reach]?.[size];
      if (typeof cents === "number" && cents > 0) {
        merged[reach][size] = { ...merged[reach][size], priceCents: cents };
      }
    }
  }
  return merged;
}

/**
 * List price beside agreed price, for showing the difference.
 *
 * Returned rather than computed at each call site so nothing has to
 * remember which of the two layers it is looking at.
 */
export async function getPricingWithList(email?: string | null): Promise<{
  pricing: typeof POSTCARD_PRICING;
  list: typeof POSTCARD_PRICING;
  hasRate: boolean;
}> {
  const list = await getLivePricing();
  if (!email) return { pricing: list, list, hasRate: false };
  const pricing = await getPricingFor(email);
  const hasRate = (Object.keys(POSTCARD_PRICING) as Reach[]).some((reach) =>
    (Object.keys(POSTCARD_PRICING[reach]) as SpotSize[]).some(
      (size) => pricing[reach][size].priceCents !== list[reach][size].priceCents,
    ),
  );
  return { pricing, list, hasRate };
}
