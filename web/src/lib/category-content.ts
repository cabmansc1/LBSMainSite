/**
 * Editorial copy for directory category landing pages. Slugs match the
 * seeded directory_categories rows. Categories without an entry render
 * the plain browse page with no intro or FAQ block.
 */

export type CategoryContent = {
  intro: string;
  faqs: { q: string; a: string }[];
};

export const CATEGORY_CONTENT: Record<string, CategoryContent> = {
  restaurant: {
    intro:
      "From shrimp and grits in downtown Charleston to family barbecue joints in Summerville, the Lowcountry eats well. This list covers locally owned restaurants, cafes, food trucks, and caterers across the Tri-County area. Many of them run current specials you can claim on LowCoDeals.",
    faqs: [
      {
        q: "How do restaurants get listed here?",
        a: "Every listing is a real Lowcountry restaurant that either advertises on a Spotlight Postcard or signed up for the free directory. We review each submission before it goes live.",
      },
      {
        q: "Do any of these restaurants offer deals?",
        a: "Yes. Listings with an active offer show it right on the card, and restaurants with live deals on our sister site LowCoDeals link straight to them so you can claim the deal in a couple of taps.",
      },
      {
        q: "I own a restaurant. How do I get on this page?",
        a: "Listing is free. Use the List Your Business link, pick Restaurants and Dining as your category, and add your menu link, photos, and hours. Postcard advertisers get featured placement at the top.",
      },
    ],
  },
  "home-garden": {
    intro:
      "Coastal weather is hard on a house. Salt air, summer storms, and sandy soil keep Lowcountry homeowners searching for dependable HVAC techs, roofers, plumbers, electricians, and landscapers. Everyone on this list is a local company, not a national call center, and the featured businesses are the same ones neighbors see on our postcards.",
    faqs: [
      {
        q: "Are these contractors vetted?",
        a: "Listings marked Verified have been confirmed by our team, and featured businesses are paying advertisers we work with directly on their postcard campaigns. We still recommend checking licensing and insurance for any major project.",
      },
      {
        q: "What home services can I find here?",
        a: "HVAC, roofing, plumbing, electrical, landscaping, handyman work, cleaning, pest control, and more. Use the tag chips to narrow to a specific trade.",
      },
      {
        q: "How do I pick between two similar companies?",
        a: "Open both listings. You can compare service areas, photos of real jobs, current offers, and how long they have been part of the Spotlight community, then call or send an inquiry from the listing page.",
      },
    ],
  },
  automotive: {
    intro:
      "Whether you need a trustworthy mechanic in Goose Creek, a body shop after a fender bender on I-26, or a detail before you sell, these are the automotive businesses Lowcountry drivers actually use. Local shops, straight answers, no upsell scripts.",
    faqs: [
      {
        q: "What automotive services are in the directory?",
        a: "General repair, body shops, detailing, car washes, tire and alignment shops, and specialty services across Charleston, Berkeley, and Dorchester counties.",
      },
      {
        q: "Why do some shops show a Featured badge?",
        a: "Featured shops advertise on the Spotlight Postcards that mail to 5,000 plus homes in their area. They earn top placement here as part of that campaign.",
      },
      {
        q: "Can I request a quote through the directory?",
        a: "Yes. Every listing has a contact form that goes straight to the shop, plus a phone number if you would rather call.",
      },
    ],
  },
  "health-wellness": {
    intro:
      "Finding the right dentist, chiropractor, med spa, or therapist matters more than finding the closest one. These health and wellness providers serve families across the Charleston area, and many are the same practices your neighbors see featured on their neighborhood Spotlight card.",
    faqs: [
      {
        q: "What types of providers are listed?",
        a: "Dentists, chiropractors, physical therapy, med spas, counseling, primary care, and other wellness services across the Tri-County area.",
      },
      {
        q: "Do these providers accept new patients?",
        a: "Most listings here actively advertise to attract new patients, which is a good sign they are accepting them. Use the inquiry form on a listing to ask directly.",
      },
      {
        q: "How current is the information?",
        a: "Business owners manage their own listings and advertisers update them alongside their postcard campaigns, so hours, offers, and contact details stay fresh.",
      },
    ],
  },
  beauty: {
    intro:
      "Salons, barbershops, nail studios, lash artists, and skincare pros from Park Circle to Mount Pleasant. Beauty is a word of mouth business, and this list is the digital version of a neighbor's recommendation.",
    faqs: [
      {
        q: "How do I know which salon or studio to try?",
        a: "Open a listing to see photos of real work, current offers for new clients, and links to their Instagram, where most beauty pros post their freshest results.",
      },
      {
        q: "Do any listings offer new client specials?",
        a: "Many do. Look for the orange offer chip on a listing card, and check their linked LowCoDeals offers for limited time specials.",
      },
      {
        q: "I run a studio. Is a listing really free?",
        a: "Yes. The basic directory listing is free. If you want featured placement and 5,000 mailboxes seeing your business, that is what the Spotlight Postcard does.",
      },
    ],
  },
  retail: {
    intro:
      "Skip the big box run and shop the Lowcountry first. Boutiques, gift shops, outfitters, and specialty stores that keep their money and their character in the community.",
    faqs: [
      {
        q: "What kinds of stores are listed?",
        a: "Locally owned boutiques, gift shops, home goods, outdoor gear, and specialty retail across Charleston, Summerville, Mount Pleasant, and the surrounding towns.",
      },
      {
        q: "Do these stores run promotions?",
        a: "Watch for the offer chip on listing cards and the green LowCoDeals chip, which links to live deals you can claim online.",
      },
      {
        q: "How does a shop get featured?",
        a: "Featured shops advertise on the Spotlight Postcard mailed to homes in their zone. It pairs a physical card on the fridge with top billing in this directory.",
      },
    ],
  },
  services: {
    intro:
      "Accountants, insurance agents, photographers, cleaners, pet groomers, and every other professional a Lowcountry household or small business leans on. These are local providers who answer their own phones.",
    faqs: [
      {
        q: "What counts as professional services?",
        a: "Anything from bookkeeping and insurance to photography, cleaning, pet care, tutoring, and business services. If it does not fit another category, it likely lives here.",
      },
      {
        q: "How do I contact a provider?",
        a: "Every listing includes a direct phone number, a website link when available, and an inquiry form that emails the business directly.",
      },
      {
        q: "Are these businesses local?",
        a: "Yes. The directory only lists businesses that serve the Charleston Lowcountry, and most are owner operated.",
      },
    ],
  },
  "fitness-recreation": {
    intro:
      "Gyms, yoga studios, golf, martial arts, youth sports, and everything else that keeps the Lowcountry moving. Most offer trial classes or intro specials, so it costs nothing to try somewhere new.",
    faqs: [
      {
        q: "Do gyms and studios here offer trials?",
        a: "Many do. Check the offer chip on their listing card or their linked deals for intro specials and first class free promotions.",
      },
      {
        q: "What areas are covered?",
        a: "Summerville, Goose Creek, Mount Pleasant, Daniel Island, James Island, Charleston, North Charleston, Hanahan, and the surrounding Lowcountry.",
      },
      {
        q: "I own a studio. How do I stand out here?",
        a: "Start with a free listing, add class photos and a current offer. To reach whole neighborhoods at once, a Spotlight Postcard puts your studio in 5,000 plus mailboxes and features you at the top of this page.",
      },
    ],
  },
  legal: {
    intro:
      "When you need an attorney, a CPA, or a financial advisor, you want someone established in the community, not the first ad on a search page. These legal and financial professionals serve Lowcountry families and small businesses year round.",
    faqs: [
      {
        q: "What professions are listed here?",
        a: "Attorneys, accountants and CPAs, financial advisors, tax preparers, and related professional practices across the Charleston area.",
      },
      {
        q: "Do these firms offer consultations?",
        a: "Most offer an initial consultation. Use the inquiry form on a listing to describe what you need and the firm will respond directly.",
      },
      {
        q: "Why trust a directory listing over a search ad?",
        a: "Every business here is a real Lowcountry practice we have reviewed, and featured firms invest in reaching their own neighborhoods through our postcards. That is a different signal than whoever bid the most for a keyword.",
      },
    ],
  },
  other: {
    intro:
      "The Lowcountry businesses that defy tidy categories: event venues, nonprofits, education, tech, and more. All local, all part of the Spotlight community.",
    faqs: [
      {
        q: "What is in the Other Services category?",
        a: "Local businesses that do not fit the main categories, from event services and education to niche specialties. Browse the list or use search to find what you need.",
      },
      {
        q: "Can my business be listed here?",
        a: "Yes. If you serve the Charleston Lowcountry, you can list free. Pick the closest category during signup and we will make sure you land in the right place.",
      },
      {
        q: "How do I find a specific service?",
        a: "Use the search box at the top of the directory. It matches business names, descriptions, trades, and neighborhoods instantly.",
      },
    ],
  },
};

export function getCategoryContent(slug: string): CategoryContent | undefined {
  return CATEGORY_CONTENT[slug];
}
