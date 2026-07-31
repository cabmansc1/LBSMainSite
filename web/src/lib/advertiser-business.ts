import "server-only";
import { sql } from "drizzle-orm";

/**
 * An advertiser's own business details: who they are, how to reach the
 * business, and where it is.
 *
 * Kept against the account rather than the directory listing, for two
 * reasons. Plenty of advertisers buy a postcard spot and never list in
 * the directory, and until now there was nowhere to record their
 * address at all. And the address we keep for records is not always the
 * one a business wants published: a trades business run from home is
 * the obvious case.
 *
 * The public listing stays the public listing. Nothing here is shown on
 * a directory page unless the advertiser puts it there.
 *
 * Table is created on demand, matching how the rest of the lbs_ tables
 * in this app come into being. There are no migrations in this repo.
 */

export type AdvertiserBusiness = {
  businessName: string;
  businessPhone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
};

export const EMPTY_BUSINESS: AdvertiserBusiness = {
  businessName: "",
  businessPhone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
};

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_advertiser_business (
      user_id INT PRIMARY KEY,
      email VARCHAR(255) NOT NULL DEFAULT '',
      business_name VARCHAR(255) NOT NULL DEFAULT '',
      business_phone VARCHAR(40) NOT NULL DEFAULT '',
      address VARCHAR(255) NOT NULL DEFAULT '',
      city VARCHAR(120) NOT NULL DEFAULT '',
      state VARCHAR(40) NOT NULL DEFAULT '',
      zip_code VARCHAR(20) NOT NULL DEFAULT '',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      INDEX (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * What we already know about their business, for a first visit.
 *
 * An empty form asking an advertiser to type a business name we have
 * had since they paid us is a form most people close. The order is the
 * better source for the name and phone, because that is what they gave
 * at checkout; the directory listing is the only source we have for an
 * address.
 */
async function guessFrom(
  email: string,
): Promise<AdvertiserBusiness> {
  const guess = { ...EMPTY_BUSINESS };
  const { db } = await import("@/lib/db");

  try {
    const rows = (await db.execute(
      sql`SELECT business_name, phone FROM lbs_orders
          WHERE email = ${email} AND business_name <> ''
          ORDER BY id DESC LIMIT 1`,
    )) as unknown as [{ business_name: string; phone: string }[]];
    const o = rows[0]?.[0];
    if (o) {
      guess.businessName = o.business_name ?? "";
      guess.businessPhone = o.phone ?? "";
    }
  } catch (e) {
    console.error("[advertiser-business] order prefill failed:", e);
  }

  try {
    const rows = (await db.execute(
      sql`SELECT business_name, phone, address, city, state, zip_code
          FROM directory_businesses
          WHERE email = ${email}
          ORDER BY id DESC LIMIT 1`,
    )) as unknown as [
      {
        business_name: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        zip_code: string;
      }[],
    ];
    const b = rows[0]?.[0];
    if (b) {
      guess.businessName ||= b.business_name ?? "";
      guess.businessPhone ||= b.phone ?? "";
      guess.address = b.address ?? "";
      guess.city = b.city ?? "";
      guess.state = b.state ?? "";
      guess.zipCode = b.zip_code ?? "";
    }
  } catch (e) {
    console.error("[advertiser-business] listing prefill failed:", e);
  }

  return guess;
}

/**
 * Their saved details, or our best guess when they have saved none.
 *
 * The guess is never written. Prefilling a form is a suggestion; saving
 * it behind their back would make our guess look like something they
 * told us, and the difference matters on an address.
 */
export async function getAdvertiserBusiness(
  userId: number,
  email: string,
): Promise<{ business: AdvertiserBusiness; saved: boolean }> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_advertiser_business WHERE user_id = ${userId} LIMIT 1`,
    )) as unknown as [Record<string, unknown>[]];
    const r = rows[0]?.[0];
    if (r) {
      return {
        saved: true,
        business: {
          businessName: String(r.business_name ?? ""),
          businessPhone: String(r.business_phone ?? ""),
          address: String(r.address ?? ""),
          city: String(r.city ?? ""),
          state: String(r.state ?? ""),
          zipCode: String(r.zip_code ?? ""),
        },
      };
    }
    return { saved: false, business: await guessFrom(email) };
  } catch (e) {
    console.error("[advertiser-business] read failed:", e);
    return { saved: false, business: EMPTY_BUSINESS };
  }
}

export async function saveAdvertiserBusiness(
  userId: number,
  email: string,
  input: Partial<AdvertiserBusiness>,
): Promise<boolean> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const b = {
      businessName: str(input.businessName, 255),
      businessPhone: str(input.businessPhone, 40),
      address: str(input.address, 255),
      city: str(input.city, 120),
      state: str(input.state, 40),
      zipCode: str(input.zipCode, 20),
    };
    await db.execute(
      sql`INSERT INTO lbs_advertiser_business
            (user_id, email, business_name, business_phone, address, city, state, zip_code)
          VALUES (${userId}, ${email}, ${b.businessName}, ${b.businessPhone},
                  ${b.address}, ${b.city}, ${b.state}, ${b.zipCode})
          ON DUPLICATE KEY UPDATE
            email = VALUES(email),
            business_name = VALUES(business_name),
            business_phone = VALUES(business_phone),
            address = VALUES(address),
            city = VALUES(city),
            state = VALUES(state),
            zip_code = VALUES(zip_code)`,
    );
    return true;
  } catch (e) {
    console.error("[advertiser-business] save failed:", e);
    return false;
  }
}

/** One line, for a receipt or an admin table. Empty when we hold nothing. */
export const formatBusinessAddress = (b: AdvertiserBusiness): string =>
  [b.address, b.city, [b.state, b.zipCode].filter(Boolean).join(" ")]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
