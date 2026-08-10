import "server-only";
import { sql } from "drizzle-orm";
import { publishedEvents } from "@/lib/events";
import { SITE_TZ, formatPrice, type LocalEvent } from "@/lib/events-types";
import { listActivePlaces } from "@/lib/places";
import { saveStory } from "@/lib/stories";

/**
 * The weekend roundup, built from the calendar.
 *
 * The piece that turns a calendar into a publication. Events on their
 * own are a utility people visit when they already want something;
 * "here is your weekend" is a thing they read, share and expect on a
 * day of the week. It is also the only recurring inventory here worth
 * selling — presented by somebody, every Thursday, forever.
 *
 * It writes a draft and stops. Every roundup worth reading has a line
 * at the top that only a person who lives here can write, and a
 * generator that published itself would produce a page nobody edited
 * and everybody could tell had not been edited.
 */

/** Grouped under the market people would say they live in. */
type Group = { slug: string; name: string; events: LocalEvent[] };

export type RoundupWindow = {
  /** Inclusive start and exclusive end, as instants. */
  from: Date;
  to: Date;
  /** "August 14–16" for the headline. */
  span: string;
  /** Part of the slug, so a rerun finds the same draft. */
  stamp: string;
};

const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: SITE_TZ });

/** What day of the week it is here, 0 = Sunday. */
const weekdayHere = (d: Date) =>
  [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ].indexOf(d.toLocaleDateString("en-US", { weekday: "long", timeZone: SITE_TZ }));

/**
 * Friday morning to Monday morning, in Lowcountry time.
 *
 * Built by walking forward from midnight rather than by adding hours,
 * because a weekend containing a daylight saving change is 71 or 73
 * hours long and the arithmetic version quietly loses the last event on
 * the Sunday twice a year.
 *
 * Run on a Thursday it gives you tomorrow. Run on a Saturday it gives
 * you the weekend you are standing in, which is what somebody pressing
 * the button on a Saturday means.
 */
export function weekendWindow(ref: Date = new Date()): RoundupWindow {
  const dow = weekdayHere(ref);
  // Friday is 5. Saturday and Sunday look back at the Friday just gone.
  const toFriday = dow === 6 ? -1 : dow === 0 ? -2 : 5 - dow;

  const startOfDayHere = (d: Date) => {
    const iso = ymd(d);
    // Midnight here is the earliest instant that still reads as this
    // date in this zone; stepping back from noon avoids the DST hole.
    const noon = new Date(`${iso}T12:00:00Z`);
    for (let h = 0; h < 24; h += 1) {
      const candidate = new Date(noon.getTime() - (12 - h) * 3600_000);
      if (ymd(candidate) === iso) return candidate;
    }
    return noon;
  };

  const friday = startOfDayHere(
    new Date(ref.getTime() + toFriday * 86400_000),
  );
  const monday = startOfDayHere(new Date(friday.getTime() + 3.5 * 86400_000));
  const sunday = new Date(monday.getTime() - 3600_000);

  const month = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", timeZone: SITE_TZ });
  const dayNum = (d: Date) =>
    d.toLocaleDateString("en-US", { day: "numeric", timeZone: SITE_TZ });

  const span =
    month(friday) === month(sunday)
      ? `${month(friday)} ${dayNum(friday)}–${dayNum(sunday)}`
      : `${month(friday)} ${dayNum(friday)} – ${month(sunday)} ${dayNum(sunday)}`;

  return { from: friday, to: monday, span, stamp: ymd(friday) };
}

/**
 * Rolls a place up to the market above it.
 *
 * An event tagged West Ashley belongs in the Charleston section, not in
 * a section of its own — twelve headings with one event under each is
 * not a roundup, it is the same list with more scrolling.
 */
async function marketIndex(): Promise<Map<string, { slug: string; name: string }>> {
  const places = await listActivePlaces().catch(() => []);
  const bySlug = new Map(places.map((p) => [p.slug, p]));
  const out = new Map<string, { slug: string; name: string }>();

  for (const p of places) {
    let cur = p;
    // Walk up until a market, or give up at the region.
    for (let i = 0; i < 6 && cur.kind !== "market" && cur.parentSlug; i += 1) {
      const up = bySlug.get(cur.parentSlug);
      if (!up) break;
      cur = up;
    }
    if (cur.kind === "market") out.set(p.slug, { slug: cur.slug, name: cur.name });
  }
  return out;
}

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export type RoundupDraft = {
  title: string;
  dek: string;
  bodyHtml: string;
  places: string[];
  count: number;
  groups: { name: string; count: number }[];
};

/**
 * Builds the words. Kept apart from saving so a preview costs nothing.
 */
