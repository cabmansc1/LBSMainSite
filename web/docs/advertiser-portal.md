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

```
/account                     Overview
/account/profile             Business + account settings
/account/listing             Directory listing manager
/account/campaigns           Current and upcoming cards
/account/campaigns/[id]      One campaign: proof, artwork, deadline
/account/history             Past cards archive
/account/results             Scans, views, inquiries over time
/account/billing             Receipts, payment methods, subscription
/account/referrals           Give $50 / get $50
```

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
LowcoDeals clicks if they have deals. This is the renewal argument, so it
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

## Open questions for Andrew

1. One login per business, or several people per business? Any
   multi-location owners who need one login across listings?
2. Should a listing edit go live immediately, or into a review queue?
3. Artwork: does the advertiser upload art, or does LBS design it and the
   advertiser only approves a proof? Both?
4. Past cards: show the entire printed card, or only their ad?
5. Should the portal surface open categories in their zone as an upsell?
6. Do advertisers see the leads and inquiries their listing generated?
7. Deadline reminders: email, SMS, or both, and how far out?

## Sequencing when it is time to build

1. Identity linking, since nothing real renders without it
2. Listing manager (useful to every member, not just advertisers)
3. Current cards and proofs
4. Past cards archive
5. Results
6. Billing (needs Stripe keys)
7. Referrals
