import "server-only";
import { sql } from "drizzle-orm";
import { saveEvent } from "@/lib/events";
import type { EventCategory } from "@/lib/events-types";

/**
 * Reading somebody else's calendar.
 *
 * Every source here publishes a feed on purpose — an iCal or a REST
 * endpoint the site itself links to — so this is not scraping, and the
 * shape it returns is a contract rather than a guess about markup that
 * will change next redesign.
 *
 * Nothing imported is ever published. It lands pending, exactly like a
 * public submission, because a town's idea of an event includes the
 * Board of Zoning Appeals and ours does not. The queue is the point:
 * this removes the hunting, not the judgement.
 */

export type FeedKind = "ical" | "tribe";

export type FeedSource = {
  /** Stored in external_source. Never change one after a run. */
  key: string;
  label: string;
  kind: FeedKind;
  url: string;
  /** Everything from this feed belongs here unless told otherwise. */
  placeSlug: string;
  category: EventCategory;
  hint: string;
};

export const EVENT_SOURCES: FeedSource[] = [
  {
    key: "summerville-special",
    label: "Summerville — approved special events",
    kind: "ical",
    url: "https://www.summervillesc.gov/common/modules/iCalendar/iCalendar.aspx?catID=29&feed=calendar",
    placeSlug: "summerville",
    category: "community",
    hint: "The permit list. Things confirmed months before anyone promotes them.",
  },
  {
    key: "moncks-corner",
    label: "Moncks Corner — town events",
    kind: "tribe",
    url: "https://monckscornersc.gov/wp-json/tribe/events/v1/events?per_page=50",
    placeSlug: "moncks-corner",
    category: "community",
    hint: "Includes the Thursday farmers market, week by week.",
  },
  {
    key: "mount-pleasant",
    label: "Mount Pleasant — main calendar",
    kind: "ical",
    url: "https://www.tompsc.com/common/modules/iCalendar/iCalendar.aspx?catID=14&feed=calendar",
    placeSlug: "mount-pleasant",
    category: "community",
    hint: "Currently all commission and council business, so expect nothing until the town posts a real event. Kept because it costs nothing to keep asking.",
  },
];

export type Candidate = {
  externalId: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  venueName: string;
  address: string;
  summary: string;
  url: string;
};

/* ---------- shared cleaning ---------- */

const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8217;|&rsquo;/gi, "’")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();

/**
 * Government business, which is not what a resident means by an event.
 *
 * Every town calendar carries far more Planning Commission than
 * festival — the Mount Pleasant feed is currently nothing else — and
 * letting those into the queue means reading thirty rows to reject
 * twenty-eight. Dropped at the door rather than filed pending, and
 * counted in the report so a feed that turns out to be *only* meetings
 * is visible rather than silently empty.
 *
 * Deliberately blunt. A false positive here costs one event nobody
 * imported; a false negative costs trust in the queue.
 */
const MEETING =
  /\b(commission|committee|town council|city council|council meeting|board of|public hearing|workshop|board meeting|planning board|zoning|budget (?:hearing|workshop)|caucus|executive session)\b/i;

export const looksLikeMeeting = (title: string) => MEETING.test(title);

/**
 * Titles arrive carrying the sending system's own bookkeeping.
 *
 * Summerville marks unapproved permits "*PENDING*" in the name. That is
 * a status in their workflow, not part of what the thing is called.
 */
const cleanTitle = (s: string) =>
  s
    .replace(/\*+\s*(pending|cancelled|canceled|tentative)\s*\*+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * A wall-clock time in a named zone, as a real instant.
 *
 * iCal gives "19:00 in America/New_York" and the answer differs by an
 * hour either side of a daylight saving change, so the offset has to be
 * asked for on the actual date rather than assumed. Intl already knows
 * the rules; this measures how far the guessed instant drifts when read
 * back in the zone, and corrects by that much.
 */
function fromZoned(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  tz = "America/New_York",
): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const seen = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(new Date(guess))
    .reduce<Record<string, number>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = Number(p.value);
      return acc;
    }, {});
  // Hour 24 is how this formatter says midnight.
  const back = Date.UTC(
    seen.year,
    seen.month - 1,
    seen.day,
    seen.hour % 24,
    seen.minute,
  );
  return new Date(guess - (back - guess));
}

/* ---------- iCal ---------- */

/** Continuation lines begin with a space or a tab and belong to the one above. */
const unfold = (text: string) =>
  text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");

const unescapeIcal = (s: string) =>
  s
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");

