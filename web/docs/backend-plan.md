# Backend plan: self-serve ordering, tracking, and the two admins

Written 2026-07-28, against the code as it stands on
`claude/pricing-updates-3nh79m`.

The site can already take money. What it cannot do is tell anyone
anything afterwards. This plan is mostly about that gap.

---

## Part 1. What exists today, honestly

**Works end to end**: browse zones, pick a card, pick a size, category
exclusivity enforced at pick time and again at checkout, Stripe hosted
payment, webhook marks paid, order recorded, advertiser pushed onto the
Mission Control card, reconciliation catches it when that push fails.

**Exists but thin**: the advertiser portal (`/account`, plus cards,
billing, results, messages, listings) reads Mission Control and the
directory, and shows real data. It has no write path worth the name.

**Does not exist at all**:

| Gap | Consequence |
|---|---|
| Any email sending | No receipt, no artwork request, no deadline reminder, no password link. Nothing. |
| GoHighLevel integration | The legacy site pushes 5 forms into GHL. The new one pushes none. |
| Account creation | Buying creates no login. `/register` is a placeholder that says "email us". |
| Artwork upload | Referenced in copy across six files. Implemented nowhere. |
| Proof approval | No record of a proof being sent, seen, or approved. |
| Order state beyond paid | `pending → paid → refunded`. Nothing about art, proof, print, mail. |

That last row is the root of most of what follows. An order that can
only be "paid" cannot drive a workflow, cannot drive a notification, and
cannot answer "where is my ad".

---

## Part 2. The advertiser's journey, as the advertiser

Written from the buyer's chair, because that is where the gaps show.

### Today

1. I find a zone page from Google. Good page, real information.
2. I pick a card and a size. The picker shows what is taken. Good.
3. I pay. Stripe, clean, familiar.
4. **I land on a page that tells me nothing about what happens next.**
5. **Nothing arrives. No receipt from you, only Stripe's.**
6. **I have no idea when my artwork is due, or that it is due at all.**
7. **I email you to ask. You are now my project manager.**

Steps 4 through 7 are where the self-service promise breaks. Everything
before is good enough to launch on.

### What it should be

1. **Pick and pay** as now.
2. **Confirmation page that means something**: your card mails 7 August,
   artwork due 24 July, here is your reference, here is the one thing we
   need from you.
3. **Receipt email within seconds**, from us, with the same three facts
   and a magic link into the portal. No password to invent.
4. **Portal shows one open task**: "Send your artwork, or ask us to
   design it." Two buttons, not a form.
5. **If they ask us to design it**: a short intake (logo, offer, phone,
   website, anything to avoid) and then their task becomes "waiting on
   your proof".
6. **Proof arrives** as a portal item plus an email. Approve or request
   changes, in one click. Changes go back as a thread, not an email
   chain.
7. **Approved**, and the task list is empty. Status becomes "on the
   card", then "printing", then "in mailboxes on 7 August".
8. **Mail week**: "your ad lands this week" with the QR link and the
   tracking page, so they know what to watch.
9. **Two weeks after**: "here is what your ad did" with scans, clicks
   and calls, and a one-click rebook for the next card in that zone.

The rebook at step 9 is the whole commercial point of the portal. An
advertiser who can see 140 scans and press one button will rebook. One
who has to email you might not.

### The two things advertisers will ask for that we have not planned

- **"Can I see my ad on the card?"** They want the proof in context, not
  a PDF of their own rectangle. The card preview component already
  renders position and scale; feeding a real image into it is small.
- **"Can I change my offer?"** Up to the artwork lockout, yes. After it,
  no, and the portal should say which side of that line we are on.

---

## Part 3. The owner's journey, as you

### The daily question

"What needs me today?" There is no screen that answers it. `/admin` has
counts; `/admin/orders` has a table. Neither says *do this next*.

**Proposal: `/admin` becomes a work queue**, in priority order:

1. Paid orders not on a card in Mission Control (built, currently on the
   orders page, belongs here too)
2. Paid orders with no artwork, sorted by artwork deadline ascending
3. Proofs waiting on you, and proofs waiting on the advertiser more than
   3 days
4. Cards inside 7 days of artwork deadline with open spots
5. Refund requests
6. Category waitlist entries that are now free
7. Directory signups pending review

Each row is a link and an action. Empty queue is the goal state, and
should look like one.

### The card lifecycle, which Mission Control owns

MC is the boss for inventory, and that should not change. What the site
needs is a faithful read plus the ability to write the things it
originates:

| Fact | Owner | Direction |
|---|---|---|
| Cards, zones, mail dates, routes | Mission Control | MC → site |
| Categories | Mission Control | MC → site |
| Category holds | Mission Control | MC → site |
| Advertiser placement | site originates on sale | site → MC |
| Payment record | site originates | site → MC |
| Artwork, proofs, approvals | **site should own** | site → MC as status |
| Order and invoice | site owns | site → MC as amount |

