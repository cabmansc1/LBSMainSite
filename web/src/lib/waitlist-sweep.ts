import "server-only";

/**
 * Telling people the category they wanted has opened up.
 *
 * The waitlist has always been able to send that email; nothing ever
 * decided to. Somebody joined, a spot came free weeks later, and the
 * only thing that would tell them was an admin remembering to open the
 * screen and press a button. A waitlist that has to be remembered is a
 * list of people who were promised something.
 *
 * A category comes free three ways, and only one of them is an event we
 * see: a refund. The other two are an advertiser taken off a card by
 * hand in Mission Control, and a checkout hold running out without a
 * payment. Neither tells us anything, so this compares rather than
 * listens, and is safe to run as often as anybody likes.
 */

export type SweepResult = {
  /** People emailed on this pass. */
  sent: number;
  failed: number;
  /** Zones skipped because we could not read them. Not the same as none. */
  unreadable: string[];
};

const EMPTY: SweepResult = { sent: 0, failed: 0, unreadable: [] };

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Notifies everyone whose category is now free in their zone.
 *
 * Fails closed everywhere it can. A zone Mission Control cannot answer
 * for is skipped rather than treated as empty, because "we could not
 * read the card" and "nothing is taken on it" are the same shape of
 * answer and only one of them means somebody should get an email.
 */
export async function sweepWaitlist(): Promise<SweepResult> {
  try {
    const { getWaitlistEntries, notifyWaitlistEntries } = await import(
      "@/lib/waitlist"
    );
    const waiting = (await getWaitlistEntries()).filter((e) => !e.notifiedAt);
    if (waiting.length === 0) return EMPTY;

    const { checkTakenForZone, getZoneMailings } = await import(
      "@/lib/mission-control"
    );
    const { isBookable } = await import("@/lib/mailings");
    const { heldCategories } = await import("@/lib/spot-holds");

    const byZone = new Map<string, typeof waiting>();
    for (const e of waiting) {
      if (!e.zoneSlug) continue;
      const list = byZone.get(e.zoneSlug) ?? [];
      list.push(e);
      byZone.set(e.zoneSlug, list);
    }

    const freed: number[] = [];
    const unreadable: string[] = [];

    for (const [zone, entries] of byZone) {
      const mailings = await getZoneMailings(zone).catch(() => null);
      if (!mailings) {
        unreadable.push(zone);
        continue;
      }
      // Already excludes cards that have mailed, so status is the only
      // question left.
      const open = mailings.filter((m) => isBookable(m.status));
      // Nothing to sell, so nobody to tell. This is the trap in the
      // check below: with no bookable card it reports nothing taken,
      // which is true and would read as every category being open.
      if (open.length === 0) continue;

      const check = await checkTakenForZone(zone).catch(() => ({
        ok: false as const,
        reason: "unreachable" as const,
      }));
      if (!check.ok) {
        unreadable.push(zone);
        continue;
      }

      const taken = new Set(check.taken.map(norm));

      // Somebody part way through paying holds the category as surely as
      // somebody who has paid. Emailing "it is free" to a person who
      // will find it gone by the time they click is worse than waiting
      // for the half hour to run out.
      for (const m of open) {
        if (!m.cardId) continue;
        const held = await heldCategories({
          kind: "card",
          cardId: m.cardId,
        }).catch(() => []);
        for (const c of held) taken.add(norm(c));
      }
      const zoneHeld = await heldCategories({ kind: "zone", zoneSlug: zone }).catch(
        () => [],
      );
      for (const c of zoneHeld) taken.add(norm(c));

      for (const e of entries) {
        if (e.category && !taken.has(norm(e.category))) freed.push(e.id);
      }
    }

    if (freed.length === 0) return { ...EMPTY, unreadable };

    // The existing sender, which marks only what it actually delivered,
    // so a bounce leaves the person on the list rather than quietly
    // counting them as told.
    const result = await notifyWaitlistEntries(freed);

    if (result.sent > 0) {
      void import("@/lib/admin-activity")
        .then((m) =>
          m.recordActivity({
            kind: "waitlist",
            title:
              result.sent === 1
                ? "A category opened up and one person was told"
                : `A category opened up and ${result.sent} people were told`,
            detail: [...new Set([...byZone.keys()])].join(", "),
            href: "/admin/waitlist",
          }),
        )
        .catch(() => {});
    }

    return { sent: result.sent, failed: result.failed, unreadable };
  } catch (e) {
    console.error("[waitlist] sweep failed:", e);
    return EMPTY;
  }
}

/**
 * Runs a sweep, but not more often than every few minutes.
 *
 * For the places that call this because somebody happened to load a
 * page. Without a limit an admin refreshing the waitlist screen would
 * ask Mission Control about every zone each time.
 */
const THROTTLE_KEY = "waitlist_sweep_at";
const THROTTLE_MINUTES = 10;

export async function sweepWaitlistIfDue(): Promise<SweepResult> {
  try {
    const { getSetting, saveSetting } = await import("@/lib/admin-data");
    const last = await getSetting<number>(THROTTLE_KEY);
    const now = Date.now();
    if (typeof last === "number" && now - last < THROTTLE_MINUTES * 60_000) {
      return EMPTY;
    }
    // Stamped before the work, so two requests arriving together do not
    // both decide they are the one to run it.
    await saveSetting(THROTTLE_KEY, now);
    return await sweepWaitlist();
  } catch (e) {
    console.error("[waitlist] throttled sweep failed:", e);
    return EMPTY;
  }
}
