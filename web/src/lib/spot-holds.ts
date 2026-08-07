import "server-only";
import { sql } from "drizzle-orm";

/**
 * A category reserved while somebody is paying for it.
 *
 * Checkout asked Mission Control whether a category was still free,
 * liked the answer, and then handed the buyer off to Stripe without
 * writing that answer down anywhere. Nothing reserved the category
 * between the question and the payment, so two businesses in the same
 * trade could both pass the check, both pay, and both be told they had
 * bought exclusivity on one card. The clash surfaced after the money had
 * settled, which meant a refund, a fee we do not get back, and breaking
 * the one promise the product is sold on.
 *
 * The window is wider than two simultaneous buyers makes it sound. The
 * Mission Control read is cached for sixty seconds, so even the first
 * answer can be a minute stale, and a buyer can sit on Stripe's page for
 * twenty minutes while somebody is placed on that card by hand.
 *
 * So a claim is written before the buyer leaves for Stripe, and the
 * category counts as taken until it expires. Thirty minutes, because
 * that is what the checkout page has always promised: "spot held for 30
 * minutes" was describing a hold that did not exist.
 *
 * Deliberately not released when payment succeeds. The advertiser is
 * pushed to Mission Control fire-and-forget, so for a few seconds after
 * the webhook the category is genuinely sold and Mission Control does
 * not know it yet. Letting the claim run out on its own covers that gap;
 * releasing it early would reopen exactly the hole this closes.
 */

