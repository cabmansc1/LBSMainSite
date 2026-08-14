# Google Business Profile — print setup pack

For local print searches the map pack sits above the organic results, so
the profile outranks anything on the website. This is the highest-return
hour available right now.

**I cannot do this part.** Editing a Business Profile needs a signed-in
Google account and verified ownership of the business — there is no API
or connector that substitutes for it. Everything below is the work
brought up to the point where it has to be you: decisions made, copy
written, ready to paste.

---

## Read this before you touch anything

### 1. Your listed address will not be accepted

The site declares **PO Box 357, Huger, SC 29450**. Google does not allow
PO Boxes, mailbox stores, or virtual offices as a business address. A
profile submitted with one gets rejected, and repeated attempts get the
account flagged.

**What to do instead:** set up as a **service-area business**. You give
Google a real physical address for verification only — your home is fine
— and tick the box that hides it from the public. Customers see the
areas you serve, never the address.

This is the correct setup for you anyway. You go to customers; they do
not come to you.

### 2. Do NOT create a second profile for printing

If a profile already exists for Lowcountry Business Spotlight, **add
print to it**. Do not create a "LBS Printing" alongside it.

Two profiles for one business at one address is a guideline violation.
Google detects it, and the usual outcome is that **both** get suspended
— including the one already earning. Recovering a suspended profile is
slow and sometimes fails.

One profile. Print is added as categories, services and photos.

### 3. Check whether a profile already exists

Search `Lowcountry Business Spotlight` on Google Maps before creating
anything. Three possibilities:

- **You own and manage it** — go to Categories below.
- **It exists but you have never claimed it** — Google may have
  auto-created it. Claim it rather than making a new one.
- **Nothing exists** — create it, service-area business, using your real
  address hidden from the public.

---

## Categories

One primary, up to nine additional. **Primary carries by far the most
ranking weight.**

### The trade-off, stated plainly

Your primary category is presumably something like *Advertising agency*
or *Marketing agency*, and that is what ranks you for the direct mail
searches that pay the bills today. Switching primary to *Print shop*
would help print rankings and risk the mailing ones.

**Recommendation: leave primary alone. Add print as additional
categories.** Additional categories do rank — less strongly, but they
rank — and direct mail is the business. Do not trade a working position
for a speculative one.

Revisit only if print revenue starts rivalling mailing revenue.

### Additional categories to add

Type these into the category box and pick from Google's dropdown. The
exact names shift over time, so match what it offers rather than forcing
these strings:

- Print shop
- Commercial printer
- Digital printing service
- Graphic designer
- Copy shop

Skip *Sign shop*. Banners go through a partner, and a category invites
enquiries for work you do not do in house.

---

## Business description

750 character limit. This one is 636 and covers both sides of the
business without burying either.

> Lowcountry Business Spotlight helps Charleston-area businesses reach
> local homeowners. We run shared postcard mailings that land in 5,000
> homes at a time with exclusive category placement — one plumber, one
> roofer, one dentist per card — so your ad is never printed next to a
> competitor's.
>
> We also print for local businesses: business cards, flyers, postcards,
> brochures and magnets. Design is included when we already have your
> artwork, which is the part most printers leave you to sort out
> yourself.
>
> Serving Summerville, Mount Pleasant, Goose Creek, Daniel Island, West
> Ashley, Nexton and Cane Bay.

Google does not rank on description keywords the way it once did, so
this is written to be read by a person deciding whether to call.

---

## Services

Add each with its own short description. This section genuinely helps
for "business card printing" style searches.

| Service | Description |
|---|---|
| Business card printing | Full-colour business cards on 16pt stock, from 250 up. Design included if we already have your artwork. |
| Flyer printing | 8.5x11 flyers for handouts, events and counter stacks. Send the wording and we lay it out. |
| Postcard printing | Postcards for leave-behinds and events, printed but not mailed. |
| Brochure printing | Tri-fold brochures. Layout quoted separately when new design work is needed. |
| Magnet printing | Business card magnets — the version that stays on the fridge instead of going in a drawer. |
| Graphic design | Artwork for print, included when we have designed for you before. |
| Direct mail advertising | Shared postcard mailings reaching 5,000 local homes with exclusive category placement. |

---

## Products — skip this section

Print is quoted rather than listed, and the profile's Products section
exists to display a price. Filling it in would put on Google exactly the
number the site deliberately does not publish, in the one place a
competitor checks first.

Services, above, carries the same products without a price and is the
section that helps for "business card printing" searches anyway.

---

## Photos

Photos affect both ranking and whether anyone calls. Phone photos in
daylight are fine; stock images are worse than none.

Shoot these:

- **Logo and cover** — the cover is the one people see first.
- **Real printed work** — a stack of finished business cards, a flyer
  held in hand, a box just delivered. This is the most persuasive
  category and the one most profiles skip.
- **Postcards being prepped for a mailing** — proof the mailing side is
  real.
- **You** — a face raises calls on a local service profile more than
  most people expect.
- **A design on screen next to the printed result** — this is the whole
  pitch in one image.

Add a few every month. Dormant profiles slide.

---

## Reviews

The biggest single lever, and you are further ahead here than most
businesses starting out: you already have customers who are pleased with
you. Reviews that mention *business cards* or *flyers* help you surface
for those searches.

**Rules worth not breaking:** never offer anything in exchange for a
review, never review yourself, and never tell someone what to write.
Asking is fine. Incentivising is not, and Google removes reviews and
penalises profiles for it.

Get your review link from the profile — Google provides a short one.

### Email

> Subject: Quick favour?
>
> Hi [name],
>
> Glad the [cards/flyers] worked out. If you have a spare minute, a
> short Google review would genuinely help other local businesses find
> us: [link]
>
> Anything you thought of it is useful — what we printed, how it went.
>
> Thanks,
> Andrew

### Text

> Hi [name] — glad the [cards] came out well. If you have a minute, a
> quick Google review would be a big help: [link] — thanks, Andrew

Ask when they are pleased: the day the box lands, or when they say
thanks. Not a week later.

**Reply to every review**, including the bad one, if it comes. Replies
are public and read by people deciding whether to call.

---

## Order to do it in

1. Search Maps for an existing profile. Claim rather than create.
2. Fix the address setup — service-area business, real address hidden.
3. Add the print categories. Leave primary alone.
4. Paste the description.
5. Add the services.
6. Upload photos, especially real printed work.
7. Set the website link to `/printing` for the print services, main URL
   otherwise.
8. Ask five happy customers for a review, one at a time, by name.
9. Products, once the rate sheet has real prices.

Verification takes anywhere from a few days to two weeks depending on
the method Google offers — often video these days. Start it before
anything else, because nothing shows publicly until it clears.

---

## One small inconsistency to be aware of

The site's `LocalBusiness` schema in `web/src/components/site-footer.tsx`
declares the PO Box. That is fine for mail and does no harm, but it will
not match a service-area profile with a hidden address.

Not urgent, and not obviously worth changing — a PO Box is a real place
to send cheques. Worth a deliberate decision later rather than an
accidental mismatch nobody noticed. If it does get changed, that file is
the only place it needs changing.
