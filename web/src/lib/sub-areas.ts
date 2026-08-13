/**
 * Neighbourhoods that are worth a page but are not zones.
 *
 * West Ashley is part of the Charleston card and Nexton and Cane Bay are
 * part of Summerville's. Neither has a zone of its own, so neither has a
 * landing page — and the parent zone page cannot rank for a
 * neighbourhood name it never says. That is the whole gap these fill.
 *
 * They live under /direct-mail-marketing rather than at the root so the
 * hierarchy states the relationship: the hub is the subject, the zone
 * pages are the areas, and these are parts of one. It also keeps them
 * clear of the legacy `/{zone}-direct-mail-marketing.php` URLs.
 *
 * Every page says out loud which card it mails on. A reader who thinks
 * they are buying a West Ashley-only drop and gets the Charleston card
 * has been misled by omission, and that conversation is much worse on
 * the phone than it is here.
 */

export type SubArea = {
  slug: string;
  /** Page title and h1 subject. */
  name: string;
  /** The card it actually mails on, named the way Mission Control names it. */
  cardName: string;
  parentZoneSlug: string;
  parentZoneName: string;
  /** The parent zone's landing page on the legacy site. */
  parentHref: string;
  zipCodes: string[];
  /** One line under the h1. */
  standfirst: string;
  /** Two or three paragraphs on who lives there and why it matters. */
  body: string[];
  /** What sells well here, honestly assessed. */
  worksWell: string[];
};

export const SUB_AREAS: SubArea[] = [
  {
    slug: "nexton-cane-bay",
    name: "Nexton and Cane Bay",
    cardName: "Summerville",
    parentZoneSlug: "summerville",
    parentZoneName: "Summerville",
    parentHref: "/summerville-direct-mail-marketing.php",
    zipCodes: ["29486"],
    standfirst:
      "Two of the fastest-growing master-planned communities in South Carolina, on the Summerville card.",
    body: [
      "Nexton and Cane Bay sit in the 29486 zip code north of Summerville, and between them they have added more rooftops in the last decade than most Lowcountry towns contain. They are also unusually good direct mail territory, for a reason that has nothing to do with size: almost everybody living there moved in recently.",
      "A household that has just moved has to choose everything again. A dentist, a lawn service, a plumber, somewhere to get breakfast on a Saturday. None of those decisions are settled by habit yet, and none of them are being made by searching for a business they already know the name of. That is exactly the moment a postcard is worth more than a search ad.",
      "The other thing worth knowing is that these are neighbourhoods with strong internal word of mouth — community pages, neighbours who compare notes on who turned up on time. Getting the first few jobs right in a place like this compounds faster than it does in an older, more settled area.",
    ],
    worksWell: [
      "Home services — new builds generate a steady run of work for landscapers, gutter and pressure-washing companies, and irrigation",
      "Family services — paediatric dental, orthodontics, tutoring, childcare",
      "Restaurants and casual dining within a short drive",
      "Home improvement — fencing, sunrooms, closets, anything that turns a new build into somebody's house",
    ],
  },
  {
    slug: "west-ashley",
    name: "West Ashley",
    cardName: "Charleston",
    parentZoneSlug: "charleston",
    parentZoneName: "Charleston",
    parentHref: "/charleston-direct-mail-marketing.php",
    zipCodes: ["29407", "29414"],
    standfirst:
      "Charleston's largest residential area by population, reached on the Charleston card.",
    body: [
      "West Ashley covers the 29407 and 29414 zip codes between the Ashley River and Johns Island, and it is where a very large share of the people who work in Charleston actually live. Older neighbourhoods near the river, newer development further out toward Bees Ferry, and a mix of ages and incomes that is much broader than the peninsula's.",
      "For a local business that matters more than the raw population. West Ashley households are overwhelmingly people who own their homes and stay in them — the opposite of the short-let and student churn closer to downtown. A postcard that arrives here reaches somebody who will still be at that address next year, which is what makes a second and third mailing worth running.",
      "It is also underserved relative to its size. Plenty of Charleston advertising is bought for the peninsula and the tourist trade, which is a different audience entirely from the people living off Savannah Highway who need a roofer.",
    ],
    worksWell: [
      "Home services of every kind — this is established housing stock with maintenance needs",
      "Medical and dental practices serving families rather than visitors",
      "Automotive — repair, tyres, detailing",
      "Local restaurants competing with the peninsula for a weeknight rather than a special occasion",
    ],
  },
];

export const subAreaBySlug = (slug: string) =>
  SUB_AREAS.find((a) => a.slug === slug);
