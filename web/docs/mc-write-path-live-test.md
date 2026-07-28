# Proving the Mission Control write path, once, safely

The last unverified link in the checkout chain. Everything before it has
run on staging many times; this half has never executed, because
`MC_READ_ONLY=1` stops it.

About 15 minutes of attention, mostly waiting on two Railway redeploys.
You do not have to watch it: `/admin/orders` now leads with any paid
order that did not reach its card, so a silent failure surfaces on its
own rather than only in a log.

Before that check existed this meant sitting on the Railway log for the
one line that says the push failed. That is what it no longer needs.

## What has and has not been proven

Staging test purchases have exercised:

- form validation and the category lock at checkout time
- the pending row in `lbs_orders`
- the Stripe session and the hosted payment page
- the webhook signature check and the `pending → paid` flip

Never executed, not once:

- `POST /api/pipeline/cards/{id}/advertisers`, which places the buyer on
  the card
- `POST /api/pipeline/advertisers/{id}/payment`, which records what they
  paid
- everything downstream: the category locking in MC, the spot count
  moving, the card appearing in an advertiser's portal

## Before you start

**Read the dry run first.** It costs nothing and catches a malformed
payload before any of this. Make a normal staging purchase with
`MC_READ_ONLY=1` still on, then read the Railway deploy logs for:

```
[mission-control read-only] would send:
{ "method": "POST", "path": "/api/pipeline/cards/<id>/advertisers", "body": { ... } }
```

Check three things in that body: the `path` names the card you actually
bought, `exclusivity` holds the category you picked, and `amountPaid`
matches what Stripe charged. If any of those is wrong, stop and fix it.
The live test proves the request is accepted, not that it is correct.

**Confirm the Stripe keys are test keys.** `STRIPE_SECRET_KEY` must
start with `sk_test_`. If it starts with `sk_live_`, stop: everything
below would move real money.

**Confirm the MC key can write.** Staging has both `MC_API_KEY` and
`MC_API_KEY_READONLY` set, and the code prefers `MC_API_KEY`. If that
holds the read-only key, the write comes back as a 307 to `/login` and
the adapter reports "auth failed". You need a write-scoped key in
`MC_API_KEY` for the duration of the test.

## The one real cost

The test card is visible to the public while it exists. It will appear
in the pricing page neighborhood picker, on the coverage map, and in the
mailing calendar, within about a minute of creation.

There is no way around that: the checkout route resolves the zone
through `zoneBySlug`, so a card in a fake zone cannot be bought at all,
and a card that is not sellable cannot test a sale.

So: pick a quiet hour, name the card so a stray visitor understands, and
delete it as soon as you are done. If someone does buy onto it, nothing
is lost. You have the order row and the Stripe payment, and you can
place them on a real card by hand.

## Steps

### 1. Create a throwaway card in Mission Control

- **Area**: `Hanahan`. It is a real zone, so checkout can reach it, and
  its only card (Tanner Plantation) already mailed, so there is nothing
  open in that zone for a test card to be confused with.
- **Card name**: `Internal Test Card`. Shows publicly, and reads as
  exactly what it is.
- **Mail date**: about three months out, so it does not disturb the
  "next mailing" line anywhere.
- **Total spots**: 16.
- **Status**: `filling`.
- Note the card id. Everything below refers to it as `<CARD_ID>`.

### 2. Switch staging to write mode

In Railway variables for the staging service:

- `MC_READ_ONLY` → `0` (or remove it)
- `MC_API_KEY` → the write-scoped key, if it is not already

Wait for the redeploy to finish before continuing.

### 3. Buy a spot

Go to:

```
/postcards/hanahan/checkout?card=<CARD_ID>&spot=small
```

Fill it in with something unmistakable:

- Business: `ZZZ Internal Test`
- Category: pick one nothing else holds, `Land Surveying` is a safe pick
- Email: see the note below check 6, because which address you use here
  decides whether you can run that check at all
