# Virtual Postcards — Implementation Spec

> Digital twin of every mailed 9×12 postcard, sitting behind a QR code, that turns
> one‑and‑done print into a **first‑party email list you own** and compounding reach.
> Based on The 9x12 Method's "Virtual Postcards" feature (video `fwTqOYHbGm8`).

Status: **proposal / for review** — no code written yet.
Scope decisions locked with owner: **email‑only capture** (no SMS in MVP) and
**per‑advertiser attribution** (every lead ties to the ad spot it came from).

---

## 1. What we're building (from the video)

A consumer receives a printed 9×12 postcard. Each ad spot has a **"Scan to redeem"
QR code**. The flow:

1. **Scan** → lands on a clean digital version of the *same* card (`/c/{slug}`), with
   the scanned ad highlighted.
2. **Tap an offer** → sees offer title, description, fine print, redemption instructions.
3. **Unlock (capture)** → enters **email** to unlock. This is the list‑building moment.
   The code is *not* shown yet.
4. **Activate (redeem)** → separate button reveals the promo code (also emailed). The
   split lets us track who actually walked into the store.
5. **General opt‑in + share** → a "send me future offers" field and social share buttons
   on the card itself.

Underneath, this produces the real asset:

- **A subscriber list the site owner owns**, grown by every card.
- **Per‑advertiser data** (scans → captures → redemptions → repeats) — something direct
  mail never gave advertisers.
- **A once‑per‑card broadcast**: when a new card mails, email the whole list "fresh offers
  are live," so each advertiser's reach compounds month over month at no extra print cost.

### The funnel (canonical event names)
```
SCAN ──► CAPTURE (email unlock) ──► ACTIVATE (code revealed) ──► REPEAT (returns on a later card)
 view        lead created               redemption                 same email, new card
```

---

## 2. How this blends with lowcodeals.com

`lowcodeals.com` is already a Charleston‑Lowcountry **consumer deals platform**: browse by
13 categories / 16 locations, claim via QR or promo code → email → redeem in person,
free business listings, tagline "Live Local. Save Local." That is *the same consumer
surface the video describes.* LBSMainSite (`lowcountrybusinessspotlight.com`) is the
**sell‑side / print‑side**: businesses buy spots on a physical neighborhood card
(`cards`, `card_orders`, `card_positions`).

**The virtual postcard is the bridge between them.** Two viable blends:

| Option | Consumer page lives on | Pros | Cons |
|---|---|---|---|
| **A. Build the virtual page inside LBSMainSite** (`/c/{slug}`) | lowcountrybusinessspotlight.com | One codebase, direct reuse of `cards`/`card_orders`/`appSendMail`, fastest to ship | Consumer traffic lands on the B2B domain |
| **B. Render on lowcodeals.com, LBSMainSite is the API/admin** | lowcodeals.com | Consumers see a consumer brand; matches existing deals UX | Cross‑domain data contract, more moving parts |

**Recommendation: ship Option A first** (self‑contained, reuses everything below), but
build the data model so a card/offer is exposed as JSON (`/c/{slug}.json`) from day one.
That JSON feed is exactly what lowcodeals.com would consume later to render the same
offers under its own brand — so Option B becomes a front‑end project, not a re‑architecture.
Shared spine both directions: **one subscriber list, one offer catalog, one redemption
ledger.** A "deal" on lowcodeals and an "offer" on a virtual postcard are the same row.

Open question for the owner (see §9): should the master subscriber list be **shared**
across both properties or **kept separate**?

---

## 3. Fit with the existing codebase

Almost everything needed already exists — this is mostly a *read* surface over data we
already store, plus a capture form and a broadcast.

| Need | Already in repo |
|---|---|
| Card + spots model | `directory_cards`, `directory_card_positions`, `directory_card_orders`, `directory_card_categories`, `directory_card_spot_types` |
| Render helpers | `getCardPositions()`, `getPositionsBySize()`, `communityCardUrl()` (`config.php`) |
| Email transport | `appSendMail()` (PHPMailer/SMTP, `config.php:445`) |
| CRM push | `ghlSend()` (`includes/ghl.php`) |
| Spam protection | `includes/recaptcha.php` |
| SMS consent logging (future) | `includes/sms_consent.php`, `admin/create_sms_consent_log_table.php` |
| CSV export pattern | `fputcsv` in `admin/card_orders.php:115` |
| Migration pattern | `admin/setup_card_tables.php` (idempotent `CREATE TABLE IF NOT EXISTS`) |
| Pretty routing | `.htaccess` `RewriteRule` block (line ~103) |
| Admin auth | `requireCampaignAdminLogin()` (`admin/campaign_functions.php`) |

**Key reuse insight:** a paid `card_order` already binds *advertiser → position → card*.
An **offer** is just content attached to that order. Per‑advertiser attribution is then
free — every lead carries the `order_id`/`position_id` it unlocked.

