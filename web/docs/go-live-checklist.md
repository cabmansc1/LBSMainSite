# Go-live checklist

What has to happen before DNS moves to the Next.js app, and what has to
be tested first. Written to be worked through in order.

The live PHP site keeps serving production the whole time. Rollback is a
DNS repoint, because both apps share one database and cannot diverge.

## Where things stand

Verified against the real thing on staging:

- Email sending, end to end through Resend
- Lead capture writing to the `leads` table
- The GoHighLevel webhook accepting a payload, confirmed by its own
  sample-capture reply

Built and pushed, still never exercised against a real database or a
real third party:

- The quiz and ROI calculator lead paths
- The quiz recommendation email to the visitor
- Newsletter signup
- Order receipt email
- Waitlist notices
- GA4, Tag Manager, Google Ads, Meta Pixel, LeadConnector chat
- Blog featured image upload
- Image optimisation on blog and directory
- Admin: real dashboard stats, waitlist queue, delete orders, delete leads,
  disable and delete accounts

Everything above passed type checking, a production build, and a browser
check where one was possible. None of it has written a row to the
production database or sent a real email or webhook. That is what the
testing section exists to fix.

Copy and layout work since, verified in a browser and needing no
further testing:

- Card archive reorganised by zone, edition and issue, on the public
  gallery and in the admin
- Hero rotates real mailed cards, levelled, portrait cards fitted
- Print specs on the homepage and the advertise page
- Ad size descriptions corrected, the 4x6 no longer claims to be largest
- Phone tracking claims removed everywhere, **including a copy-only patch
  to the live PHP site**, the first live change of the build

---

## 1. Blockers still to build

### Mine

- [x] ~~**Lead notification emails.**~~ Done. Admin alert on contact,
      quiz and ROI leads, plus the quiz recommendation back to the
      visitor. Reply-to is the lead's own address. Unverified against a
      real Resend key.
- [x] ~~**Artwork upload for postcard advertisers.**~~ Done. Upload on
      `/account/cards`, one file list per card, uploads add a version
      rather than replacing one. Admin review at `/admin/artwork`, which
      also lists who on an unprinted card still owes a file, read from
      the Mission Control roster so phone-sold advertisers are counted.
      The dashboard figure now measures that instead of legacy online
      orders. Unverified against a real upload on staging.
- [ ] **Registration.** `/register` is a placeholder that tells people to
      email us. `/directory-signup` points both plans at it, so no
      business can sign itself up. Needs a decision on how the $10/mo
      Premium subscription works before it can be finished.

### Yours

- [ ] **Confirm whether staging points at the production database.** Test
      orders landed in the real `lbs_orders`, the directory admin edits
      real listings, and the Mission Control test hit live MC. The
      original plan called for a refreshable staging copy. Everything
      below changes depending on the answer.
- [ ] **Rotate the two exposed Mission Control keys** (`5640e943`,
      `d8168a8e`) and delete the leftover `Internal Test Card`
      (`card_305924b17f9d`) and stray account `acct_12b42ba87600`.
- [ ] **Live Stripe keys** and a webhook endpoint registered against the
      new app. Keep the old endpoint active through cutover.
- [ ] **`lbspotlight.com` is an indexable soft-404 farm.** Every path
      returns 200 including `/robots.txt`. Needs noindex or 301s so it
      stops competing with the real domain.

### Environment variables to set on Railway