/** How long a buyer gets to finish paying before the category reopens. */
export const HOLD_MINUTES = 30;

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_checkout_holds (
      hold_key VARCHAR(190) NOT NULL PRIMARY KEY,
      reference VARCHAR(40) NOT NULL,
      card_id VARCHAR(64) NOT NULL DEFAULT '',
      zone_slug VARCHAR(120) NOT NULL DEFAULT '',
      category VARCHAR(120) NOT NULL DEFAULT '',
      email VARCHAR(255) NOT NULL DEFAULT '',
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (expires_at),
      INDEX (reference),
      INDEX (card_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  // Added after the table shipped, so CREATE TABLE IF NOT EXISTS does
  // nothing for an install that already has it. Duplicate column is the
  // expected outcome on every run after the first.
  //
  // `id` is what orders two claims made at the same instant. Area is a
  // shared budget rather than a unique key, so unlike the category it
  // cannot be settled by the primary key alone, and something has to
  // decide which of two simultaneous buyers got the last of the space.
  for (const alter of [
    sql`ALTER TABLE lbs_checkout_holds ADD COLUMN sq_in INT NOT NULL DEFAULT 0`,
    sql`ALTER TABLE lbs_checkout_holds ADD COLUMN id INT NOT NULL AUTO_INCREMENT UNIQUE FIRST`,
  ]) {
    try {
      await db.execute(alter);
    } catch (e) {
      const { alreadyApplied } = await import("@/lib/db-errors");
      if (!alreadyApplied(e)) {
        console.error("[holds] could not add column:", e);
      }
    }
  }
  ready = true;
}

/**
 * What a claim is against.
 *
 * Exclusivity is per card, so the card id is the scope wherever there is
 * one. A postcard bought without picking a card can only mean the zone's
 * one open card, and a neighborhood card is its own thing with its own
 * slug, so each gets a prefix rather than sharing a namespace where a
 * zone called "summerville" could collide with a card of the same name.
 */
export type HoldScope =
  | { kind: "card"; cardId: string }
  | { kind: "zone"; zoneSlug: string }
  | { kind: "neighborhood-card"; cardSlug: string };

const scopeKey = (s: HoldScope): string =>
  s.kind === "card"
    ? `card:${s.cardId}`
    : s.kind === "zone"
      ? `zone:${s.zoneSlug}`
      : `nc:${s.cardSlug}`;

/** Categories are typed by people, so they are compared with the case
 *  and the spacing taken out. The display form is stored alongside. */
const categoryKey = (category: string) =>
  category.trim().toLowerCase().replace(/\s+/g, " ");

const holdKey = (scope: HoldScope, category: string) =>
  `${scopeKey(scope)}|${categoryKey(category)}`;

export type ClaimResult =
  | { ok: true }
  /** Somebody else is mid-payment for this category on this card. */
  | { ok: false; reason: "held" }
  /** The space is gone: sold, or being paid for by somebody ahead. */
  | { ok: false; reason: "full" }
  /** The claim could not be written. Fails closed: no sale. */
  | { ok: false; reason: "unavailable" };

/**
 * Reserves a category, or reports that somebody else already has.
 *
 * One statement does the deciding, which is what makes this safe. Two
 * requests arriving together both run the same insert; the primary key
 * lets exactly one of them create the row, and the loser's ON DUPLICATE
 * branch only overwrites an expired claim. Reading the row back and
 * comparing the reference is how each caller learns which it was.
 *
 * A read-then-write would not do: between the read and the write is
 * precisely the gap this exists to close.
 *
 * Two ordering rules make the single statement correct, and both are
 * easy to undo by tidying the list:
 *
 * `expires_at` is assigned last, because MySQL applies the assignments
 * in order and each condition reads the column's current value.
 * Refreshing the expiry first would make every later test see the new
 * time and read a live claim as expired.
 *
 * `email` is never assigned here at all, for the same reason: every
 * condition tests it, so overwriting it partway through would decide
 * the remaining assignments against a value this request supplied. The
 * cost is that taking over an expired claim leaves the previous buyer's
 * address on the row, which is only ever read by a person wondering who
 * is holding something.
 */
export async function claimCategory(input: {
  scope: HoldScope;
  category: string;
  reference: string;
  email?: string;
  zoneSlug?: string;
  /** Area this spot size consumes on the card. */
  sqIn?: number;
  /**
   * Area still free on the card according to Mission Control, before any
   * claim is counted. Undefined skips the capacity test, which is what a
   * card whose numbers we could not read has to do: refusing every sale
   * because Mission Control is quiet is worse than the race.
   */
  freeSqIn?: number;
}): Promise<ClaimResult> {
  const category = input.category.trim();
  if (!category) return { ok: true };

  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const key = holdKey(input.scope, category);
    const cardId =
      input.scope.kind === "card"
        ? input.scope.cardId
        : input.scope.kind === "neighborhood-card"
          ? input.scope.cardSlug
          : "";
    const minutes = sql.raw(String(HOLD_MINUTES));

    // Mine already, or nobody's any more.
    //
    // The email test is what stops a buyer being locked out by their own
    // claim. Backing out of Stripe to change the spot size and clicking
    // again produces a second checkout with a new reference, and without
    // this they would be told somebody else was buying their category —
    // which would be them, thirty seconds ago.
    const takeover = sql`(expires_at <= NOW() OR (email <> '' AND email = ${input.email ?? ""}))`;

    const sqIn = Math.max(0, Math.round(input.sqIn ?? 0));

    await db.execute(
      sql`INSERT INTO lbs_checkout_holds
            (hold_key, reference, card_id, zone_slug, category, email, sq_in, expires_at)
          VALUES (${key}, ${input.reference}, ${cardId}, ${input.zoneSlug ?? ""},
                  ${category}, ${input.email ?? ""}, ${sqIn},
                  DATE_ADD(NOW(), INTERVAL ${minutes} MINUTE))
          ON DUPLICATE KEY UPDATE
            reference  = IF(${takeover}, VALUES(reference), reference),
            card_id    = IF(${takeover}, VALUES(card_id), card_id),
            zone_slug  = IF(${takeover}, VALUES(zone_slug), zone_slug),
            category   = IF(${takeover}, VALUES(category), category),
            sq_in      = IF(${takeover}, VALUES(sq_in), sq_in),
            expires_at = IF(${takeover}, VALUES(expires_at), expires_at)`,
    );

    const rows = (await db.execute(
      sql`SELECT reference FROM lbs_checkout_holds WHERE hold_key = ${key} LIMIT 1`,
    )) as unknown as [{ reference: string }[]];

    if (String(rows[0]?.[0]?.reference ?? "") !== input.reference) {
      return { ok: false, reason: "held" };
    }

    // The category is ours. Now: is there room for it?
    //
    // Area cannot be settled by the primary key the way the category is,
    // because it is a shared budget rather than a name somebody owns. So
    // the claim is written first and judged afterwards, against every
    // live claim on the card in the order they were made.
    //
    // That ordering is what makes it safe without a transaction. Two
    // requests that miss each other's rows on the way in both see both
    // rows on the way out, and both walk the same list in the same
    // order, so they cannot both decide they fit. A request that inserts
    // before another and reads before it exists still wins, because it
    // is earlier in the order the other one reads too.
    if (input.freeSqIn === undefined || sqIn <= 0) return { ok: true };

    const ahead = (await db.execute(
      sql`SELECT id, sq_in, reference FROM lbs_checkout_holds
          WHERE card_id = ${cardId} AND expires_at > NOW()
          ORDER BY id`,
    )) as unknown as [{ id: number; sq_in: number; reference: string }[]];

    let used = 0;
    for (const row of ahead[0] ?? []) {
      used += Number(row.sq_in ?? 0);
      if (String(row.reference) === input.reference) break;
    }
    if (used <= input.freeSqIn) return { ok: true };

    // Somebody ahead took the last of it. Give the category straight
    // back rather than sitting on it for half an hour over a sale that
    // is not happening.
    await releaseHold(input.reference);
    return { ok: false, reason: "full" };
  } catch (e) {
    // Fails closed. An unwritable claim means we cannot promise
    // exclusivity, and taking the money anyway is the failure this file
    // exists to prevent.
    console.error("[holds] could not claim:", e);
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * Gives a category back.
 *
 * Called when checkout falls over after the claim was written. Not
 * called on a completed payment: see the note at the top of the file.
 */
export async function releaseHold(reference: string): Promise<void> {
  if (!reference) return;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`DELETE FROM lbs_checkout_holds WHERE reference = ${reference}`,
    );
  } catch (e) {
    // Not worth failing anything over: it expires on its own.
    console.error("[holds] could not release:", e);
  }
}