export async function buildRoundup(
  window: RoundupWindow = weekendWindow(),
): Promise<RoundupDraft> {
  // Asking for a generous page and trimming here, rather than filtering
  // in SQL: the window is a few days and the calendar is small enough
  // that one query beats a second set of query parameters to maintain.
  const upcoming = await publishedEvents({ limit: 100 });
  const inWindow = upcoming.filter((e) => {
    const start = new Date(e.startsAt).getTime();
    const end = e.endsAt ? new Date(e.endsAt).getTime() : start;
    // A festival running Thursday to Sunday is on this weekend even
    // though it did not start on it.
    return start < window.to.getTime() && end >= window.from.getTime();
  });

  const markets = await marketIndex();
  const groups = new Map<string, Group>();
  for (const e of inWindow) {
    const m = markets.get(e.placeSlug) ?? {
      slug: "elsewhere",
      name: "Elsewhere in the Lowcountry",
    };
    const g = groups.get(m.slug) ?? { slug: m.slug, name: m.name, events: [] };
    g.events.push(e);
    groups.set(m.slug, g);
  }

  // Biggest section first: a reader scanning for their own town finds
  // it faster in a list that starts where most things are happening.
  const ordered = [...groups.values()].sort(
    (a, b) => b.events.length - a.events.length,
  );

  const parts: string[] = [];
  for (const g of ordered) {
    parts.push(`<h2>${esc(g.name)}</h2>`);
    // Picks lead their section, everything else in time order. A
    // roundup is read from the top, so the order is the recommendation.
    const byPick = g.events.sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        a.startsAt.localeCompare(b.startsAt),
    );
    for (const e of byPick) {
      const facts = [
        e.multiDay && e.endDayLabel
          ? `${e.dayLabel} through ${e.endDayLabel}`
          : `${e.dayLabel}${e.timeLabel ? `, ${e.timeLabel}` : ""}`,
        e.venueName,
        formatPrice(e.priceText),
      ]
        .filter(Boolean)
        .join(" · ");

      parts.push(
        `<h3><a href="/events/${esc(e.slug)}">${esc(e.title)}</a></h3>` +
          `<p><em>${esc(facts)}</em></p>` +
          (e.summary ? `<p>${esc(e.summary)}</p>` : ""),
      );
    }
  }

  if (!ordered.length) {
    parts.push(
      "<p>Nothing is on the calendar for this weekend yet. Add a few " +
        "events and run this again.</p>",
    );
  }

  const count = inWindow.length;
  const title = count
    ? `${count} Things To Do Around Charleston This Weekend: ${window.span}`
    : `This Weekend in the Lowcountry: ${window.span}`;

  return {
    title,
    dek: count
      ? `Festivals, markets, live music and more across the Lowcountry, ${window.span}.`
      : `What is on across the Lowcountry, ${window.span}.`,
    bodyHtml: parts.join("\n"),
    // Tagged with every market that has something in it, so the piece
    // lands on those hubs the day they exist.
    places: ordered.map((g) => g.slug).filter((s) => s !== "elsewhere"),
    count,
    groups: ordered.map((g) => ({ name: g.name, count: g.events.length })),
  };
}

async function draftWithSlug(
  slug: string,
): Promise<{ id: number; status: string } | null> {
  const { db } = await import("@/lib/db");
  const rows = (await db.execute(
    sql`SELECT id, status FROM lbs_stories WHERE slug = ${slug} LIMIT 1`,
  )) as unknown as [{ id: number; status: string }[]];
  const r = rows[0]?.[0];
  return r ? { id: Number(r.id), status: String(r.status) } : null;
}

export type RoundupResult =
  | {
      ok: true;
      id: number;
      slug: string;
      created: boolean;
      count: number;
      groups: { name: string; count: number }[];
    }
  | { ok: false; error: string };

/**
 * Writes the draft, or refreshes the one already there.
 *
 * The slug carries the weekend's Friday, which makes running this twice
 * on a Thursday harmless: the second run finds the first and rewrites
 * it. Once it has been published it is left alone — by then somebody
 * has put their own opening on it, and regenerating would throw that
 * away to add the two events that came in overnight.
 */
export async function generateRoundup(
  ref: Date = new Date(),
): Promise<RoundupResult> {
  try {
    const window = weekendWindow(ref);
    const slug = `things-to-do-lowcountry-${window.stamp}`;
    const draft = await buildRoundup(window);
    const found = await draftWithSlug(slug);

    if (found && found.status !== "draft") {
      return {
        ok: false,
        error: "This weekend's roundup is already out. Edit it directly.",
      };
    }

    const saved = await saveStory(found?.id ?? null, {
      title: draft.title,
      kind: "guide",
      dek: draft.dek,
      bodyHtml: draft.bodyHtml,
      heroMediaId: null,
      status: "draft",
      publishedAt: "",
      featuredRank: null,
      sponsored: false,
      sponsorBusinessId: null,
      metaTitle: "",
      metaDescription: draft.dek,
      places: draft.places,
      businesses: [],
    });
    if (!saved.ok) return { ok: false, error: saved.error };

    // saveStory slugs from the headline, which changes with the count.
    // Pinning it to the weekend is what makes a rerun find this row
    // rather than pile up a second draft beside it.
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`UPDATE lbs_stories SET slug = ${slug} WHERE id = ${saved.id}`,
    );

    return {
      ok: true,
      id: saved.id,
      slug,
      created: !found,
      count: draft.count,
      groups: draft.groups,
    };
  } catch (e) {
    console.error("[roundup] failed:", e);
    return { ok: false, error: "That did not build." };
  }
}