**Artwork should live on the site, not in MC.** It is a customer
interaction with a deadline and a state machine, and the portal is where
the customer already is. MC gets told the state, so a card's readiness
is visible where you plan print.

### What you need that you do not have

- **A card readiness view**: for a given card, who has approved artwork,
  who has not, who has not even uploaded. This is the print-day
  question and it currently lives in your head.
- **One-click chase**: from that view, email everyone missing artwork.
- **Revenue per card** against its cost, which MC has and the site
  deliberately does not show publicly. Owner-only.

---

## Part 4. Order state machine

The thing everything else hangs off. Current: `pending → paid →
refunded`. Proposed:

```
pending
  → paid                     (webhook, exists)
  → awaiting_artwork         (on paid, if no artwork yet)
  → artwork_received         (advertiser uploads, or we do on their behalf)
  → proof_sent               (we upload a proof)
  → changes_requested        (advertiser asks, loops to proof_sent)
  → approved                 (advertiser approves, or auto after N days)
  → on_card                  (confirmed placed in MC)
  → printing                 (MC card hits in_production)
  → mailed                   (MC card hits mailed)
cancelled / refunded from anywhere before printing
```

Two rules worth stating now, because they decide the notification
design:

- **Every transition writes a row in an order events table** with actor,
  timestamp and note. That table is the advertiser's timeline, your
  audit trail, and the trigger source for notifications. One mechanism,
  three uses.
- **`approved` can happen on a timer.** If a proof sits unanswered past
  the artwork deadline, it auto-approves with a warning email, because a
  print date is a hard date. This needs your sign-off; it is a business
  decision, not a technical one.

---

## Part 5. Notifications

### The rule

Every notification answers "what do I do now" or "here is the thing you
were waiting for". Anything else is noise and trains people to ignore
the ones that matter.

### To the advertiser

| Trigger | Channel | Timing | Content |
|---|---|---|---|
| Order paid | Email | Immediately | Receipt, mail date, artwork deadline, magic link |
| Artwork not received | Email | 7 days before deadline, then 3, then 1 | One button: upload or ask us to design |
| Artwork received | Email | Immediately | We have it, proof in 2 business days |
| Proof ready | Email | Immediately | Preview in context, approve or request changes |
| Proof not answered | Email | 48h, then 24h before lockout | Warns that it auto-approves |
| Approved | Email | Immediately | Locked in, what happens next, mail date |
| Card printing | Email | On MC status change | Short. No action needed. |
| Mailing this week | Email | Monday of mail week | Watch your QR page, here is the link |
| Results | Email | 14 days after mail date | Scans, clicks, calls, one-click rebook |
| Category freed (waitlist) | Email | On MC change | Time-limited claim link |
| Smaller card priced | Email | When 2,500 goes live | Only to the interest list |

**SMS**: only for the artwork deadline and the proof lockout. Those are
the two where a missed email costs a print slot. The legacy site already
has an SMS consent logger, so consent is being captured; check it covers
transactional.

### To you

| Trigger | Channel | Why |
|---|---|---|
| Order paid | Push or SMS | You want to know a sale happened |
| MC placement failed | Email, immediately | Category is unlocked until fixed |
| Artwork uploaded | Digest, twice daily | Batch work, not interrupt work |
| Changes requested on a proof | Email | Someone is waiting on you |
| Card 7 days from artwork deadline with gaps | Email, daily | The chase list |
| Card full | Push | Good news, and it changes what you sell |
| Refund requested | Email | Time-sensitive |
| Stripe webhook failing | Email | Silent money problem |

### Digest, not drip

One daily 7am email to you: what needs action, what moved yesterday,
what mails this week. If the work queue in Part 3 is right, this email
is that queue rendered.

---

## Part 6. Automations

### Necessary

1. **Receipt and welcome**, with a magic link. Nothing else works
   without a way back in.
2. **Artwork chase**, on the deadline schedule above. This is the single
   highest-value automation: every missed artwork is a phone call you
   make today.
3. **MC placement retry**, since the push gets one attempt. A background
   sweep that retries anything the reconciliation check flags, three
   times with backoff, then tells you.
4. **Status sync from MC**, so `printing` and `mailed` happen without
   you touching the site.

### Nice to have

5. **Auto-approve on timer**, with warnings, so print dates hold.
6. **Waitlist auto-notify** when a category frees on a card in that zone.
7. **Rebook nudge** at 14 days post-mail with the results in the email.
8. **Category-gap suggestions**: a card 10 days out with no HVAC, cross
   referenced against directory listings and past advertisers in that
   category and zone. A sales list that writes itself.
9. **Annual recap** each January: cards, households, scans, spend.

### Fun, and quietly effective

