import "server-only";
import { sql } from "drizzle-orm";

/**
 * Customer quotes, and where each one is shown.
 *
 * This file used to be three placeholder quotes and nothing else. The
 * admin screen listed them, its Add and Edit buttons had no handlers,
 * and its own comment claimed it wrote to a testimonials table that did
 * not exist. So there was no way to publish a real review, and the only
 * quotes in the code were ones no customer had said. They stayed hidden
 * behind a flag, which was the right call, but it meant a genuine
 * five-star review had nowhere to go.
 *
 * Real quotes live in lbs_testimonials now, entered in the admin, and
 * every section self-hides when a placement has none. The samples below
 * survive only as a layout aid behind SHOW_SAMPLE_TESTIMONIALS=1, and
 * are never mixed with real ones: a page showing one real quote beside
 * two invented ones would be worse than showing nothing.
 *
 * Placements are strings rather than an enum because zone pages use
 * `zone:<slug>` and there are twelve of those.
 */

export type { Testimonial } from "@/lib/testimonial-types";
import type { Testimonial } from "@/lib/testimonial-types";

/** Layout samples. NOT from real customers. */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Our first mailing paid for itself in the first week. We have been on every Summerville card since.",
    author: "[Owner name]",
    detail: "Home services, Summerville",
    placements: ["home", "pricing", "zone:summerville"],
  },
  {
    quote:
      "Being the only dentist on the card is the whole point. New patients mention the postcard at the front desk.",
    author: "[Owner name]",
    detail: "Dental practice, Mount Pleasant",
    placements: ["home", "zone:mount-pleasant"],
  },
  {
    quote:
      "They designed the ad, tracked the calls, and the QR code proved it worked. Easiest marketing we do.",
    author: "[Owner name]",
    detail: "Restaurant, Daniel Island",
    placements: ["home", "pricing", "zone:daniel-island"],
  },
];

const samplesVisible = () => process.env.SHOW_SAMPLE_TESTIMONIALS === "1";

let ready = false;

async function ensureTable(force = false) {
  if (ready && !force) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_testimonials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      quote TEXT NOT NULL,
      author VARCHAR(160) NOT NULL DEFAULT '',
      detail VARCHAR(200) NOT NULL DEFAULT '',
      placements VARCHAR(500) NOT NULL DEFAULT '',
      rating TINYINT NULL,
      approved TINYINT(1) NOT NULL DEFAULT 0,
      pinned TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (approved)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  // The first version of this table had a sort_order column and nothing
  // that set it, so every row sat at zero and it did nothing but look
  // like a feature. Pinning replaced it: one checkbox, rather than
  // dragging twenty rows into an order nobody will maintain.
  try {
    await db.execute(
      sql.raw(
        "ALTER TABLE lbs_testimonials ADD COLUMN pinned TINYINT(1) NOT NULL DEFAULT 0",
      ),
    );
  } catch (e) {
    if ((e as { code?: string }).code !== "ER_DUP_FIELDNAME") throw e;
  }
  try {
    await db.execute(sql.raw("ALTER TABLE lbs_testimonials DROP COLUMN sort_order"));
  } catch (e) {
    // Never existed on a fresh install, which is the normal case.
    if ((e as { code?: string }).code !== "ER_CANT_DROP_FIELD_OR_KEY") throw e;
  }
  ready = true;
}

/**
 * How many quotes a placement shows at once.
 *
 * Three, because the strip is a three column grid and one row is what a
 * marketing page can carry: past that it reads as filler and people
 * stop reading. The rest are not wasted, they rotate.
 */
export const SHOWN_PER_PLACEMENT = 3;

const row = (r: Record<string, unknown>): Testimonial => ({
  id: Number(r.id),
  quote: String(r.quote ?? ""),
  author: String(r.author ?? ""),
  detail: String(r.detail ?? ""),
  placements: String(r.placements ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean),
  rating: r.rating === null || r.rating === undefined ? null : Number(r.rating),
  approved: Number(r.approved ?? 0) === 1,
  pinned: Number(r.pinned ?? 0) === 1,
});