| Variable | Why |
|---|---|
| `GHL_WEBHOOK_URL` | Or the four per-form keys below. Without it leads save locally only. |
| `GHL_WEBHOOK_ADVERTISE` | Contact form. Matches the PHP key exactly. |
| `GHL_WEBHOOK_QUIZ` | Find Your Ad quiz. Matches the PHP key exactly. |
| `GHL_WEBHOOK_ROI` | ROI calculator. New, no legacy equivalent. |
| `GHL_WEBHOOK_NEWSLETTER` | Newsletter signup. |
| `SITE_ORIGIN` | Staging must point at itself or social previews for newly uploaded blog images break. |
| `RESEND_API_KEY` | Without it every send is a preview log and nothing reaches an inbox. |
| `MC_READ_ONLY` | Must be `1` on staging so it cannot mutate live Mission Control. |
| `RECAPTCHA_SECRET` + `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Optional, but both or neither. Secret alone rejects every real submission. |

---

## 2. Testing: front end

Run against staging with a real database attached.

### Lead capture, the thing that was completely missing

- [x] ~~Contact form submits. Row appears in `leads`.~~ Verified on
      staging: the row landed and `/admin/leads` shows it.
- [ ] Contact appears in GoHighLevel with source `Ad Lead`. The webhook
      is reachable and captures samples; the workflow still needs its
      field mapping, a create-contact action, and publishing.
- [ ] Find Your Ad quiz captures an email at the result step. Row in
      `leads` with `location = "Find Your Ad Quiz"`. Contact in GHL.
- [ ] ROI calculator captures. Row in `leads`. Contact in GHL.
- [ ] Newsletter signup in the footer. Row in
      `directory_newsletter_subscribers`. Contact in GHL.
- [ ] Subscribe with the same address twice. Second attempt says already
      subscribed, is not an error, and does not create a duplicate row.
- [ ] Honeypot: submit with `company_website` filled. Returns success,
      stores nothing, pushes nothing.
- [ ] Waitlist join from a card whose category is taken. Row in
      `lbs_waitlist` with the correct category and zone.
- [x] ~~Every lead produces an admin alert email.~~ Verified on staging,
      the first real send out of this stack. Resend, the verified domain
      and the composition all work.
- [ ] Hitting reply in that email addresses the lead rather than us.
- [ ] The quiz also emails the visitor their recommendation.

### Tracking

- [ ] GA4 realtime shows the visit.
- [ ] Meta Events Manager shows PageView.
- [ ] Quiz result fires a Meta `Lead` event.
- [ ] Checkout success fires the Google Ads conversion
      (`AW-18077746446/XxKsCMijt68cEI6KkqxD`) and a Meta `Lead`.
- [ ] Refreshing the success page does NOT re-fire either. They are
      latched on the Stripe session id, unlike the PHP.
- [ ] Client-side navigation between pages fires a fresh Meta PageView.
- [ ] GTM preview mode connects.

### Chat widget, A2P 10DLC compliance

This is a compliance rule, not cosmetics. A single SMS opt-in source.

- [ ] Widget appears on `/`, `/pricing`, `/blog`, `/directory`.
- [ ] Widget does NOT appear on `/contact`, `/account/*`, the postcard
      checkout, or `/admin/*`.
- [ ] **Navigate from `/pricing` to `/contact` without a page reload and
      confirm the widget disappears.** This is the one case that could
      not be tested locally, because the widget host is unreachable there
      so its DOM never existed to hide. The selectors that hide an
      already-injected widget are educated guesses.

### Content and SEO parity

- [ ] Crawl every URL from the live sitemap and `.htaccess` inventory.
      Assert status, canonical, title, description, JSON-LD against live.
- [ ] Every legacy `.php` URL 301s to its clean equivalent.
- [ ] The 11 zone pages at `/{zone}-direct-mail-marketing` all resolve.
- [ ] `sitemap.xml` and `robots.txt` are correct for the new domain.
- [ ] Lighthouse mobile on home, pricing, a zone page, a business page:
      Performance >= 90, SEO 100, Accessibility >= 95.
- [ ] Blog and directory now load quickly. Confirm images come through
      `/_next/image` and not the legacy host directly.

### Known content gaps

- [ ] 53 of 162 pages had parity issues, including 6 thin marketing pages
      and 18 over-length titles.
- [ ] Testimonials are still samples. Real quotes needed.
- [ ] Missing 10k prices for Triple, Quad and Full page.

---

## 3. Testing: advertiser

Start in Stripe test mode. Do not use live keys until everything here
passes.

### Buying a spot

- [ ] Pick a zone, pick a spot, reach the Stripe Checkout page.
- [ ] Category picker excludes categories already taken on that card.
- [ ] Pay with a test card. Land on the success page.
- [ ] Order row flips to paid. Only the webhook does this, never the
      success page.
- [ ] Advertiser appears on the right card in Mission Control, with the
      category locked.
- [ ] Receipt email arrives, naming the spot, the amount, the tentative
      mail date and the artwork deadline.
- [ ] Receipt quotes a real mail date, not a sample one.
- [ ] Apply a promotion code. The receipt and the admin both show what
      was actually charged, not the list price.
- [ ] **Concurrency: two browsers buy the last spot in the same category
      at the same time. Exactly one succeeds.** This is the test that
      protects the core product promise.
- [ ] Replay the webhook. Nothing double-applies, no second receipt.

### Account and portal

- [ ] An account is created automatically on purchase.
- [ ] Sign in with an emailed code. Code expires after 10 minutes, is
      single use, and burns after 5 wrong guesses.
- [ ] An existing production bcrypt user signs in with their old password.
- [ ] Dashboard shows the card they just bought.
- [ ] Profile prompts for missing phone if checkout did not capture it.
- [ ] Phone saves and persists.
- [ ] Artwork uploads, appears in the card's file list, and downloads
      back byte for byte. Try a real print PDF, not a screenshot.
- [ ] A second upload for the same card keeps the first one.
- [ ] Signed in as advertiser A, `/api/account/artwork/{id}` for a file
      belonging to advertiser B returns 404.
- [ ] An oversized file is refused with the size we can actually store,
      not a generic failure. Check the number matches
      `SELECT @@max_allowed_packet` on the deployed database.

---

## 4. Testing: admin

Both admins share one database, so the legacy PHP admin keeps working
throughout. Check that edits in one show up in the other.

### Newly built or newly fixed

- [ ] **Dashboard stats are real.** Six tiles, each its own query. A dash
      means the query failed and is not the same as zero.
- [ ] **Leads page shows real rows.** It read `directory_leads`, which
      does not exist, so it always said "No leads captured yet". There
      may be a backlog you have never seen.
- [ ] Delete a lead, and a bulk delete.
- [ ] Delete a postcard order. Confirmation names the paid amount and
      says deleting does not refund in Stripe.
- [ ] Disable an account, then enable it.
- [ ] Delete an account with no orders. Its listings survive, unlinked.
- [ ] **Try to delete an account that has card orders. It must refuse**
      and tell you to disable instead. Deleting it would drop those paid
      orders out of the Orders page and out of revenue.
- [ ] **Artwork page.** A file uploaded from an account appears under
      "Sent in" and downloads. The "Still missing" list names real
      advertisers on a card that has not printed, including ones sold
      over the phone with no online order.
- [ ] Missing-artwork list matches the dashboard tile. If Mission Control
      is unreachable both must say so rather than showing zero.
- [ ] Waitlist: send a notice. Email actually arrives. Only the addresses
      that sent get marked notified. A failure leaves the row waiting.
- [ ] Blog: upload a featured image, publish, confirm it renders on
      `/blog` and the post page.
- [ ] Blog: an existing post with a legacy image filename still shows its
      image.
- [ ] Directory: upload a logo, edit a listing, approve and deny.

### Carried over

- [ ] Orders reconciliation banner flags any paid order not on a card in
      Mission Control.
- [ ] View as an advertiser, then exit back to admin.
- [ ] Create a login for an advertiser who has never signed in.
- [ ] Cards, pricing and categories all read from Mission Control.
- [ ] QR generator and the CSV importers.

### Staying on the legacy admin at cutover

Pipeline board, advertiser ledger, campaigns, site stats, bulk import.
These move to a `legacy.` subdomain behind basic auth. Admin logins live
in `campaign_admins` and are not manageable from the new admin at all.

---

## 5. Mission Control data cleanup

MC is the source of truth, so this bounds how good everything downstream
can be. From the audit:

- [ ] 88% of accounts have no email, 83% no phone
- [ ] 92% of advertisers have no email
- [ ] 56% uncategorised. All on mailed cards, so no live exclusivity risk
      today, but it will bite as those cards recur
- [ ] 3 of 4 filling cards have no route table
- [ ] Forest Acres card has no mail date
- [ ] One business name carries a curly apostrophe that breaks matching

---

## 6. Cutover day

- [ ] Pick a date away from any print deadline.
- [ ] Freeze legacy deploys. Note the PHP site has already had one
      copy-only change, removing the phone tracking claims. Search
      results still carry the old meta descriptions until Google
      recrawls; requesting reindexing for the zone URLs speeds that up.
- [ ] Point the app at the production database and live Stripe keys.
- [ ] Register the live Stripe webhook. Keep the old endpoint active.
- [ ] Set `MC_READ_ONLY` to `0` so Mission Control writes land.
- [ ] Set `SITE_ORIGIN` to the live domain.
- [ ] Repoint DNS.
- [ ] Move the legacy PHP site to `legacy.` behind basic auth.
- [ ] Watch: a real order end to end, GA4 realtime, GHL receiving,
      Meta Events Manager, the server log for `[ghl]`, `[order-receipt]`
      and `[mission-control]` lines.

### Rollback

Repoint DNS back. Both apps share one database, so there is no data
divergence to reconcile. Decide in advance what triggers it: a failed
payment path or a broken Mission Control write should, a cosmetic bug
should not.