10. **"Your ad is in the mail" with the real card image** once the past
    card gallery has it. People screenshot these.
11. **Neighbor proof**: "4 businesses on your card, here is who you are
    sharing it with." Advertisers like knowing, and it seeds referrals.
12. **Streak recognition**: "third card in a row in Mount Pleasant."
    Small, human, and it makes churn feel like a decision.
13. **Scan milestone**: "your QR just passed 100 scans." One line, and
    it lands while they are still deciding whether to rebook.

Number 8 is the one I would build first among these. It turns your
inventory gaps into a prioritised call list, which is the actual job.

---

## Part 7. GoHighLevel

### What the legacy site does

`includes/ghl.php` posts JSON to LeadConnector inbound webhooks. URL
resolution is per-form (`GHL_WEBHOOK_<KEY>`) with a single-webhook
fallback (`GHL_WEBHOOK_URL`). Five forms send: `process_form.php`,
`save-quiz-lead.php`, `newsletter_subscribe.php`,
`process_directory_signup.php`, `gcregister.php`. Payloads carry
`source`, `submitted_at`, `signup_type`, plus per-form fields (quiz
sends `recommended_ad`, `recommended_price`, `mailing_size`, `budget`,
`goal`, `business_type`).

### What the new site does

Nothing. There is no GHL code in `web/`. The privacy policy still tells
visitors their form data goes to LeadConnector, which at cutover would
be untrue.

**This is a launch blocker, not a nice-to-have.** Every lead that
currently reaches your CRM stops reaching it the day DNS moves.

### Proposed

- Port `ghl.php` to `lib/ghl.ts` with the same env var contract, so your
  existing webhook URLs work unchanged.
- Fire on: contact, quiz, newsletter, directory signup, waitlist,
  smaller-card interest, **and every paid order**. The legacy site never
  sent purchases to GHL; it should, because that is what makes GHL able
  to run the post-sale sequences.
- Payload parity with the legacy shape for the five existing forms, so
  your current workflows and triggers do not need rebuilding.
- Fire-and-forget with a logged failure, same as the MC push, and the
  same reconciliation thinking: a lead that did not reach GHL should be
  visible somewhere.

### The division of labour question

GHL can send email and SMS. So can we. Doing both is how people end up
sending two receipts for one order.

**Recommendation**: transactional from the app, marketing from GHL.

- **App sends**: receipt, artwork chase, proof ready, approval, mail
  week, results. These need order state and a magic link, and GHL does
  not have either.
- **GHL sends**: nurture for unconverted leads, seasonal campaigns,
  reactivation, newsletter.
- **App tells GHL** about every state change via webhook, so GHL has the
  segments without owning the sending.

This needs your call, because if you would rather all sending happen in
GHL, the app's job shrinks to firing well-shaped events and the email
templates move into your existing tooling.

---

## Part 8. Build order

Each phase is independently shippable and useful on its own.

**Phase A, the launch blockers.** Nothing ships without these.

1. GHL port with payload parity, plus paid orders
2. Transactional email: receipt with magic link
3. Magic-link auth, so buying produces a way in without inventing a
   password
4. `SITE_URL` corrected (see the open question below)

**Phase B, the self-service core.** This is what "self-serve ordering
and tracking" actually means.

5. Order state machine plus the events table
6. Artwork upload in the portal, and "design it for me" intake
7. Proof upload from admin, approve or request changes in the portal
8. Portal task list driven by order state
9. Artwork chase automation

**Phase C, the owner's day.**

10. `/admin` as a work queue
11. Card readiness view with one-click chase
12. Daily digest
13. MC placement retry sweep

**Phase D, retention.**

14. Results email with scans and calls
15. One-click rebook
16. Waitlist auto-notify
17. Category-gap sales list

**Phase E, the fun.** Items 10 to 13 in Part 6, cheapest first.

---

## Open questions

These change the work, so they are worth answering before Phase A.

1. **Which domain is production?** `SITE_URL` in the code is
   `www.lowcountrybusinessspotlight.com`, but the live PHP site is
   `www.lbspotlight.com`. Every canonical, sitemap entry and JSON-LD url
   currently points at the wrong one, where 27 of those pages 404. This
   is the single most consequential thing in this document.

2. **Email sending: app, GHL, or both?** See Part 7. Changes roughly a
   third of the build.

3. **Auto-approve proofs on the deadline?** Business decision. Protects
   print dates, mildly risky with a slow customer.

4. **Should buying create a login automatically**, or stay magic-link
   only? Magic link is less friction and fewer support requests;
   accounts are better for repeat advertisers.

5. **Who writes the proof?** If your design is in Canva, the proof step
   is an upload. If we generate proofs from the card preview component,
   that is real work and worth planning separately.

6. **SMS: transactional only, or does GHL own it?** The legacy consent
   logger suggests consent exists; worth confirming its scope.
