/**
 * The MySQL error code behind a Drizzle failure.
 *
 * Drizzle wraps the driver error, so `e.code` on what you catch is
 * undefined and the real code sits on `cause`. Reading only the top
 * level makes every tolerance check fail open: an ALTER that hits a
 * column which already exists, which is the expected outcome on every
 * boot after the first, gets rethrown as if it were a real fault.
 *
 * This existed as a private copy in three files and was still written
 * wrong twice, in advertiser-business and testimonials, which took a
 * working admin screen down with "Could not save it". Once, here, so
 * the fourth copy is never written.
 */
export const mysqlErrorCode = (err: unknown): string | undefined =>
  (err as { code?: string })?.code ??
  (err as { cause?: { code?: string } })?.cause?.code ??
  (err as { cause?: { cause?: { code?: string } } })?.cause?.cause?.code;

/** True when an ALTER failed only because the work was already done. */
export const alreadyApplied = (err: unknown): boolean => {
  const code = mysqlErrorCode(err);
  return (
    code === "ER_DUP_FIELDNAME" ||
    code === "ER_CANT_DROP_FIELD_OR_KEY" ||
    code === "ER_DUP_KEYNAME"
  );
};
