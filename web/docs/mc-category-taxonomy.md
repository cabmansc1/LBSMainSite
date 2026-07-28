# Mission Control category taxonomy

A proposed replacement for the current category list, built from the 102
accounts actually in Mission Control on 2026-07-28.

## Why this exists

Category exclusivity is the product. The site now locks a category as
soon as a business holds it on a card, which means the category list is
no longer a filing convenience: it is the definition of who counts as a
competitor. Every category that is broader than a real competitive line
costs a sale, and every category narrower than one breaks the promise.

The current list is too coarse in exactly the places the business is
densest. Six retailers share one "Retail" category, so selling a spot to
a jeweler blocks a wine shop, a cigar shop and an antiques dealer who
compete with nobody. Five automotive businesses share "Automotive", so a
ceramic coating shop blocks a mobile oil change service. Meanwhile
"Health & Medical" holds a yoga studio, a bungee fitness gym and a
health center, none of whom are the same business.

## Naming convention

**`Family - Specific`** for anything that needs splitting, plain names
where a trade stands alone. The prefix matters: the checkout dropdown is
a flat alphabetical list, so the prefix is what keeps a family together
where a buyer will look for it.

Punctuation is load-bearing. The lock compares the category string, so
`Auto - Detailing`, `Auto – Detailing` (en dash) and `Auto-Detailing`
are three different categories that look identical on screen. Use a
plain hyphen with a space either side, every time.

MC's `customCategories` records already carry a `group`. The groups
below are the ones to use.

---

## The list

### Home & Property Services

The densest group and the one where collisions cost the most.

```
HVAC
Plumbing
Electrical
Roofing
Gutters
Siding & Exteriors
Windows & Doors
Blinds & Window Treatments
Garage Doors
Fencing
Decks, Porches & Patios
Concrete, Driveways & Paving
Painting - Interior & Exterior
Painting - Cabinet Refinishing
Flooring
Remodeling & General Contracting
Kitchen & Bath Remodeling
Custom Cabinetry & Millwork
Handyman Services
Appliance Repair
Locksmith
Insulation
Solar
Security & Smart Home
Septic & Sewer
Chimney & Fireplace
Pools & Spas
Irrigation & Sprinklers
Home Inspection
Mold Remediation
Water Damage & Restoration
Waterproofing & Crawl Space
Pest Control
Pest Control - Mosquito & Outdoor
Pressure Washing
Window Cleaning
Cleaning - Residential
Cleaning - Commercial
Cleaning - Carpet & Upholstery
Junk Removal & Hauling
Moving & Storage
Interior Design
Closets & Home Organization
Furniture Repair & Upholstery
Landscaping - Lawn Care & Maintenance
Landscaping - Design & Install
Landscaping - Hardscape & Patios
Landscaping - Tree Service
Landscaping - Lighting
```

### Auto & Transportation

```
Auto - Repair & Service
Auto - Mobile Mechanic
Auto - Oil Change & Quick Lube
Auto - Detailing
Auto - Paint, Coating & Wraps
Auto - Body & Collision
Auto - Glass
Auto - Window Tint
Auto - Tires & Wheels
Auto - Audio & Accessories
Auto - Sales (Dealership)
Auto - Sales (Independent & Used)
Motorcycle & Powersports
Boats & Marine
RV & Trailer
Towing & Roadside Assistance
Courier & Delivery
Freight & Logistics
Car Service & Airport Transport
```

### Health, Fitness & Beauty

```
Dental
Orthodontics
Medical - Primary Care
Medical - Urgent Care
Medical - Specialty
Chiropractic
Physical Therapy
Vision & Optometry
Hearing
Dermatology
Med Spa & Aesthetics
Massage Therapy
Mental Health & Counseling
Home Health & Senior Care
Weight Loss & Nutrition Coaching
Salon - Hair
Salon - Nails
Barbershop
Lashes, Brows & Waxing
Tanning & Spray Tan
Fitness - Gym & Personal Training
Fitness - Yoga & Pilates
Fitness - Martial Arts
Fitness - Dance
Fitness - Specialty & Recreation
```

