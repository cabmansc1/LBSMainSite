# Category sync: Mission Control to the site

Categories decide two things on the public site: what a buyer can pick in
the postcard checkout, and which of those picks are greyed out because
the category is already exclusive on that card. Both have to match
Mission Control exactly, or the site sells something MC cannot deliver.

Mission Control owns the vocabulary. The site never edits it. The admin
Categories screen at `/admin/categories` is read only and exists to show
what the site is currently offering.

## How it works today, with no MC changes

The site reads `GET /api/store` (cached 60 seconds) and collects every
category word it can find:

| Source in the snapshot | Field |
| --- | --- |
| `accounts[]` | `category`, `primaryCategory` |
| `pipelineAdvertisers[]` | `category`, `primaryCategory` |
| `spotlightHolds[]` | `category` |

So a new category reaches the site as soon as it exists on any MC record.
Setting it as the category on one business account is enough. Within a
minute it is in the checkout picker.

Exclusivity per card comes from the same snapshot: an advertiser on the
card with `exclusivity` set, plus every `spotlightHolds` row for that
card. A held category is treated exactly like a sold one, which means
parking a category in MC while a deal is in progress immediately takes it
off sale on the site.

The weakness is that the list is inferred. A typo on one account becomes
a category on the site, and there is no way to retire a word or control
its order.

## The endpoint that fixes that

The site already prefers a managed registry and falls back to the above
only when the registry is missing. Ship this in MC and it takes over with
no site deploy:

```
GET /api/categories
Authorization: Bearer <key>   (same key as every other read)

200 [
  { "id": "cat_hvac", "name": "HVAC", "active": true },
  { "id": "cat_pest", "name": "Pest Control", "active": true }
]
```

Accepted shapes, so MC can return whatever is natural: a bare array of
strings, an array of objects with `name` (or `label`, or `category`), or
`{ "categories": [...] }` wrapping either. Return only categories that
should be sellable; the site shows everything it receives. `Other` is
sorted to the bottom of the picker automatically.

What MC needs behind it is small: a `categories` table with an id, a
name, a sort order, and an active flag, and an admin screen to add,
rename, and deactivate. It mirrors the existing `customProducts` table,
which is already `id, label, tone`.

Two things to get right when it lands:

1. **Renames.** Advertisers and holds store the category as free text. If
   MC renames a category without updating those rows, the site will list
   the new name while exclusivity still matches the old one, and the
   category will look open when it is not. Either update the referencing
   rows on rename, or move advertisers and holds to a category id.
2. **Retiring.** Deactivating a category that is live on an unmailed card
   removes it from the picker but does not free the slot, which is
   correct. Do not deactivate a category to mark it sold; that is what
   holds are for.

## Latency

Reads cache for 60 seconds. Adding a category in MC shows up on the site
within a minute, with no deploy and no cache purge. If it ever needs to
be instant, MC can call a revalidate webhook on the site rather than the
site polling faster.
