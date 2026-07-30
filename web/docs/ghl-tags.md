# GoHighLevel tags

Every push to GoHighLevel carries a `tags` array and a `tags_csv` string
with the same values. Both are sent because inbound webhook mapping in
GoHighLevel handles arrays inconsistently depending on how the trigger
was built; use whichever your workflow can read.

Build automations against these tags rather than against the `source`
string. `source` is prose written for a human reading the contact record,
and rewording it should not break a workflow. The tags are a fixed
vocabulary.

Every tag is lowercase, hyphenated, and prefixed `lbs-`.

## Kind, exactly one per contact

| Tag | Means |
|---|---|
| `lbs-lead-advertise` | Contact form on `/contact` |
| `lbs-lead-quiz` | Finished the Find Your Ad quiz |
| `lbs-lead-roi` | Used the ROI calculator |
| `lbs-newsletter` | Footer newsletter signup |
| `lbs-waitlist-category` | Wanted a spot, their category was taken |
| `lbs-waitlist-smaller-card` | Asked about the 2,500 household card |
| `lbs-customer` | **Paid for a spot.** Sent from the Stripe webhook. |

## Group, so one filter catches a whole class

| Tag | Applied to |
|---|---|
| `lbs-lead` | advertise, quiz and roi. Somebody asking about advertising. |
| `lbs-waitlist` | both waitlist kinds. |

A newsletter subscriber gets neither. They asked to hear from us, which
is not the same as asking to buy, and treating the two the same is how a
nurture sequence ends up pitching somebody who only wanted the blog.

## Context, zero or more

| Tag | Example | When |
|---|---|---|
| `lbs-zone-{slug}` | `lbs-zone-summerville` | The form knew a neighborhood |
| `lbs-category-{slug}` | `lbs-category-automotive-repair` | The form knew an industry |
| `lbs-size-{slug}` | `lbs-size-medium-3x4` | The quiz or calculator suggested an ad size |
| `lbs-page-{slug}` | `lbs-page-summerville-direct-mail-marketing` | Newsletter, the page it was submitted from |
| `lbs-card-{zone}-{month}` | `lbs-card-summerville-september-2026` | A purchase, so everyone on one card is a segment |

Slugging lowercases, turns `&` into `and`, and replaces everything else
with hyphens, so `Automotive - Repair` becomes `automotive-repair` and
`Health & Wellness` becomes `health-and-wellness`.

## What actually goes out

Captured from a live run against a webhook receiver, one line per form:

```
Ad Lead: Summerville                              lbs-category-plumbing, lbs-lead, lbs-lead-advertise, lbs-zone-summerville
Quiz Lead: Home Services                          lbs-category-home-services, lbs-lead, lbs-lead-quiz, lbs-size-medium-3x4
ROI Calculator Lead                               lbs-lead, lbs-lead-roi, lbs-size-large-4x6
Waitlist: Automotive - Repair in Mount Pleasant   lbs-category-automotive-repair, lbs-waitlist, lbs-waitlist-category, lbs-zone-mount-pleasant
Waitlist: smaller card, Hanahan                   lbs-waitlist, lbs-waitlist-smaller-card, lbs-zone-hanahan
Newsletter: summerville-direct-mail-marketing     lbs-newsletter, lbs-page-summerville-direct-mail-marketing
```

Tags are sorted and deduped, so the same submission always produces the
same set in the same order.

## When somebody pays

The Stripe webhook pushes on payment, which is the moment every fact
about the sale is known. Until this existed a purchase never reached the
CRM: a contact filled in a form, was tagged a lead, paid, and stayed a
lead, so nurture carried on pitching the customer who had already
bought.

`lbs-customer` is the tag to exit a nurture sequence on. The push also
**drops `lbs-lead` and `lbs-lead-advertise`**, because those describe how
somebody arrived and they have moved past it, while keeping the zone,
category and size tags so one filter covers a contact at either stage.

`lbs-card-{zone}-{month}` is the segment that chasing artwork and
approving proofs actually needs: everyone on the September Summerville
card, in one filter.

Fields, captured from a real payload:

