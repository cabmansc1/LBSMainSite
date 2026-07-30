/**
 * Replaces every real contact detail in a staging database copy.
 *
 * A copy of production is the right way to get a testable staging
 * environment, and it arrives carrying every customer's email address
 * and phone number. That matters more now than it used to, because the
 * app sends email on its own: an advertiser edit alerts us, an approval
 * emails the advertiser, a signup emails both. Point staging at a copy,
 * set RESEND_API_KEY so the email paths can be tested, click through a
 * few listings, and real customers get mail from a test.
 *
 * The read-only flag was accidentally protecting against that. Once
 * staging can write, this is what protects against it instead.
 *
 * DESTRUCTIVE, and deliberately awkward to run. It defaults to a dry
 * run, and to touch anything it needs SCRUB_ALLOW to name the same
 * database as DB_NAME. Naming it twice is the point: the way this goes
 * wrong is somebody running it with production credentials still in
 * their shell, and a flag alone would not stop that.
 *
 *   DB_HOST=... DB_USER=... DB_PASS=... DB_NAME=lbs_staging \
 *     node scripts/scrub-staging.mjs                    # dry run
 *
 *   DB_HOST=... DB_NAME=lbs_staging SCRUB_ALLOW=lbs_staging \
 *     node scripts/scrub-staging.mjs --write --keep you@example.com
 *
 * Options:
 *   --write          actually change data. Without it, nothing is written.
 *   --keep <email>   leave this address alone, so you can still sign in.
 *                    Repeatable.
 */
import mysql from "mysql2/promise";

const argv = process.argv.slice(2);
const write = argv.includes("--write");

/** Addresses to leave intact, usually your own admin login. */
const keep = argv.reduce((acc, a, i) => {
  if (a === "--keep" && argv[i + 1]) acc.push(argv[i + 1].toLowerCase());
  return acc;
}, []);

const need = (n) => {
  const v = process.env[n];
  if (!v) {
    console.error(`Missing ${n}.`);
    process.exit(2);
  }
  return v;
};

const database = need("DB_NAME");

if (write && process.env.SCRUB_ALLOW !== database) {
  console.error(
    `Refusing to write.\n` +
      `  DB_NAME is "${database}".\n` +
      `  Set SCRUB_ALLOW to exactly that to confirm you mean this database.\n\n` +
      `If "${database}" is production, you do not want this script at all.`,
  );
  process.exit(3);
}

const conn = await mysql.createConnection({
  host: need("DB_HOST"),
  port: Number(process.env.DB_PORT ?? 3306),
  user: need("DB_USER"),
  password: process.env.DB_PASS ?? "",
  database,
});

/**
 * Every column holding something that could reach a person.
 *
 * Emails become addresses at .invalid, which is reserved by RFC 2606
 * and can never resolve, so a misconfigured send fails at DNS rather
 * than arriving somewhere real. Rows are keyed by id so a listing and
 * its owner stay distinguishable, which matters when the thing being
 * tested is who owns what.
 */
const TARGETS = [
  { table: "directory_users", email: "email", phone: "phone" },
  { table: "directory_businesses", email: "email", phone: "phone" },
  { table: "directory_business_inquiries", email: "email", phone: "phone" },
  { table: "directory_signups", email: "email", phone: "phone" },
  { table: "directory_newsletter_subscribers", email: "email" },
  { table: "leads", email: "email", phone: "phone" },
  { table: "lbs_orders", email: "email", phone: "phone" },
  { table: "lbs_waitlist", email: "email" },
  { table: "lbs_artwork", email: "email" },
  { table: "lbs_directory_subscriptions", email: "email" },
];

const PHONE = "(843) 555-0000";

const keepClause = keep.length
  ? ` AND LOWER(COALESCE(email, '')) NOT IN (${keep.map(() => "?").join(", ")})`
  : "";

console.log(
  write
    ? `Scrubbing ${database}. ${keep.length ? `Keeping: ${keep.join(", ")}` : "Keeping nothing."}`
    : `DRY RUN against ${database}. Nothing will be changed.`,
);
console.log();

let total = 0;

for (const t of TARGETS) {
  try {
    // Count first, so a dry run reports the same number the real run
    // would change rather than a guess at it.
    const [rows] = await conn.execute(
      `SELECT COUNT(*) n FROM ${t.table}
        WHERE COALESCE(email, '') <> ''
              AND email NOT LIKE '%@staging.invalid'${keepClause}`,
      keep,
    );
    const n = Number(rows[0]?.n ?? 0);
    total += n;
    console.log(`${t.table.padEnd(36)} ${n}`);

    if (write && n > 0) {
      const sets = [`${t.email} = CONCAT('user', id, '@staging.invalid')`];
      if (t.phone) sets.push(`${t.phone} = '${PHONE}'`);
      await conn.execute(
        `UPDATE ${t.table} SET ${sets.join(", ")}
          WHERE COALESCE(email, '') <> ''
                AND email NOT LIKE '%@staging.invalid'${keepClause}`,
        keep,
      );
    }
  } catch (e) {
    // A table this install does not have is normal, not a failure.
    console.log(`${t.table.padEnd(36)} (skipped: ${e.code ?? e.message})`);
  }
}

console.log();
if (write) {
  console.log(`Scrubbed ${total} rows. No address in this database can receive mail.`);
  console.log(
    "Stripe customer records are untouched and still hold real emails. Use test keys on staging.",
  );
} else {
  console.log(`${total} rows would be changed. Re-run with --write and SCRUB_ALLOW set.`);
}

await conn.end();