- Card number `4242 4242 4242 4242`, any future expiry, any CVC

### 4. Check the six things

In order, because each depends on the one before.

| # | Where | Expect |
|---|---|---|
| 1 | `/admin/orders` | No red banner. If the push failed, the order is listed there with the card it should have reached. |
| 2 | MC, the test card | `ZZZ Internal Test` present, marked paid, ad size small, amount $249 |
| 3 | MC, that advertiser | A payment recorded against them, method `stripe`, with your order reference |
| 4 | `/admin/orders` | The order shows **Paid**, with the same reference |
| 5 | `/postcards/hanahan/checkout?card=<CARD_ID>` | The category you bought now reads **Taken**, and the spot count moved |
| 6 | `/account`, logged in as that email | The card appears under current campaigns |

Six is the only check that proves the whole chain end to end, and it
needs an account, which buying does not create.

**You cannot self-register for one.** `/register` is still a placeholder
that asks people to email us, and `/admin/users` can set a password on
an existing account but cannot make a new one. So pick your test email
from an account that already exists:

1. Open `/admin/users` and choose any existing portal account.
2. Set a password on it.
3. Use **that account's email** at checkout in step 3.
4. Sign in as them and look at `/account`.

That is also the honest version of what a real buyer faces today, which
is worth seeing for yourself.

If one through five pass and six does not, the failure is in the portal
match, not the write path: the portal finds cards by comparing your
logged-in email to the advertiser email in Mission Control.

### 5. Clean up, in this order

1. **Refund the payment in Stripe.** Test mode, so no real money, but it
   fires `charge.refunded` and exercises `markRefunded`, which is worth
   seeing work. Check `/admin/orders` shows **Refunded** afterwards.
2. **Delete the advertiser** from the test card in MC.
3. **Delete the test card** in MC.
4. **Set `MC_READ_ONLY` back to `1`** and put `MC_API_KEY` back to the
   read-only key. Do not skip this. Staging keeps deploying on every
   push, and the next bug in a write path would land on live cards.
5. Confirm the card is gone from the public coverage map.

## If the write fails

The adapter logs the reason rather than swallowing it. The three
likely ones:

**`auth failed (307 -> /login)`** means the key cannot write. Step 2,
second half.

**`no MC card for order ... (card <id>, zone hanahan)`** means MC does
not have that card id. Check you copied it correctly, and that the card
is not archived.

**A 4xx from `/api/pipeline/cards/{id}/advertisers`** means the payload
shape and MC's expectations have diverged. The dry run log shows exactly
what was sent; compare it against MC's current handler. Nothing is
half-written when this happens, because the payment POST only runs after
the advertiser POST returns an id.

### The failure is silent, and it does not retry

Worth knowing before you run this, because it changes what you watch.

The webhook fires the Mission Control push as `void pushToMissionControl(...)`
and never waits on it. The function catches its own errors and logs
them. So a failed push does not fail the webhook, does not return 500,
and does not cause Stripe to retry.

Even if Stripe did retry, it would not help. `markPaid` is idempotent
and returns `firstTime` only once, and the push is inside that guard, so
the second delivery skips it deliberately. That guard is right: without
it a retry would place the advertiser on the card twice.

The consequence is that the push gets exactly one attempt, and if it
fails, the customer has paid, the order says paid, and nobody is on the
card. Nothing is lost, because you have the order row and the Stripe
payment, and adding them in MC by hand takes a few seconds. But nothing
tells you either, beyond a line in the Railway log.

That is acceptable while you are watching a deliberate test. It is not
acceptable at cutover unattended. The fix is a reconciliation check: a
paid order whose business does not appear on its card in MC. Worth
building before the live switch, not after.

## What this still does not prove

Cutover needs live Stripe keys and a live webhook endpoint registered
against the production URL. Neither is exercised here. Register the new
endpoint before switching DNS and keep the old one active, so a rollback
does not strand payments.
