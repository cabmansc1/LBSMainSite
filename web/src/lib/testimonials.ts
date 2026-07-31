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

async function ensureTable() {
  if (ready) return;
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
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (approved)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

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
});

/** Everything, approved or not. For the admin only. */
export async function getAllTestimonials(): Promise<Testimonial[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_testimonials ORDER BY sort_order, id DESC`,
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
      sql`SELECT * FROM lbs_testimonials
          WHERE approved = 1
            AND FIND_IN_SET(${placement}, REPLACE(placements, ', ', ',')) > 0
          ORDER BY sort_order, id DESC
          LIMIT 6`,
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

export async function saveTestimonial(input: Testimonial): Promise<boolean> {
  const quote = clean(input.quote, 2000);
  if (quote.length < 10) return false;
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
    if (input.id) {
      await db.execute(
        sql`UPDATE lbs_testimonials
            SET quote = ${quote},
                author = ${clean(input.author, 160)},
                detail = ${clean(input.detail, 200)},
                placements = ${placements},
                rating = ${rating},
                approved = ${input.approved ? 1 : 0}
            WHERE id = ${input.id}`,
      );
    } else {
      await db.execute(
        sql`INSERT INTO lbs_testimonials
              (quote, author, detail, placements, rating, approved)
            VALUES (${quote}, ${clean(input.author, 160)},
                    ${clean(input.detail, 200)}, ${placements}, ${rating},
                    ${input.approved ? 1 : 0})`,
      );
    }
    return true;
  } catch (e) {
    console.error("[testimonials] save failed:", e);
    return false;
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
