import "server-only";
import { sql } from "drizzle-orm";

/**
 * Opening hours for a directory listing.
 *
 * The table is legacy and admin/manage_directory.php has always written
 * it, but nothing in this app ever read it: DirectoryBusiness declares
 * an `hours` field and only the sample data ever filled it in, so the
 * public page and its openingHoursSpecification markup were empty for
 * every real listing. Both halves live here now, so the advertiser
 * editing their hours and the page rendering them cannot disagree.
 *
 * Conventions are the legacy ones on purpose, because both admins write
 * the same rows: day_of_week is 0 for Sunday through 6 for Saturday,
 * times are "HH:MM" as an <input type="time"> produces them, and saving
 * replaces the whole week rather than patching a day.
 */

export type DayHours = {
  /** 0 = Sunday, 6 = Saturday. */
  day: number;
  open: string;
  close: string;
  closed: boolean;
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** "HH:MM", the only shape a time input emits and the only one stored. */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Tolerates the "HH:MM:SS" a TIME column would hand back. */
const trimSeconds = (v: string) => (/^\d{2}:\d{2}:\d{2}$/.test(v) ? v.slice(0, 5) : v);

export function isValidTime(v: string): boolean {
  return TIME.test(trimSeconds(v));
}

/** "09:00" -> "9:00 AM". Display only; storage stays 24-hour. */
export function displayTime(raw: string): string {
  const value = trimSeconds(raw);
  if (!TIME.test(value)) return value;
  const [h, m] = value.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * The week as the public page wants it.
 *
 * "Closed" is spelled out rather than omitted, because a day missing
 * from a list of opening hours reads as an oversight. The business page
 * filters closed days back out of its schema.org markup.
 */
export function formatHours(days: DayHours[]): { day: string; text: string }[] {
  return [...days]
    .filter((d) => d.day >= 0 && d.day <= 6)
    .sort((a, b) => a.day - b.day)
    .map((d) => ({
      day: DAY_NAMES[d.day],
      text:
        d.closed || !isValidTime(d.open) || !isValidTime(d.close)
          ? "Closed"
          : `${displayTime(d.open)} – ${displayTime(d.close)}`,
    }));
}

const row = (r: Record<string, unknown>): DayHours => ({
  day: Number(r.day_of_week),
  open: r.open_time ? trimSeconds(String(r.open_time)) : "",
  close: r.close_time ? trimSeconds(String(r.close_time)) : "",
  closed: r.is_closed === 1 || r.is_closed === true || r.is_closed === "1",
});

/**
 * Hours for a page of listings at once.
 *
 * Batched because the directory loads up to 200 rows and a query per
 * listing would be 200 round trips to a database that is not
 * necessarily in the same datacenter.
 */
export async function getHoursFor(
  businessIds: number[],
): Promise<Map<number, DayHours[]>> {
  const out = new Map<number, DayHours[]>();
  const ids = businessIds.filter((id) => Number.isFinite(id));
  if (ids.length === 0) return out;
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT business_id, day_of_week, open_time, close_time, is_closed
          FROM directory_business_hours
          WHERE business_id IN (${sql.join(
            ids.map((i) => sql`${i}`),
            sql`, `,
          )})
          ORDER BY business_id, day_of_week`,
    )) as unknown as [Record<string, unknown>[]];
    for (const r of rows[0] ?? []) {
      const id = Number(r.business_id);
      const list = out.get(id) ?? [];
      list.push(row(r));
      out.set(id, list);
    }
  } catch (e) {
    // A listing with no hours and a table we could not read must not
    // take the directory down with them.
    console.error("[hours] lookup failed:", e);
  }
  return out;
}

export async function getHours(businessId: number): Promise<DayHours[]> {
  return (await getHoursFor([businessId])).get(businessId) ?? [];
}

/** A full week, with anything missing from storage counted as closed. */
export function weekFrom(days: DayHours[]): DayHours[] {
  const byDay = new Map(days.map((d) => [d.day, d]));
  return DAY_NAMES.map(
    (_, day) => byDay.get(day) ?? { day, open: "", close: "", closed: true },
  );
}

/**
 * Replaces the week.
 *
 * Delete-then-insert, matching admin/manage_directory.php exactly. A
 * per-day upsert would be gentler, but the two admins write the same
 * table and the legacy one has no unique key on (business_id, day) to
 * upsert against, so following it is what keeps the rows consistent.
 *
 * Both statements are single trips and the insert is one multi-row
 * statement, which keeps the window where a listing has no hours at all
 * as short as it can be without a transaction the legacy code never had.
 */
export async function saveHours(
  businessId: number,
  week: DayHours[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const clean: DayHours[] = [];
  for (const d of week) {
    const day = Number(d.day);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    const closed = !!d.closed;
    const open = trimSeconds(String(d.open ?? "").trim());
    const close = trimSeconds(String(d.close ?? "").trim());

    if (!closed) {
      if (!isValidTime(open) || !isValidTime(close)) {
        return {
          ok: false,
          error: `Set an opening and closing time for ${DAY_NAMES[day]}, or mark it closed.`,
        };
      }
      if (open >= close) {
        // Lexical comparison is enough on zero-padded 24-hour times.
        return {
          ok: false,
          error: `${DAY_NAMES[day]} closes before it opens. Overnight hours are not supported yet.`,
        };
      }
    }
    clean.push({ day, open: closed ? "" : open, close: closed ? "" : close, closed });
  }

  try {
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`DELETE FROM directory_business_hours WHERE business_id = ${businessId}`,
    );
    if (clean.length > 0) {
      const values = clean.map(
        (d) =>
          sql`(${businessId}, ${d.day}, ${d.closed ? null : d.open},
               ${d.closed ? null : d.close}, ${d.closed ? 1 : 0})`,
      );
      await db.execute(
        sql`INSERT INTO directory_business_hours
              (business_id, day_of_week, open_time, close_time, is_closed)
            VALUES ${sql.join(values, sql`, `)}`,
      );
    }
    return { ok: true };
  } catch (e) {
    console.error("[hours] save failed:", e);
    return { ok: false, error: "Your hours could not be saved just now." };
  }
}
