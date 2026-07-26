import "server-only";

/**
 * Per-card sales copy: the sentence that tells a buyer what this card
 * actually is.
 *
 * Mission Control names a card ("Nexton/Cane Bay") and lists its routes,
 * which answers where. It does not answer why that card is worth being
 * on, and its notes field is internal, holding cost per route and
 * whatever the team jotted down, so it can never be published verbatim.
 *
 * The description is therefore written deliberately, here, and stored per
 * MC card id in lbs_settings, the same way orientation is. It belongs in
 * Mission Control eventually, as a field it owns and marks as public;
 * until MC has one, this is the safe place for it.
 */

const DESCRIPTION_KEY = "card_descriptions";

/** Long enough to tell the story, short enough to stay a summary. */
export const CARD_DESCRIPTION_MAX = 400;

export async function getCardDescriptions(): Promise<Record<string, string>> {
  const { getSetting } = await import("@/lib/admin-data");
  return (await getSetting<Record<string, string>>(DESCRIPTION_KEY)) ?? {};
}

export async function getCardDescription(
  cardId: string,
): Promise<string | undefined> {
  const all = await getCardDescriptions();
  const text = all[cardId]?.trim();
  return text || undefined;
}

export async function setCardDescription(cardId: string, description: string) {
  const { getSetting, saveSetting } = await import("@/lib/admin-data");
  const all =
    (await getSetting<Record<string, string>>(DESCRIPTION_KEY)) ?? {};
  const text = description.trim().slice(0, CARD_DESCRIPTION_MAX);
  if (text) all[cardId] = text;
  else delete all[cardId];
  await saveSetting(DESCRIPTION_KEY, all);
}