### Food & Drink

```
Restaurant - Casual Dining
Restaurant - Fine Dining
Restaurant - Fast Casual
Restaurant - Breakfast & Brunch
Restaurant - Pizza
Restaurant - BBQ
Restaurant - Seafood
Restaurant - Mexican
Restaurant - Asian
Bakery & Desserts
Ice Cream & Frozen Treats
Coffee & Tea
Bar, Pub & Taproom
Brewery, Winery & Distillery
Food Truck
Catering
Meal Prep & Delivery
Nutrition & Smoothie Bar
Butcher, Deli & Specialty Foods
```

### Retail & Shopping

```
Retail - Jewelry
Retail - Boutique & Apparel
Retail - Gifts & Home Decor
Retail - Furniture
Retail - Antiques & Consignment
Retail - Thrift & Resale
Retail - Wine, Beer & Spirits
Retail - Cigars & Tobacco
Retail - Florist
Retail - Hobby, Games & Toys
Retail - Sporting Goods & Outdoor
Retail - Books & Music
Retail - Electronics
Retail - Garden Center & Nursery
Retail - Farm & Feed
Retail - Pharmacy & Health Store
Retail - Pet Supplies
```

### Professional & Financial

```
Insurance - Home & Auto
Insurance - Life & Health
Insurance - Commercial
Financial Advisor & Wealth Management
Tax Preparation & Accounting
Bookkeeping & Payroll
Mortgage & Lending
Banking & Credit Union
Legal - Family Law
Legal - Personal Injury
Legal - Real Estate & Closing
Legal - Estate Planning
Legal - Business
Marketing & Advertising
Web Design & IT Services
Printing & Signs
Photography
Videography
Staffing & Recruiting
Business Coaching & Consulting
Coworking & Office Space
Notary & Document Services
Concierge & Errand Services
```

### Real Estate & Property

```
Real Estate - Residential Agent
Real Estate - Commercial
Real Estate - Property Management
Real Estate - Cash Buyer & Investor
Real Estate - New Construction & Builder
Real Estate - Rentals & Vacation Rentals
Title & Closing Services
Appraisal
Land Surveying
```

### Events, Leisure & Travel

```
Event Venue
Wedding Planning
Wedding Officiant
DJ & Live Music
Party & Equipment Rentals
Travel Agency
Tours & Charters
Attractions & Escape Rooms
Art & Galleries
Golf & Country Club
Marina & Boat Rental
Fishing & Hunting Guides
```

### Pets

```
Veterinary
Pet Grooming
Pet Boarding & Daycare
Pet Sitting & Dog Walking
Pet Training
Pet Waste Removal
```

Pet retail lives in Retail & Shopping as `Retail - Pet Supplies`, and
animal rescues live in Nonprofit & Community as `Nonprofit - Animal
Welfare`. A category name must appear exactly once across the whole
list: the same name in two groups is two separate locks, which is the
bug this taxonomy exists to prevent.

### Family & Education

```
Childcare & Daycare
Preschool & Early Learning
Private School
Tutoring & Test Prep
Music Lessons
Art Classes
Summer Camps & Youth Programs
Senior Living
```

### Nonprofit & Community

```
Nonprofit - Animal Welfare
Nonprofit - Youth & Family
Nonprofit - Health & Advocacy
Church & Faith Community
Civic & Service Club
Chamber & Business Association
Government & Public Services
```

---

## Collisions in the current data

These are places where the existing list either blocks businesses that
do not compete, or fails to block ones that do.

### Blocking businesses that do not compete

**Retail (5 accounts, at most 2 of them competitors)**

| Business | Should be |
|---|---|
| Colucci's Jewelers | Retail - Jewelry |
| The Wine Cellar | Retail - Wine, Beer & Spirits |
| Kings Leaf Cigars | Retail - Cigars & Tobacco |
| Yesterdays and today's unique treasures | Retail - Antiques & Consignment |
| Fancy Follies | Retail - Boutique & Apparel *(confirm)* |