---

## 4. Data model (new tables, all `directory_` prefixed)

Add to a new idempotent migration `admin/setup_virtual_postcard_tables.php` (mirrors
`setup_card_tables.php`).

### 4.1 `directory_card_offers` — the redeemable content per ad spot
```sql
CREATE TABLE IF NOT EXISTS directory_card_offers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  card_id       INT NOT NULL,
  position_id   INT NOT NULL,               -- which spot on the card
  order_id      INT DEFAULT NULL,           -- advertiser (paid order); NULL = house/filler
  headline      VARCHAR(160) NOT NULL,      -- "Free 10oz Conditioner"
  description   TEXT,
  fine_print    TEXT,
  redeem_instructions TEXT,                 -- "Show this code at checkout"
  code_mode     ENUM('shared','unique') NOT NULL DEFAULT 'shared',
  shared_code   VARCHAR(40) DEFAULT NULL,   -- when code_mode='shared'
  has_offer     TINYINT(1) NOT NULL DEFAULT 1,  -- spot may exist with no offer
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_position (position_id),
  INDEX idx_card (card_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4.2 `directory_card_subscribers` — the list you own (deduped, broadcast target)
```sql
CREATE TABLE IF NOT EXISTS directory_card_subscribers (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  email            VARCHAR(255) NOT NULL,
  name             VARCHAR(120) DEFAULT NULL,
  zip              VARCHAR(10)  DEFAULT NULL,
  status           ENUM('subscribed','unsubscribed') NOT NULL DEFAULT 'subscribed',
  unsub_token      CHAR(40) NOT NULL,          -- for one-click unsubscribe links
  source_card_id   INT DEFAULT NULL,           -- first card that captured them
  consent_text     TEXT,                       -- exact opt-in language shown
  consent_ip       VARCHAR(45),
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at  DATETIME DEFAULT NULL,
  UNIQUE KEY uq_email (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4.3 `directory_card_redemptions` — per‑offer lead + funnel lifecycle
```sql
CREATE TABLE IF NOT EXISTS directory_card_redemptions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  card_id        INT NOT NULL,
  position_id    INT NOT NULL,
  offer_id       INT NOT NULL,
  order_id       INT DEFAULT NULL,           -- advertiser attribution (denormalized)
  subscriber_id  INT NOT NULL,               -- FK -> directory_card_subscribers
  email          VARCHAR(255) NOT NULL,      -- denormalized for fast per-advertiser export
  status         ENUM('captured','activated') NOT NULL DEFAULT 'captured',
  issued_code    VARCHAR(60) DEFAULT NULL,   -- the code they got on activate
  activate_token CHAR(40) NOT NULL,          -- link in the email to reveal/activate
  captured_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at   DATETIME DEFAULT NULL,
  consent_ip     VARCHAR(45),
  user_agent     VARCHAR(255),
  INDEX idx_card (card_id),
  INDEX idx_order (order_id),
  INDEX idx_offer (offer_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
*Repeat* = a subscriber_id with redemptions across ≥2 distinct `card_id`s.

### 4.4 `directory_card_events` — scans/views for the top of the funnel + trends
```sql
CREATE TABLE IF NOT EXISTS directory_card_events (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  card_id      INT NOT NULL,
  position_id  INT DEFAULT NULL,            -- set when arriving from a per-spot QR
  event_type   ENUM('scan','view','offer_open','share') NOT NULL,
  ip_hash      CHAR(40),                    -- hashed, for rough unique counting
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_card_type_time (card_id, event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
(High‑volume; can be rolled up into a daily summary table later if needed.)

### 4.5 `directory_card_broadcasts` — enforce once‑per‑card, log sends
```sql
CREATE TABLE IF NOT EXISTS directory_card_broadcasts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  card_id     INT NOT NULL,
  subject     VARCHAR(255) NOT NULL,
  body_html   MEDIUMTEXT,
  audience    ENUM('all','card') NOT NULL DEFAULT 'all',
  sent_count  INT NOT NULL DEFAULT 0,
  sent_by     INT DEFAULT NULL,
  sent_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_card (card_id)              -- one broadcast per card (sender reputation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4.6 Alter `directory_cards`
```sql
ALTER TABLE directory_cards
  ADD COLUMN public_code   VARCHAR(24) DEFAULT NULL,   -- short QR slug, unique
  ADD COLUMN vp_enabled    TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN vp_publish_at DATETIME DEFAULT NULL,      -- scheduled go-live
  ADD UNIQUE KEY uq_public_code (public_code);
```

---

## 5. Public (consumer) surface

| Route (`.htaccess`) | File | Purpose |
|---|---|---|
| `/c/{code}` (+ `?p={position_id}`) | `virtual-card.php` | Render the digital card; highlight scanned spot; log `scan`/`view` |
| `/c/{code}.json` | `virtual-card.php?format=json` | Offer feed for lowcodeals.com (Option B later) |
| `POST /offer/unlock` | `process_offer_unlock.php` | Capture email → create subscriber + redemption(`captured`) → email activation link |
| `/redeem/{activate_token}` | `redeem-offer.php` | Reveal/`activated` the code, log `activated_at` |
| `/offers` | `offers.php` | Landing page listing all published virtual cards ("all past postcards") |
| `/unsubscribe/{unsub_token}` | `unsubscribe.php` | One‑click unsubscribe, flips subscriber `status` |

Consumer page requirements:
- Mobile‑first; renders `getPositionsBySize(getCardPositions($cardId))`, overlaying each
  position's offer from `directory_card_offers`.
- `?p=` highlights the scanned ad (video: "bobs up and down").
- Unlock form: email + **explicit consent checkbox** + reCAPTCHA (`includes/recaptcha.php`).
- Share buttons (native share / copy link / FB / SMS) → log `share` events.
- General opt‑in field (subscribe without redeeming a specific offer).
- Spots with `has_offer = 0` render as plain ads (no CTA) — that's expected and fine.

---

## 6. Admin surface

New section `admin/virtual_cards.php` (list) + extend `admin/card_detail.php`, guarded by
`requireCampaignAdminLogin()`.

1. **Offer editor** — per position on a card: headline, description, fine print, redeem
   instructions, code mode (shared vs unique), active toggle. QR download per spot.
2. **Redemptions / leads** — table of `directory_card_redemptions` for the card, filter by
   advertiser (`order_id`), status. **CSV export** (reuse `fputcsv` pattern from
   `admin/card_orders.php:115`) — all leads or a single advertiser's leads to hand off.
3. **Analytics (per advertiser + per card)** — funnel counts Scan → Capture → Activate →
   Repeat, conversion rates, card views trend by day (from `directory_card_events`).
4. **Broadcast composer** — subject + message, shows live subscriber count, **send once per
   card** (blocked by `uq_card`), sends via `appSendMail()` in throttled batches, logs to
   `directory_card_broadcasts`. Warn‑and‑confirm because it's irreversible.
5. **QR generation** — endroid/qr-code (add to composer) or a render endpoint; produce a
   downloadable PNG/SVG per spot pointing at `SITE_URL/c/{public_code}?p={position_id}` for
   the printed artwork.

---

## 7. Email & compliance

- **Transport:** `appSendMail()` for both the per‑redemption activation email and broadcasts.
- **Activation email:** sent on capture — contains the code and the `/redeem/{token}` link.
- **Broadcasts:** batched with a small delay; include physical mailing address + one‑click
  unsubscribe (CAN‑SPAM). Never re‑send to `status='unsubscribed'`.
- **Consent:** store exact opt‑in text + IP + timestamp on subscriber and redemption rows.
- **Unsubscribe:** tokenized link auto‑suppresses; no login needed.
- **SMS:** out of scope for MVP (email‑only). Schema leaves room; `includes/sms_consent.php`
  already exists for a later phase.
- **CRM:** optionally mirror captures to GoHighLevel via `ghlSend($payload, 'virtual_card')`.

---

## 8. Build phases

- **Phase 1 — MVP (≈ the "day" estimate):** migration (§4), `/c/{code}` render, unlock
  capture + activation email, `/redeem/{token}`, subscribers + redemptions, admin offer
  editor + redemptions list + per‑advertiser CSV export. Ships the "list you own."
- **Phase 2 — Compounding engine:** once‑per‑card broadcast composer + `appSendMail` batching
  + unsubscribe handling; `/offers` landing page.
- **Phase 3 — Advertiser value:** analytics funnel + per‑advertiser dashboards; QR generation
  baked into `card_detail`.
- **Phase 4 — lowcodeals blend:** expose `/c/{code}.json`, render offers under the lowcodeals
  brand, decide shared vs separate subscriber list (§9).

---

## 9. Decisions needed before/at build time

1. **Consumer domain** — ship on lowcountrybusinessspotlight.com now (Option A) and add the
   lowcodeals render later? (Recommended.)
2. **Shared list?** — one master subscriber list across LBS + lowcodeals, or separate lists
   per property?
3. **Code model** — one shared code per offer (simple) vs a unique code per redemption
   (better fraud/redemption tracking)? Spec supports both via `code_mode`.
4. **Who owns the advertiser's leads** — always exportable to the advertiser, or only when
   the owner opts in per advertiser? (Video treats it as a selling point / per‑agreement.)
5. **QR library** — add `endroid/qr-code` to composer, or generate via a JS/endpoint?

---

## 10. Out of scope (MVP)
Drag‑and‑drop visual card *builder* (the video's fancy editor) — we already have positions
from `card_layout`/`generate_card_positions`; the offer editor is form‑based first. SMS
broadcasts. Multi‑tenant "partner" accounts (this deployment is effectively single‑partner).
