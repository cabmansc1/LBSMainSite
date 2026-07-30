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