function icalDate(value: string, params: string): Date | null {
  const v = value.trim();
  // 20270402 — a date with no time.
  if (/^\d{8}$/.test(v)) {
    return fromZoned(
      Number(v.slice(0, 4)),
      Number(v.slice(4, 6)),
      Number(v.slice(6, 8)),
      0,
      0,
    );
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return null;
  if (m[7]) return new Date(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 11)}:${v.slice(11, 13)}:${v.slice(13, 15)}Z`);
  const tz = params.match(/TZID=([^;:]+)/)?.[1] ?? "America/New_York";
  return fromZoned(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    tz,
  );
}

export function parseIcal(text: string): Candidate[] {
  const out: Candidate[] = [];
  for (const block of unfold(text).split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0] ?? "";
    const props = new Map<string, { params: string; value: string }>();
    for (const line of body.split("\n")) {
      const colon = line.indexOf(":");
      if (colon < 1) continue;
      const left = line.slice(0, colon);
      const semi = left.indexOf(";");
      const name = (semi === -1 ? left : left.slice(0, semi)).toUpperCase();
      props.set(name, {
        params: semi === -1 ? "" : left.slice(semi),
        value: line.slice(colon + 1),
      });
    }

    const start = props.get("DTSTART");
    const title = cleanTitle(unescapeIcal(props.get("SUMMARY")?.value ?? ""));
    const uid = (props.get("UID")?.value ?? "").trim();
    if (!start || !title || !uid) continue;
    const startsAt = icalDate(start.value, start.params);
    if (!startsAt || isNaN(startsAt.getTime())) continue;

    const end = props.get("DTEND");
    const endsAt = end ? icalDate(end.value, end.params) : null;

    // "<p>Short Central Pavilion</p> -   Summerville SC 29483" — a venue
    // and an address run together with a dash, and the venue arrives as
    // HTML because somebody typed it into a rich text box.
    const rawLocation = unescapeIcal(props.get("LOCATION")?.value ?? "");
    const [venuePart, ...addressParts] = rawLocation.split(/\s+-\s+/);
    const description = unescapeIcal(props.get("DESCRIPTION")?.value ?? "");

    out.push({
      externalId: uid,
      title,
      startsAt,
      endsAt: endsAt && !isNaN(endsAt.getTime()) ? endsAt : null,
      allDay: /VALUE=DATE(?!-)/.test(start.params),
      venueName: stripTags(venuePart ?? "").slice(0, 200),
      address: stripTags(addressParts.join(" - ")).slice(0, 300),
      // The real event page is usually the last link in the description;
      // the URL property points back at the feed itself.
      summary: stripTags(description.replace(/https?:\/\/\S+/g, "")).slice(0, 600),
      url: description.match(/https?:\/\/\S+/)?.[0]?.slice(0, 500) ?? "",
    });
  }
  return out;
}

/* ---------- The Events Calendar (WordPress) ---------- */

type TribeEvent = {
  id?: number;
  title?: string;
  start_date?: string;
  end_date?: string;
  all_day?: boolean;
  url?: string;
  website?: string;
  description?: string;
  venue?: { venue?: string; address?: string; city?: string };
};

/** Dates arrive as "2026-08-13 15:00:00", local to the site's timezone. */
function tribeDate(s: string | undefined): Date | null {
  const m = String(s ?? "").match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/,
  );
  if (!m) return null;
  return fromZoned(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  );
}

export function parseTribe(json: unknown): Candidate[] {
  const events = (json as { events?: TribeEvent[] })?.events ?? [];
  const out: Candidate[] = [];
  for (const e of events) {
    const startsAt = tribeDate(e.start_date);
    const title = cleanTitle(stripTags(e.title ?? ""));
    if (!startsAt || !title || !e.id) continue;
    const endsAt = tribeDate(e.end_date);
    out.push({
      externalId: String(e.id),
      title: title.slice(0, 200),
      startsAt,
      endsAt,
      allDay: e.all_day === true,
      venueName: stripTags(e.venue?.venue ?? "").slice(0, 200),
      address: stripTags(
        [e.venue?.address, e.venue?.city].filter(Boolean).join(", "),
      ).slice(0, 300),
      summary: stripTags(e.description ?? "").slice(0, 600),
      url: (e.website || e.url || "").slice(0, 500),
    });
  }
  return out;
}

/* ---------- the run ---------- */

export type ImportReport = {
  source: string;
  label: string;
  found: number;
  added: number;
  updated: number;
  skipped: number;
  /** Dropped as council business before they reached the queue. */
  ignored: number;
  error?: string;
};

/**
 * Anything already decided is left alone.
 *
 * A published event may have been retitled, given a photograph and had
 * its category fixed by hand, and a rejected one was rejected for a
 * reason. Re-importing over either would undo work and, worse, put
 * something back that was deliberately turned down.
 */
const DECIDED = new Set(["published", "rejected", "archived"]);

async function existing(
  source: string,
  externalId: string,
): Promise<{ id: number; status: string } | null> {
  const { db } = await import("@/lib/db");
  const rows = (await db.execute(
    sql`SELECT id, status FROM lbs_events
         WHERE external_source = ${source} AND external_id = ${externalId}
         LIMIT 1`,
  )) as unknown as [{ id: number; status: string }[]];
  const r = rows[0]?.[0];
  return r ? { id: Number(r.id), status: String(r.status) } : null;
}

export async function importSource(source: FeedSource): Promise<ImportReport> {
  const report: ImportReport = {
    source: source.key,
    label: source.label,
    found: 0,
    added: 0,
    updated: 0,
    skipped: 0,
    ignored: 0,
  };

  let candidates: Candidate[] = [];
  try {
    const res = await fetch(source.url, {
      headers: {
        // Says who we are and what we want. Some feeds answer 403 to a
        // request with no Accept at all, and identifying ourselves
        // honestly is the only version of this worth doing — a site
        // that does not want to be read by a server is entitled to say
        // so, and dressing up as a browser to get past that is not a
        // thing this will do.
        "User-Agent":
          "LowcountryBusinessSpotlight/1.0 (+https://www.lowcountrybusinessspotlight.com)",
        Accept:
          source.kind === "ical"
            ? "text/calendar, text/plain;q=0.9, */*;q=0.5"
            : "application/json, */*;q=0.5",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      // 403 from these is almost always a firewall judging the server's
      // address rather than anything about the request, and it reads as
      // "broken importer" unless it says otherwise.
      throw new Error(
        res.status === 403 || res.status === 429
          ? `refused (${res.status}). Their firewall is blocking our server, not the other way round — ask them to allow it, or add these by hand.`
          : `${res.status} from the feed`,
      );
    }
    candidates =
      source.kind === "ical"
        ? parseIcal(await res.text())
        : parseTribe(await res.json());
  } catch (e) {
    report.error = e instanceof Error ? e.message : "That feed did not answer.";
    return report;
  }

  // A calendar of things that already happened is noise in the queue.
  const now = Date.now();
  const dated = candidates.filter(
    (c) => (c.endsAt ?? c.startsAt).getTime() >= now,
  );
  const upcoming = dated.filter((c) => !looksLikeMeeting(c.title));
  report.ignored = dated.length - upcoming.length;
  report.found = upcoming.length;

  for (const c of upcoming) {
    try {
      const found = await existing(source.key, c.externalId);
      if (found && DECIDED.has(found.status)) {
        report.skipped += 1;
        continue;
      }

      const saved = await saveEvent(found?.id ?? null, {
        title: c.title,
        summary: c.summary,
        bodyHtml: "",
        heroMediaId: null,
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt?.toISOString() ?? "",
        allDay: c.allDay,
        venueName: c.venueName,
        address: c.address,
        placeSlug: source.placeSlug,
        businessId: null,
        category: source.category,
        url: c.url,
        ticketUrl: "",
        priceText: "",
        status: "pending",
        featured: false,
        source: "imported",
        submittedEmail: "",
      });
      if (!saved.ok) {
        report.skipped += 1;
        continue;
      }

      // Stamped after the write rather than threaded through the main
      // save path, which nothing else needs to know about feeds.
      const { db } = await import("@/lib/db");
      await db.execute(
        sql`UPDATE lbs_events
               SET external_source = ${source.key},
                   external_id = ${c.externalId},
                   source_url = ${c.url || source.url}
             WHERE id = ${saved.id}`,
      );
      if (found) report.updated += 1;
      else report.added += 1;
    } catch (e) {
      console.error(`[event-import] ${source.key} row failed:`, e);
      report.skipped += 1;
    }
  }

  return report;
}

export async function importAll(keys?: string[]): Promise<ImportReport[]> {
  const wanted = keys?.length
    ? EVENT_SOURCES.filter((s) => keys.includes(s.key))
    : EVENT_SOURCES;
  const out: ImportReport[] = [];
  // One at a time. Three feeds is not worth the concurrency, and a
  // stranger's server being hit in parallel by us is a bad look for a
  // job that runs unattended.
  for (const s of wanted) out.push(await importSource(s));
  return out;
}