/** Everything, approved or not. For the admin only. */
export async function getAllTestimonials(): Promise<Testimonial[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_testimonials ORDER BY pinned DESC, id DESC`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map(row);
  } catch (e) {
    console.error("[testimonials] list failed:", e);
    return [];
  }
}

/**
 * Approved quotes for one placement.
 *
 * A database that cannot be reached returns nothing rather than falling
 * back to the samples: an outage must not put invented quotes on a
 * customer-facing page.
 */
export async function testimonialsFor(
  placement: string,
): Promise<Testimonial[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      // Pinned first, then a fresh draw from the rest on every render.
      // Without the shuffle the newest three would be the only three
      // that ever appeared, and a twentieth review would silently push
      // the seventeen below it out of sight forever. These pages are
      // force-dynamic, so a new pick per request costs nothing.
      sql`SELECT * FROM lbs_testimonials
          WHERE approved = 1
            AND FIND_IN_SET(${placement}, REPLACE(placements, ', ', ',')) > 0
          ORDER BY pinned DESC, RAND()
          LIMIT ${sql.raw(String(SHOWN_PER_PLACEMENT))}`,
    )) as unknown as [Record<string, unknown>[]];
    const real = (rows[0] ?? []).map(row);
    if (real.length > 0) return real;
  } catch (e) {
    console.error("[testimonials] read failed:", e);
    return [];
  }

  // Only when there are no real ones at all, and only when asked for.
  return samplesVisible()
    ? TESTIMONIALS.filter((t) => t.placements.includes(placement))
    : [];
}

/** True when a placement has quotes worth rendering a section for. */
export async function hasTestimonials(placement: string): Promise<boolean> {
  return (await testimonialsFor(placement)).length > 0;
}

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * Returns the reason rather than just false.
 *
 * A save that fails with "Could not save it" tells the person at the
 * screen nothing and tells whoever has to fix it less. The database
 * message names the problem exactly, usually a column that is not there
 * yet, and it is admin-only so there is nothing sensitive in showing it.
 */
export async function saveTestimonial(
  input: Testimonial,
): Promise<{ ok: boolean; error?: string }> {
  const quote = clean(input.quote, 2000);
  if (quote.length < 10) {
    return { ok: false, error: "A quote needs to be at least a sentence." };
  }
  const placements = input.placements
    .map((p) => p.trim())
    .filter(Boolean)
    .join(",")
    .slice(0, 500);
  const rating =
    typeof input.rating === "number" && input.rating >= 1 && input.rating <= 5
      ? Math.round(input.rating)
      : null;

  try {
    await ensureTable();
    const { db } = await import("@/lib/db");

    /**
     * Runs the write, and if the schema turns out to be older than this
     * code, brings it up to date and tries once more.
     *
     * The `ready` flag makes ensureTable a no-op after the first call in
     * a process. That is the right trade for a table that never
     * changes, and the wrong one the day it does: if the ALTER that adds
     * a column failed, or the flag was set by a code path that ran
     * before the column existed, every write afterwards fails on a
     * missing field and no amount of retrying helps, because the check
     * that would fix it is skipped.
     *
     * ER_BAD_FIELD_ERROR is exactly that situation and nothing else, so
     * it is safe to answer by re-running the migration rather than by
     * giving up.
     */
    const run = async (go: () => Promise<unknown>) => {
      try {
        await go();
      } catch (e) {
        if ((e as { code?: string }).code !== "ER_BAD_FIELD_ERROR") throw e;
        console.warn("[testimonials] schema behind, re-running migration");
        await ensureTable(true);
        await go();
      }
    };

    if (input.id) {
      await run(() =>
        db.execute(
          sql`UPDATE lbs_testimonials
            SET quote = ${quote},
                author = ${clean(input.author, 160)},
                detail = ${clean(input.detail, 200)},
                placements = ${placements},
                rating = ${rating},
                approved = ${input.approved ? 1 : 0},
                pinned = ${input.pinned ? 1 : 0}
            WHERE id = ${input.id}`,
        ),
      );
    } else {
      await run(() =>
        db.execute(
          sql`INSERT INTO lbs_testimonials
              (quote, author, detail, placements, rating, approved, pinned)
            VALUES (${quote}, ${clean(input.author, 160)},
                    ${clean(input.detail, 200)}, ${placements}, ${rating},
                    ${input.approved ? 1 : 0}, ${input.pinned ? 1 : 0})`,
        ),
      );
    }
    return { ok: true };
  } catch (e) {
    console.error("[testimonials] save failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "The database refused that.",
    };
  }
}

export async function deleteTestimonial(id: number): Promise<boolean> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(sql`DELETE FROM lbs_testimonials WHERE id = ${Number(id)}`);
    return true;
  } catch (e) {
    console.error("[testimonials] delete failed:", e);
    return false;
  }
}

/** Every placement a quote can be pinned to, for the admin's picker. */
export function placementOptions(zoneSlugs: string[]): {
  value: string;
  label: string;
}[] {
  return [
    { value: "home", label: "Home page" },
    { value: "pricing", label: "Pricing page" },
    ...zoneSlugs.map((s) => ({
      value: `zone:${s}`,
      label: `Zone: ${s.replace(/-/g, " ")}`,
    })),
  ];
}
