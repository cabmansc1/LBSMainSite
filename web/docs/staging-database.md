# Giving staging its own database

Staging points at the production database. Test orders land in the real
`lbs_orders`, the directory admin edits real listings, and the Mission
Control test hit live MC.

That was survivable while the only things that could write a listing
were the admin screens, which one careful person uses deliberately. The
advertiser portal changed the shape of it. Claiming, editing, approving
and registering all write to `directory_businesses`, saving hours
replaces a listing's whole week in `directory_business_hours`, and the
person triggering any of it can now be a customer rather than you.
Clicking through the portal to see whether it works edits somebody's
real page.

About an hour, most of it waiting on a dump and two redeploys.

## The part that bites

A copy of production carries every customer's real email address and
phone number, and the app now sends mail on its own:

- an advertiser queues a listing change, we get an alert
- an approval or rejection emails the advertiser
- a signup emails both sides
- a lead, an artwork upload and an order receipt all send

So a copy plus `RESEND_API_KEY` plus one click on staging equals a real
customer getting mail from a test. `DIRECTORY_READ_ONLY` is protecting
you from that today by blocking the writes that trigger it. The moment
staging can write, the scrub is what protects you instead.

**Run the scrub before setting `RESEND_API_KEY` on staging, not after.**

## Before you start

- [ ] `DIRECTORY_READ_ONLY=1` on staging, and confirm production does
      not have it. This stays on until the copy is live.
- [ ] Know which database name is production and which is the copy. Say
      them out loud. Most of what follows is guarded on getting this
      right.

## 1. Make the copy

`--single-transaction` keeps the dump consistent without locking
production, which matters because production is the live site. Every
table is InnoDB, so it works.

```bash
mysqldump \
  --single-transaction --quick \
  --default-character-set=utf8mb4 \
  -h "$PROD_HOST" -u "$PROD_USER" -p \
  "$PROD_DB" > prod-dump.sql
```

If that fails with an access error mentioning tablespaces, add
`--no-tablespaces`. MySQL 8 wants the `PROCESS` privilege for them and a
shared host will not always grant it.

Then create the copy and import:

```bash
mysql -h "$STAGING_HOST" -u "$STAGING_USER" -p \
  -e "CREATE DATABASE lbs_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

mysql -h "$STAGING_HOST" -u "$STAGING_USER" -p lbs_staging < prod-dump.sql
```

A separate **database**, not a table prefix inside the same one. The
connection string is then the entire safety boundary, and it is
impossible to be half-pointed at the wrong data.

Delete `prod-dump.sql` when you are done. It is a full copy of every
customer record you have.

## 2. Scrub it

Dry run first. It is the default, and it reports the same numbers the
real run will change.

```bash
DB_HOST="$STAGING_HOST" DB_USER="$STAGING_USER" DB_PASS="$STAGING_PASS" \
DB_NAME=lbs_staging \
  node scripts/scrub-staging.mjs
```

Then, once the numbers look like the size of your customer base:

```bash
DB_HOST="$STAGING_HOST" DB_USER="$STAGING_USER" DB_PASS="$STAGING_PASS" \
DB_NAME=lbs_staging SCRUB_ALLOW=lbs_staging \
  node scripts/scrub-staging.mjs --write --keep you@example.com
```

`SCRUB_ALLOW` has to name the same database as `DB_NAME`. Naming it
twice is the point: the way this goes wrong is running it with
production credentials still in the shell, and a flag alone would not
stop that. It refuses before it opens a connection.

`--keep` your own address, or the scrub locks you out of the environment
you just built. Repeat the flag for more than one.

Addresses become `user{id}@staging.invalid`. `.invalid` is reserved by
RFC 2606 and no resolver will ever answer it, so a send that escapes
anyway fails at DNS rather than arriving somewhere real.

## 3. Point staging at it

Change `DB_NAME` (and `DB_HOST` / `DB_USER` / `DB_PASS` if the copy
lives elsewhere) on the staging service. Railway redeploys on the
change.

**Confirm you actually moved.** The scrub is the check: open
`/admin/users` on staging.

- Addresses ending `@staging.invalid` → you are on the copy.
- Real customer addresses → **you are still on production.** Stop, and
  do not clear `DIRECTORY_READ_ONLY`.

This is worth more than reading the variable back, because it tests the
thing you care about rather than the thing you set.

## 4. Let staging write

- [ ] Remove `DIRECTORY_READ_ONLY` from staging, or set it to `0`.
- [ ] Set `RESEND_API_KEY` so the email paths can be exercised. Only
      after step 2 has been confirmed.
- [ ] Leave `MC_READ_ONLY=1`. Mission Control is a separate live system
      and copying the database did nothing about it.
- [ ] Stripe stays on test keys. Stripe holds its own customer records
      with real emails, and the scrub cannot reach them.

## 5. Test in this order

Written this way because each step makes the next one meaningful.

1. `node scripts/audit-taxonomy.mjs` against the copy. Read only, and it
   tells you how much off-taxonomy data you are carrying before anything
   starts editing.
2. Register a free listing. It should be created unverified and appear
   nowhere public. You get the alert email.
3. Approve it in `/admin/directory`. It appears in the directory.
4. Sign in as it with an emailed code. Claim the listing if it shows as
   unclaimed.
5. Edit phone, website, description, a social link. All live immediately
   on `/business/{slug}`.
6. Set hours, including one closed day. They render, and appear in the
   page's `openingHoursSpecification`.
7. Change the business name. It does **not** publish. Check the slug is
   unchanged, so printed cards still resolve.
8. Approve it in `/admin/listing-edits`. Reject another with a reason,
   and one without.
9. Register a Premium listing with a Stripe test card. The webhook
   verifies it, it goes live, both emails send.
10. Cancel that subscription in Stripe. The listing drops to Basic and
    stays listed.

## Refreshing the copy

Every refresh re-imports real addresses. **Run the scrub again.** This is
the step that gets forgotten in three months when somebody refreshes
staging to chase a bug, and the failure is silent until a customer
replies to a test email.

Worth deciding now how often it refreshes, and writing that down here
when you do.

## What a copy does not solve

- **Mission Control** is one live system with no copy. `MC_READ_ONLY=1`
  is still the only thing between staging and real campaign data.
- **Stripe** is likewise live. Test keys, always.
- **Uploaded photos** live on the PHP host's disk, not in the database.
  The copy holds their filenames, so staging renders images by pointing
  at production's uploads host. Harmless, and read only, but it means an
  image deleted on production disappears from staging too.
- **The legacy PHP site** still runs against production. From the moment
  you make the copy the two diverge, which is the point, but it does
  mean a listing added in the legacy admin will not appear on staging.
