import { getPublishedEvent } from "@/lib/events";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * The calendar file behind "Add to calendar".
 *
 * The most useful button an event page has and the one nobody builds,
 * because a date in somebody's own calendar is worth more to them than
 * a page they have to remember to come back to. It is also the only
 * part of an event that survives them closing the tab.
 *
 * Handwritten rather than pulled from a library: the format is a dozen
 * lines, and the parts that actually break interoperability are the
 * escaping and the folding below, which a dependency would not save us
 * from having to get right anyway.
 */

/** Commas, semicolons and backslashes are separators in this format. */
const esc = (s: string) =>
  String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

const utc = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const day = (iso: string) =>
  new Date(iso).toISOString().slice(0, 10).replace(/-/g, "");

/**
 * RFC 5545 caps a line at 75 octets, continued by a leading space.
 * Outlook is the one that actually enforces it, and a long description
 * is exactly what tips a line over.
 */
const fold = (line: string) => {
  if (line.length <= 74) return line;
  const parts = [line.slice(0, 74)];
  let rest = line.slice(74);
  while (rest.length > 73) {
    parts.push(` ${rest.slice(0, 73)}`);
    rest = rest.slice(73);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const e = await getPublishedEvent(slug);
  if (!e) return new Response("Not found", { status: 404 });

  const url = `${SITE_URL}/events/${e.slug}`;
  const where = [e.venueName, e.address].filter(Boolean).join(", ");

  // An all-day entry is a date with no time, and its end is exclusive:
  // a one-day thing ends the following morning or calendars draw it
  // across two days.
  const startLine = e.allDay
    ? `DTSTART;VALUE=DATE:${day(e.startsAt)}`
    : `DTSTART:${utc(e.startsAt)}`;
  const endIso =
    e.endsAt ||
    new Date(new Date(e.startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString();
  const endLine = e.allDay
    ? `DTEND;VALUE=DATE:${day(
        new Date(new Date(endIso).getTime() + 86400000).toISOString(),
      )}`
    : `DTEND:${utc(endIso)}`;

  const description = [e.summary, e.priceText, url].filter(Boolean).join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${esc(SITE_NAME)}//Events//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:event-${e.id}@lowcountrybusinessspotlight.com`,
    `DTSTAMP:${utc(new Date().toISOString())}`,
    startLine,
    endLine,
    `SUMMARY:${esc(e.title)}`,
    where ? `LOCATION:${esc(where)}` : "",
    description ? `DESCRIPTION:${esc(description)}` : "",
    `URL:${esc(url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .map(fold);

  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${e.slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
