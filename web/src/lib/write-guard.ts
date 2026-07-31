import "server-only";

/**
 * A switch that stops an environment editing real listings.
 *
 * Staging shares the production database. That was survivable while the
 * only things that could write a listing were the admin screens, which
 * one careful person uses deliberately. The advertiser portal changes
 * the shape of it: claiming, editing and approving all write to
 * directory_businesses, and saving hours replaces a listing's whole
 * week in directory_business_hours. Clicking through the portal to see
 * whether it works would edit somebody's real page.
 *
 * Named and defaulted like MC_READ_ONLY, which exists for the same
 * reason against Mission Control: unset means writes happen, so
 * production behaves normally and it is staging that has to be told.
 * The cutover checklist carries both.
 *
 * Unlike the Mission Control guard, this refuses rather than faking
 * success. That one is a background integration where a synthetic
 * response keeps a sequence running and gets logged. This one is a
 * person pressing Save, and answering "Saved" when nothing was saved is
 * worse than any error message.
 *
 * This is a stopgap. The real fix is the refreshable staging copy the
 * original plan called for, and it stays on the list.
 */
export const directoryWritesBlocked = () =>
  process.env.DIRECTORY_READ_ONLY === "1";

/** Said the same way everywhere it is said. */
export const WRITES_BLOCKED_MESSAGE =
  "This environment shares the live database, so listing changes are switched off here.";

/** For the log, so a blocked write is visible rather than silent. */
export function logBlockedWrite(what: string, detail: unknown) {
  console.log(
    `[directory read-only] blocked ${what}:\n` +
      JSON.stringify(detail, null, 2),
  );
}