| Field | Example |
|---|---|
| `email`, `name`, `firstName`, `lastName`, `companyName`, `phone` | as supplied at checkout |
| `source` | `Paid: Summerville card` |
| `signup_type` | `order_paid` |
| `order_reference` | `LBS-7QK2M` |
| `amount_paid` | `349`, **dollars not cents**, and what was really charged after any promotion code |
| `ad_size` | `medium` |
| `category` | `Plumbing`, the category now locked to them |
| `location` / `zone` | `Summerville` / `summerville` |
| `card_id`, `card_name`, `mail_month` | `card_abc`, `Nexton/Cane Bay`, `September 2026` |

`card_name` and `mail_month` are read from Mission Control at push time
using the card id, because checkout does not know them. If Mission
Control is unconfigured they are omitted rather than guessed, and the
`lbs-card-` tag is not sent.

## Every field, and which form fills it

Only `email` arrives on all five. Everything else depends on the form,
so make every other field optional in your mapping or the quiz and the
calculator will be rejected for missing a phone number they never ask
for.

### Person

| Field | Contact | Quiz | ROI | Waitlist | Newsletter |
|---|:-:|:-:|:-:|:-:|:-:|
| `email` | yes | yes | yes | yes | yes |
| `firstName` | yes | | | | |
| `lastName` | yes | | | | |
| `name` | yes | | | yes | |
| `phone` | yes | | | | |
| `companyName` | yes | | | yes | |

### Always sent

| Field | What it holds |
|---|---|
| `source` | Human-readable sentence, e.g. `Ad Lead: Summerville` |
| `tags` / `tags_csv` | The fixed vocabulary above |
| `submitted_at` | ISO 8601 |

### What they told us

| Field | Sent by | Example |
|---|---|---|
| `message` | contact | What they typed in the message box |
| `category` | contact, waitlist | `Plumbing` |
| `location` | contact, waitlist | `Summerville` |
| `zone` | waitlist | `mount-pleasant` |
| `signup_type` | waitlist, newsletter | `waitlist` or `newsletter` |
| `origin` | newsletter | Page slug they subscribed from |

### Quiz answers

| Field | Example |
|---|---|
| `business_type` | `Home Services` |
| `goal` | `Generate Leads` |
| `mailing_size` | `5000` |
| `budget` | `500` |
| `recommended_ad` | `Medium (3x4)` |
| `recommended_price` | `349` |

### ROI calculator

| Field | Example |
|---|---|
| `ad_size` | `Large (4x6)` |
| `distribution_reach` | `5000` |
| `ad_price` | `599` |
| `response_rate` | `0.01`, a fraction and not a percentage |
| `average_sale` | `450` |
| `projected_customers` | `50` |
| `projected_revenue` | `22500` |
| `projected_roi` | `3656`, a percentage |

### Sent but always empty from the contact form

`package`, `ad_size`, `distribution_reach` and `ad_price` ride on the
contact form payload only because the legacy PHP had a package picker
there and existing workflows expect the keys. Nobody picks a package on
the contact page now, so they arrive blank or zero. Map them if you want
the keys present; do not build a condition on them.

## Webhook routing

Each surface posts to its own webhook if one is set, falling back to
`GHL_WEBHOOK_URL` for everything:

| Env var | Surface |
|---|---|
| `GHL_WEBHOOK_ADVERTISE` | Contact form |
| `GHL_WEBHOOK_QUIZ` | Find Your Ad quiz |
| `GHL_WEBHOOK_ROI` | ROI calculator |
| `GHL_WEBHOOK_NEWSLETTER` | Newsletter |
| `GHL_WEBHOOK_WAITLIST` | Category waitlist |
| `GHL_WEBHOOK_URL` | Any of the above with no specific key set |

`advertise` and `quiz` match the keys the PHP site already uses, so
existing workflows keep working untouched. The other three are new.

Setting `GHL_WEBHOOK_URL` alone is the simplest setup: everything lands
in one workflow and the tags decide what happens next.

## Adding a tag later

Add it in `src/lib/ghl-tags.ts`. The tests in the repo assert the exact
strings, so a rename fails loudly rather than silently orphaning a
workflow that filters on the old one.
