import "server-only";
import { getSetting } from "@/lib/admin-data";
import { fillZoneNumbers, type ZoneNumbers } from "@/lib/zone-content";
import {
  MAILING_AREAS,
  ZONES,
  mailingAreasFrom,
  zonesWith,
  type MailingArea,
  type Zone,
  type ZoneFactOverrides,
} from "@/lib/zones";

/**
 * Live zone facts. Mailbox counts, populations and which zones share a
 * card came from zones.ts and could only be changed by deploying code,
 * which is how "12,000 households" outlived being true by a couple of
 * years. They are editable from the admin now; the code values remain
 * the fallback, so an empty settings row leaves the site as it ships.
 *
 * Same shape as pricing-store, deliberately: one settings key, one
 * merge, code as the floor.
 */
export const ZONE_FACTS_KEY = "zone_facts";

/** A sane ceiling. Nothing in the Lowcountry is a million mailboxes. */
export const MAX_MAILBOXES = 1_000_000;

export async function getZoneFactOverrides(): Promise<ZoneFactOverrides | null> {
  return getSetting<ZoneFactOverrides>(ZONE_FACTS_KEY);
}

/** Every zone, with saved counts applied. */
export async function getLiveZones(): Promise<Zone[]> {
  try {
    return zonesWith(await getZoneFactOverrides());
  } catch (e) {
    // A settings read that fails must not take a zone page down with
    // it. The published numbers are the ones in code either way.
    console.error("[zones] could not read saved facts:", e);
    return ZONES;
  }
}

export async function getLiveZone(slug: string): Promise<Zone | undefined> {
  return (await getLiveZones()).find((z) => z.slug === slug);
}

/**
 * The numbers a zone's copy is allowed to quote.
 *
 * cardMailboxes falls back to the zone's own count, because a zone that
 * mails alone is the whole card.
 */
export function zoneNumbersFor(zone: Zone, area?: MailingArea): ZoneNumbers {
  return {
    mailboxes: zone.mailboxes,
    cardMailboxes: area?.mailboxes ?? zone.mailboxes,
  };
}

/** Every card, with saved counts and pairings applied. */
export async function getLiveMailingAreas(): Promise<MailingArea[]> {
  try {
    // Notes arrive ready to print: the count in the sentence is the
    // count of the card it is describing, resolved here rather than in
    // each of the three places that show it.
    return mailingAreasFrom(await getLiveZones()).map((area) => ({
      ...area,
      note: area.note
        ? fillZoneNumbers(area.note, {
            mailboxes: area.mailboxes,
            cardMailboxes: area.mailboxes,
          })
        : undefined,
    }));
  } catch (e) {
    console.error("[zones] could not build live areas:", e);
    return MAILING_AREAS;
  }
}

/** The card a zone mails on, resolved against saved pairings. */
export async function getLiveMailingAreaFor(
  slug: string,
): Promise<MailingArea | undefined> {
  return (await getLiveMailingAreas()).find((a) => a.zoneSlugs.includes(slug));
}
