/**
 * Copies one MySQL database into another.
 *
 * Exists because the alternative is mysqldump, and getting mysqldump
 * onto a Windows machine is three downloads and a PATH edit before you
 * find out whether the connection works. This needs Node, which the
 * scrub script needs anyway, and two connection URLs, which Railway
 * hands you as MYSQL_PUBLIC_URL on each service.
 *
 * It is not a backup tool and does not pretend to be one. Use the
 * platform's own backups for that. This is for standing up a staging
 * copy, where the source is live and must not be touched.
 *
 * The source is only ever read: SHOW, SELECT, nothing else. Every write
 * goes to the target, and it refuses outright if the two point at the
 * same database, which is the mistake that would matter.
 *
 * Tables are streamed rather than read whole, because one of these
 * tables holds print artwork as LONGBLOB and reading it into an array
 * would be the last thing the process did.
 *
 *   node scripts/clone-database.mjs \
 *     --from "mysql://root:pass@host:1234/railway" \
 *     --to   "mysql://root:pass@otherhost:5678/railway" \
 *     --target-db lbs_staging
 *
 * --target-db is worth using. Railway names every database `railway`,
 * and two databases with the same name make the scrub script's safety
 * check meaningless.
 */
import { createConnection as createRaw } from "mysql2";
import mysql from "mysql2/promise";

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const from = arg("--from");
const to = arg("--to");
const targetDb = arg("--target-db");

if (!from || !to) {
  console.error(
    "Usage:\n" +
      '  node scripts/clone-database.mjs --from "mysql://..." --to "mysql://..." --target-db lbs_staging\n\n' +
      "Both URLs come from Railway: open the MySQL service, Variables tab, MYSQL_PUBLIC_URL.",
  );
  process.exit(2);
}

function parse(url, label) {
  let u;
  try {
    u = new URL(url);
  } catch {
    u = null;
  }
  // The protocol is checked as well as the parse, because "root:pass@host"
  // parses cleanly as a URL with the scheme "root:" and then fails much
  // later as a connection refused to localhost, which tells you nothing
  // about the actual mistake.
  if (!u || u.protocol !== "mysql:") {
    console.error(
      `The --${label} value does not look like a MySQL URL.\n\n` +
        `  Got:      ${url}\n` +
        `  Expected: mysql://user:password@host:port/database\n\n` +
        "Copy MYSQL_PUBLIC_URL from the Railway service's Variables tab, exactly, including the mysql:// at the front.",
    );
    process.exit(2);
  }
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "") || "railway",
  };
}

const src = parse(from, "from");
const dst = parse(to, "to");
if (targetDb) dst.database = targetDb;

// The mistake that would actually hurt: copying a database over itself.
if (src.host === dst.host && src.port === dst.port && src.database === dst.database) {
  console.error(
    "Refusing to run: --from and --to point at the same database.\n" +
      `  ${src.host}:${src.port}/${src.database}\n\n` +
      "Give --target-db a different name, or check you copied two different services' URLs.",
  );
  process.exit(3);
}

console.log(`From:  ${src.host}:${src.port}/${src.database}   (read only)`);
console.log(`To:    ${dst.host}:${dst.port}/${dst.database}`);
console.log();

/**
 * Connection failures are the common case here and a stack trace is a
 * bad way to learn about them. The likely causes are all guessable from
 * the error code.
 */
async function connect(config, label) {
  try {
    return await mysql.createConnection(config);
  } catch (e) {
    const hint =
      e.code === "ECONNREFUSED" || e.code === "ETIMEDOUT" || e.code === "ENOTFOUND"
        ? `Could not reach ${config.host}:${config.port}.\n` +
          "  Use the PUBLIC url (MYSQL_PUBLIC_URL), not the one ending in .railway.internal.\n" +
          "  Internal hostnames only work from inside Railway."
        : e.code === "ER_ACCESS_DENIED_ERROR"
          ? "The username or password was rejected. Copy the whole URL again; passwords here contain characters that are easy to clip."
          : e.code === "ER_BAD_DB_ERROR"
            ? `There is no database called "${config.database}" on that server.`
            : e.message;
    console.error(`\nCould not connect to the ${label} database.\n\n${hint}\n`);
    process.exit(5);
  }
}

const source = await connect({ ...src, multipleStatements: false }, "source (--from)");

// Connect to the target without naming a database, so the database can
// be created before anything tries to use it.
const bootstrap = await connect({ ...dst, database: undefined }, "target (--to)");
await bootstrap.query(
  `CREATE DATABASE IF NOT EXISTS \`${dst.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
);
await bootstrap.end();

const target = await connect(dst, "target (--to)");

const [tables] = await source.query(
  `SELECT table_name AS t FROM information_schema.tables
    WHERE table_schema = ? AND table_type = 'BASE TABLE'
    ORDER BY table_name`,
  [src.database],
);

if (tables.length === 0) {
  console.error("The source database has no tables. Check the --from URL.");
  process.exit(4);
}

console.log(`${tables.length} tables to copy.\n`);

// Off for the duration: tables arrive alphabetically, so a child can
// land before its parent and a constraint would reject a row that is
// perfectly valid once everything is in.
await target.query("SET FOREIGN_KEY_CHECKS = 0");
await target.query("SET UNIQUE_CHECKS = 0");

const raw = createRaw({ ...src, database: src.database });

let grandTotal = 0;

for (const { t } of tables) {
  const [[create]] = await source.query(`SHOW CREATE TABLE \`${t}\``);
  const ddl = create["Create Table"];

  await target.query(`DROP TABLE IF EXISTS \`${t}\``);
  await target.query(ddl);

  const [[{ n }]] = await source.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
  if (n === 0) {
    console.log(`${t.padEnd(38)} empty`);
    continue;
  }

  const stream = raw.query(`SELECT * FROM \`${t}\``).stream();

  let batch = [];
  let bytes = 0;
  let copied = 0;
  let columns = null;

  const flush = async () => {
    if (batch.length === 0) return;
    const cols = columns.map((c) => `\`${c}\``).join(", ");
    await target.query(
      `INSERT INTO \`${t}\` (${cols}) VALUES ?`,
      [batch.map((r) => columns.map((c) => r[c]))],
    );
    copied += batch.length;
    batch = [];
    bytes = 0;
  };

  for await (const row of stream) {
    columns ??= Object.keys(row);
    batch.push(row);
    // Rough, and only needs to be roughly right: the point is to stay
    // clear of max_allowed_packet on the table holding print artwork.
    for (const v of Object.values(row)) {
      bytes += Buffer.isBuffer(v) ? v.length : 24;
    }
    if (batch.length >= 500 || bytes >= 4_000_000) await flush();
  }
  await flush();

  grandTotal += copied;
  const warn = copied === Number(n) ? "" : `  !! source had ${n}`;
  console.log(`${t.padEnd(38)} ${String(copied).padStart(8)} rows${warn}`);
}

await target.query("SET UNIQUE_CHECKS = 1");
await target.query("SET FOREIGN_KEY_CHECKS = 1");

raw.end();
await source.end();
await target.end();

console.log(`\nDone. ${grandTotal.toLocaleString("en-US")} rows into ${dst.database}.`);
console.log("Nothing was written to the source.");
console.log("\nNext: scrub it before anything can send email.");