**Automotive (5 accounts, none of them competitors)**

| Business | Should be |
|---|---|
| Dip My Ryde | Auto - Paint, Coating & Wraps |
| Palmetto Detail Worx | Auto - Detailing |
| Luber - Mobile Oil Change | Auto - Oil Change & Quick Lube |
| Mobile Auto Solutions Ltd Co | Auto - Mobile Mechanic |
| Fluid Inovations | *needs your call* |

**Health & Medical (3 accounts, none of them competitors)**

| Business | Should be |
|---|---|
| Be Wild Yoga | Fitness - Yoga & Pilates |
| Fly High Bungee | Fitness - Specialty & Recreation *(confirm)* |
| Pleasant Life Health Center | Chiropractic *(confirm)* |

**Financial & Accounting (2 accounts, not competitors)**

| Business | Should be |
|---|---|
| Jim Rowan - Edward Jones | Financial Advisor & Wealth Management |
| Truesdale Tax Solutions | Tax Preparation & Accounting |

**Hardscape & Landscaping (9 accounts, 6 real competitors)**

| Business | Should be |
|---|---|
| Green Trim, Murphys Lawn Service, Shorecut Lawn Service, Sizemores Lawn Care, Xtreme Lawn Care, Wide Open Greenscapes | Landscaping - Lawn Care & Maintenance |
| Out on a Limb Tree Service, Prime Tree Experts | Landscaping - Tree Service |
| Oakleaf landscape lighting | Landscaping - Lighting |

**Events & Entertainment (3 accounts, none of them competitors)**

| Business | Should be |
|---|---|
| Perfect For You Ceremonies | Wedding Officiant |
| Regina Art | Art & Galleries |
| The Southern Clue Co. | Attractions & Escape Rooms |

**Food & Beverage (10 accounts, mostly not competitors)**

| Business | Should be |
|---|---|
| Duck Donuts - Carnes | Bakery & Desserts |
| 16 Handles | Ice Cream & Frozen Treats |
| B Fresh Meal Prep | Meal Prep & Delivery |
| Rewind Nutrition | Nutrition & Smoothie Bar |
| LPC Kitchen | Catering *(confirm)* |
| Coachs Canteen, Southern Roots, Ophelias, The Co-op, Dreams and Drinks | *need your call on cuisine and format* |

**Real Estate (6 accounts, 5 real competitors)**

| Business | Should be |
|---|---|
| Christina Howard, Kathryn Tindal, Kayla Roland, Marsha Neal Real Estate, Terry Hamlin - Carolina One | Real Estate - Residential Agent |
| Easy Carolina Home Buyers | Real Estate - Cash Buyer & Investor |

### Failing to block businesses that do compete

**Two landscape lighting companies are filed under different families.**
Bowers Outdoor Lighting sits under Electrical while Oakleaf landscape
lighting sits under Hardscape & Landscaping. They do the same work and
can currently both be sold onto the same card. Both should be
`Landscaping - Lighting`.

**Two pet groomers, one unclassified.** Palm Belle Luxury Grooming is
Pet Grooming on one card and Real Estate on another, and Tidy Tails is
unclassified. If Tidy Tails is grooming, they compete with Palm Belle
and both need `Pet Grooming`.

**Pressure washing is spread across three labels.** Shamrock Pro Wash
and Pressure Washing Bros are Pressure Washing; Grit Pro Wash, Ship
Shape Wash and Mount Pleasant Pressure Washing are unclassified; Ship
Shape Wash is Decks & Patios on one card. Six competitors, one category.

**American Air Solutions is Hardscape & Landscaping on the Downtown
Summerville card.** They are HVAC everywhere else. This is why HVAC is
currently open for sale on a card that already has an HVAC advertiser.

---

## The 23 unclassified accounts

Every business here is invisible to exclusivity: "Other" is treated as
unclassified, not as a category, so these block nothing.