/**
 * Categories currently mid-payment, so the picker can grey them out.
 *
 * Shown as taken rather than as held. To a buyer the difference is
 * nothing: either way they cannot have it, and "somebody is buying this
 * right now" invites them to sit and refresh.
 */
export async function heldCategories(scope: HoldScope): Promise<string[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const prefix = `${scopeKey(scope)}|`;
    const rows = (await db.execute(
      sql`SELECT category FROM lbs_checkout_holds
          WHERE hold_key LIKE ${`${prefix}%`} AND expires_at > NOW()`,
    )) as unknown as [{ category: string }[]];
    return (rows[0] ?? []).map((r) => String(r.category)).filter(Boolean);
  } catch (e) {
    // A category shown as available that is merely being paid for is the
    // pre-existing behaviour, and the claim on the way through checkout
    // still catches it. Blanking the picker over this would be worse.
    console.error("[holds] lookup failed:", e);
    return [];
  }
}

/** Expired rows, cleared on a schedule nobody has to remember. */
export async function purgeExpiredHolds(): Promise<number> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const res = (await db.execute(
      sql`DELETE FROM lbs_checkout_holds WHERE expires_at <= DATE_SUB(NOW(), INTERVAL 1 DAY)`,
    )) as unknown as [{ affectedRows?: number }];
    return Number(res[0]?.affectedRows ?? 0);
  } catch (e) {
    console.error("[holds] purge failed:", e);
    return 0;
  }
}
