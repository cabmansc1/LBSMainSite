# Advertiser Portal: design notes

Status: **thinking it through, not building yet.** Captured so it does not
get lost behind the admin work.

Today the portal is a single `/account` route: a dashboard shell with
hardcoded numbers and action links that all point back to `/account`.
Login and sessions are real and verified (existing bcrypt passwords work);
everything below the login is not.

## Who this is for

Three overlapping people use this login today:

1. **Postcard advertisers** who bought a spot on a card. They care about
   deadlines, proofs, and whether it worked.
2. **Directory members** who have a free or Premium listing and never
   bought a postcard. They care about their listing and the leads it makes.
3. **Both**, which is the ideal state and what the portal should nudge
   toward.

The portal should not assume someone is an advertiser. A directory-only
member logging in should see a useful listing manager, not empty campaign
tables.

## Proposed structure

Navigation order, left to right (sidebar on desktop, bottom bar on mobile):

```
/account                     Home       Launchpad, nothing editable
/account/cards               Cards      Running cards, then the past card archive
/account/cards/[id]          ...        One card: artwork, proof, deadline
/account/listings            Listings   Directory listing + LowCoDeals deals
/account/messages            Messages   Inquiry inbox
/account/results             Results    Scans, views, inquiries over time
/account/billing             Billing    Receipts, subscription, referral credit
/account/profile             (avatar menu) Business and account settings
```

Billing sits below the five main destinations on desktop and drops to the
account menu on mobile: nobody needs one-tap access to receipts.

**Listings covers both listings a business has with us**: their directory
page here, and their deals on LowCoDeals. Deals are created and edited on
LowCoDeals itself, so the portal reads them, shows live and ended state,
and links out. Live deals already surface as a chip on the public
directory listing, so this closes the loop.

Mockup: `web/public/mockups/portal.html`, live at `/mockups/portal.html`
on staging.

### Overview
Next deadline with a countdown, current card status, scans this week,
listing health (missing photo, missing hours, no offer), and one clear
next action. Everything else is a click away.

### Profile
Business name, contact details, logo, the login email and password, who
else can access the account, and notification preferences (deadline
reminders, proof ready, monthly results, lead alerts).

### Listing manager
The real version of `manage-listing.php`, which was always a dead mockup
on the legacy site. Edit description, category, area, contact, hours,
photos, offers, socials. Live preview of the public listing. Writes the
same tables the admin editor writes.

### Current cards
Per booked spot: zone, mail date, artwork deadline with lockout, spot
size, what they paid, artwork state (needed / uploaded / in review /
approved), and the proof to approve. Source of truth is Mission Control.

### Past cards
The archive, and the most under-rated page here. Each past card shows the
actual printed card image, mail month, households reached, their ad as it
ran, and results. Doubles as social proof and a reorder prompt.

### Results
QR scans over time per card, directory listing views, inquiries received,
LowCoDeals clicks if they have deals. This is the renewal argument, so it
should be honest and specific rather than flattering.

### Billing
One-time postcard purchases (Stripe Checkout) and the recurring Premium
directory subscription are different things and both belong here:
receipts, invoices, payment method, cancel or upgrade.

## The hard part: identity linking

Mission Control is the source of truth for cards and advertisers, but an
MC advertiser record and a `directory_users` login are different objects
today. The portal cannot show "your campaigns" until one advertiser
identity maps to one login.

Options:

1. **Match on email.** Zero migration, works immediately, breaks when the
   advertiser books with a different address than they log in with.
2. **Store the MC advertiser id on the user row.** Reliable. Needs a
   linking step: admin claims, or a one-time match-and-confirm.
3. **Claim flow.** User logs in, we show likely matches by business name
   and email, they confirm, we store the link.

Recommended: 1 as the default with 3 as the fallback, then persist the
result so matching happens once, not on every page load.

Same question applies to the directory listing: `directory_businesses`
has a `user_id`, so listings can already belong to a login, but existing
imported listings may have it empty. A claim flow covers that too.

## Decisions made

- **Artwork: both paths.** An advertiser can upload print-ready art, or
  ask LBS to design it and then approve a proof. States to model:
  needed, uploaded, in design, proof ready, changes requested, approved,
  locked (past deadline).
- **Leads: full inquiry inbox.** Advertisers see the actual inquiries
  their listing generated, with contact details, not just counts. Also
  means the portal needs read access to `directory_business_inquiries`
  scoped to that advertiser's own listing, and nothing else.
- **Login: passwordless** (email a one-time code), with password login
  kept underneath as a fallback. See below.
- **Accounts: one login, many listings.** A login can own more than one
  business or location, with a switcher in the portal. Needs `user_id`
  populated on `directory_businesses` plus a claim flow for imported
  listings that have none.
- **Listing edits: review queue.** An advertiser's edit does not touch the
  public listing. It is stored as a pending change, shows in the portal as
  "waiting for review", and an admin approves or rejects it. Requires a
  pending-edits table holding the proposed values, plus a review screen in
  the admin. Approving writes the values onto the live row.
- **Email: Resend.** One provider for login codes, deadline reminders,
  proof-ready notices, and results emails. Needs `lbspotlight.com` (or a
  subdomain such as `mail.lbspotlight.com`) verified in Resend with SPF
  and DKIM DNS records, plus a `RESEND_API_KEY`. Code will sit behind a
  small email interface so the provider can be swapped without touching
  callers.

## Passwordless login

Feasible and a good fit: these users sign in a few times a year, so a
password is something they will always have forgotten.

How it works: they enter their email, we generate a short single-use
code, email it, and they type it in. Verifying the code creates the same
signed session cookie the current login already issues. Nothing about
the session layer or the portal changes.

What it needs:
- **Email delivery that reliably lands.** This is the whole dependency.
  Resend or Postmark on a verified sending domain with SPF and DKIM.
  Codes that land in spam are worse than passwords.
- A `login_codes` table: email, code hash, expires_at, used_at, attempts.
- Rate limiting per email and per IP, code expiry around 10 minutes,
  single use, and a cap on attempts. Otherwise the code becomes a weak
  password anyone can brute force.
- Codes must be hashed at rest, never logged, and never returned in an
  API response.

Deliberate design points:
- **Do not reveal whether an email exists.** Always show "if that email
  is on file, a code is on the way." Otherwise the login form becomes a
  customer list.
- **Keep bcrypt password login working underneath.** Existing advertisers
  already have passwords, admin accounts should keep a password, and it
  is a safe fallback if email breaks. Passwordless becomes the front
  door, not the only door.
- It partly solves identity linking: the email they receive the code at
  is the email we match against Mission Control advertisers.

Optional later: magic link instead of a typed code (one click from the
email), or SMS codes, which cost money per send and need consent
handling.

## Open questions for Andrew

1. Past cards: show the entire printed card, or only their ad?
2. Should the portal surface open categories in their zone as an upsell?
3. Deadline reminders: how far ahead, and do we want SMS as well as email?
4. Does a rejected listing edit need a reason sent back to the advertiser?

## Sequencing when it is time to build

0. Email sending, since passwordless login depends on it
1. Identity linking, since nothing real renders without it
2. Listing manager with the pending-edit queue (useful to every member,
   not just advertisers) plus the admin review screen that pairs with it
3. Current cards and proofs
4. Past cards archive
5. Results
6. Billing (needs Stripe keys)
7. Referrals