| Business | Proposed |
|---|---|
| Service First Climate Control | HVAC |
| Mold Remediation and Clean Air Solutions | Mold Remediation |
| Smart Cleaning Services | Cleaning - Residential |
| Grit Pro Wash | Pressure Washing |
| Ship Shape Wash | Pressure Washing |
| Mount Pleasant Pressure Washing | Pressure Washing |
| Crown Construction | Remodeling & General Contracting |
| Courier Express | Courier & Delivery |
| Saja Logistics LLC | Freight & Logistics |
| Pat Hogan/CoWorking Space | Coworking & Office Space |
| Reserve Concierge | Concierge & Errand Services |
| We Care Daycare | Childcare & Daycare |
| Palm Belle Luxury Grooming | Pet Grooming |
| Coastal Connect Solutions | Web Design & IT Services *(confirm)* |
| Northern Details | Auto - Detailing *(confirm)* |
| Tidy Tails | Pet Grooming or Pet Waste Removal *(confirm)* |
| Tap Truth Co | *needs your call* |
| Abstract Adventures | Tours & Charters *(confirm)* |
| Everyday Help, LLC | Handyman Services *(confirm)* |
| Happy To Home Services | Handyman Services *(confirm)* |
| Your Home Hero | Handyman Services *(confirm)* |
| Lowcountry Service Pros | *needs your call* |
| Palmetto's Edge Landscape & Pressure Washing | *pick one, see below* |

**Palmetto's Edge Landscape & Pressure Washing** is the case worth
thinking about. A business that genuinely does two trades can only hold
one category, because the category is what a competitor is blocked from
buying. Pick the one they sell hardest. If they want both locked, that
is two spots, which is a real upsell rather than a filing problem.

---

## What happens to each existing category

Of the 26 categories currently in Mission Control, 11 survive untouched
and 15 are replaced by a family.

**Keep as-is.** HVAC, Plumbing, Electrical, Roofing, Gutters, Fencing,
Pest Control, Pressure Washing, Appliance Repair, Mold Remediation,
Windows & Doors, Mortgage & Lending, Pet Grooming.

**Replaced by a family.**

| Retire | Becomes |
|---|---|
| Automotive | `Auto - *` (13 categories) |
| Retail | `Retail - *` (16) |
| Food & Beverage | `Restaurant - *` plus Bakery, Coffee, Catering and others (19) |
| Hardscape & Landscaping | `Landscaping - *` (5) |
| Health & Medical | `Medical - *`, Chiropractic, Physical Therapy and others |
| Beauty & Wellness | Med Spa & Aesthetics, `Salon - *`, Barbershop, Massage |
| Real Estate | `Real Estate - *` (6) |
| Financial & Accounting | Financial Advisor, Tax Preparation, Bookkeeping |
| Insurance | `Insurance - *` (3) |
| Events & Entertainment | Event Venue, Wedding Planning, Wedding Officiant, DJ, Attractions, Art & Galleries |
| Nonprofit & Community | `Nonprofit - *`, Civic & Service Club, Church |
| Painting | `Painting - *` (2) |
| Cleaning | `Cleaning - *` (3) |
| Travel | Travel Agency, Tours & Charters |
| Home Furnishings | `Retail - Furniture` (rename; Hometown Furniture Summerville) |
| Decks & Patios | `Decks, Porches & Patios` (rename) |
| Pet Support (Non-profit) | `Nonprofit - Animal Welfare` (rename) |

## Sequencing

Do it in this order, because a half-done split is worse than either end
state.

1. **Create the categories** in Mission Control first, all of them,
   before touching a single advertiser.
2. **Re-label the advertisers on cards that are still filling.** Right
   now that is Downtown Summerville, Moncks Corner, Mount Pleasant and
   Nexton/Cane Bay. These are the ones where a wrong category costs a
   sale today.
3. **Re-label the accounts**, which is what enriches future cards.
4. **Leave mailed cards alone** unless you want the archive accurate.
   Nothing on a mailed card can be sold twice.

The reason for that order: the moment `Retail - Jewelry` exists, a
record still labeled plain `Retail` stops blocking it. Splitting a
category without re-labeling the business that holds it opens the
category up rather than narrowing it.
