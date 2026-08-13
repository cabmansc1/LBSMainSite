/**
 * Every piece of page copy that can be edited from the admin.
 *
 * No "server-only" here on purpose: the admin editor is a client
 * component and needs the labels, the kinds and the code fallbacks to
 * render the screen. Splitting the registry out from blocks.ts is what
 * keeps a client import from dragging the database in with it.
 *
 * The fallback is not a default. It is the exact string the page ships
 * with, so a block nobody has edited renders what it always rendered,
 * and pressing Reset genuinely returns the page to code rather than
 * freezing today's wording into the database.
 *
 * Adding a block here does nothing on its own. The template has to read
 * it through pageCopy(), and saveBlock refuses any key this file does
 * not list, so a row can never exist that no page reads.
 */

export type BlockKind = "text" | "richtext" | "list";

export type BlockDef = {
  page: string;
  key: string;
  label: string;
  kind: BlockKind;
  /** Exactly what the page renders today. */
  fallback: string | string[];
  hint?: string;
};

export const BLOCK_PAGES: { key: string; label: string; hint: string }[] = [
  { key: "home", label: "Homepage", hint: "Hero, sections and the closing band" },
  { key: "advertise", label: "Advertise", hint: "The postcard product page" },
  { key: "printing", label: "Printing", hint: "The print services and quote page" },
  {
    key: "newsletter",
    label: "Advertiser update",
    hint: "How each new issue starts out",
  },
];

/**
 * Two conventions run through the copy below.
 *
 * *Asterisks* mark one emphasised run inside a line: the coloured phrase
 * in the homepage headline, the bold price in a subheading. Text without
 * them still reads correctly, so nothing breaks if they are dropped.
 *
 * {price} is replaced at render with the live starting price, which is
 * admin-editable on the pricing screen and must not be typed in twice.
 * Removing the token removes the price; it never renders as literal
 * braces.
 */
export const BLOCK_REGISTRY: BlockDef[] = [
  /* ---------------- homepage ---------------- */
  {
    page: "home",
    key: "hero.headline",
    label: "Hero headline",
    kind: "text",
    fallback: "Your business in *5,000 mailboxes.* Your competitors in none.",
    hint: "Wrap one phrase in *asterisks* to color it.",
  },
  {
    page: "home",
    key: "hero.sub",
    label: "Hero subheading",
    kind: "text",
    fallback:
      "Shared 9×12 postcards mailed to Charleston-area neighborhoods. One exclusive spot per industry, professional design included, from *{price}* per mailing.",
    hint: "{price} becomes the live starting price.",
  },
  {
    page: "home",
    key: "hero.cta.primary",
    label: "Hero button",
    kind: "text",
    fallback: "Reserve a Spot",
  },
  {
    page: "home",
    key: "hero.cta.secondary",
    label: "Hero second button",
    kind: "text",
    fallback: "View Coverage Map",
  },
  {
    page: "home",
    key: "hero.proof",
    label: "Hero tick list",
    kind: "list",
    fallback: [
      "No competitors on your card",
      "Free ad design",
      "QR tracking included",
    ],
    hint: "One per line.",
  },
  {
    page: "home",
    key: "why.eyebrow",
    label: "Why it works: label",
    kind: "text",
    fallback: "Why it works",
  },
  {
    page: "home",
    key: "why.title",
    label: "Why it works: heading",
    kind: "text",
    fallback: "Billboard impact, shared cost",
  },
  {
    page: "home",
    key: "why.sub",
    label: "Why it works: intro",
    kind: "text",
    fallback:
      "You share the card, and the cost, with local businesses you do not compete with. Everyone gets seen. Nobody pays billboard prices.",
  },
  {
    page: "home",
    key: "product.eyebrow",
    label: "The product: label",
    kind: "text",
    fallback: "The product",
  },
  {
    page: "home",
    key: "product.title",
    label: "The product: heading",
    kind: "text",
    fallback: "Real cards, real mailboxes",
  },
  {
    page: "home",
    key: "product.sub",
    label: "The product: intro",
    kind: "text",
    fallback:
      "Every card is 9×12, printed on 14pt stock with a high-gloss UV coating, full color on both sides. These are actual cards we mailed.",
  },
  {
    page: "home",
    key: "product.cta",
    label: "The product: link",
    kind: "text",
    fallback: "See past cards by neighborhood",
  },
  {
    page: "home",
    key: "testimonials.eyebrow",
    label: "Testimonials: label",
    kind: "text",
    fallback: "Local businesses on LBS",
  },
  {
    page: "home",
    key: "testimonials.title",
    label: "Testimonials: heading",
    kind: "text",
    fallback: "Trusted around the Lowcountry",
  },
  {
    page: "home",
    key: "steps.eyebrow",
    label: "How it works: label",
    kind: "text",
    fallback: "How it works",
  },
  {
    page: "home",
    key: "steps.title",
    label: "How it works: heading",
    kind: "text",
    fallback: "On a card in three steps",
  },
  {
    page: "home",
    key: "faq.eyebrow",
    label: "Questions: label",
    kind: "text",
    fallback: "Questions",
  },
  {
    page: "home",
    key: "faq.title",
    label: "Questions: heading",
    kind: "text",
    fallback: "Direct mail, answered",
  },
  {
    page: "home",
    key: "cta.sub",
    label: "Closing band: line under the heading",
    kind: "text",
    fallback: "Print deadline is coming. Exclusive categories go fast.",
    hint: "The heading itself names the card that is filling, so it is not editable.",
  },
  {
    page: "home",
    key: "cta.label",
    label: "Closing band: button",
    kind: "text",
    fallback: "Claim Your Category",
  },

  /* ---------------- advertise ---------------- */
  {
    page: "advertise",
    key: "hero.eyebrow",
    label: "Hero label",
    kind: "text",
    fallback: "Spotlight Postcards",
  },
  {
    page: "advertise",
    key: "hero.headline",
    label: "Hero headline",
    kind: "text",
    fallback: "The mailbox is still the best billboard in town.",
    hint: "Wrap one phrase in *asterisks* to color it.",
  },
  {
    page: "advertise",
    key: "hero.sub",
    label: "Hero subheading",
    kind: "text",
    fallback:
      "A 9×12 postcard on 14pt stock with a high-gloss UV coating, full color on both sides, shared by up to eleven exclusive local businesses and mailed to 5,000+ households. From *{price}* per mailing.",
    hint: "{price} becomes the live starting price.",
  },
  {
    page: "advertise",
    key: "hero.cta.primary",
    label: "Hero button",
    kind: "text",
    fallback: "See Pricing",
  },
  {
    page: "advertise",
    key: "hero.cta.secondary",
    label: "Hero second button",
    kind: "text",
    fallback: "See Real Cards",
  },
  {
    page: "advertise",
    key: "value.eyebrow",
    label: "Why postcards: label",
    kind: "text",
    fallback: "Why postcards",
  },
  {
    page: "advertise",
    key: "value.title",
    label: "Why postcards: heading",
    kind: "text",
    fallback: "Big, tangible, and impossible to scroll past",
  },
  {
    page: "advertise",
    key: "proof.eyebrow",
    label: "Proof bar: label",
    kind: "text",
    fallback: "The numbers",
  },
  {
    page: "advertise",
    key: "proof.title",
    label: "Proof bar: heading",
    kind: "text",
    fallback: "Mailed, counted, repeated",
  },
  {
    page: "advertise",
    key: "steps.eyebrow",
    label: "How it works: label",
    kind: "text",
    fallback: "How it works",
  },
  {
    page: "advertise",
    key: "steps.title",
    label: "How it works: heading",
    kind: "text",
    fallback: "On a card in three steps",
  },
  {
    page: "advertise",
    key: "cards.eyebrow",
    label: "Real cards: label",
    kind: "text",
    fallback: "The product",
  },
  {
    page: "advertise",
    key: "cards.title",
    label: "Real cards: heading",
    kind: "text",
    fallback: "Real cards, real mailboxes",
  },
  {
    page: "advertise",
    key: "cards.sub",
    label: "Real cards: intro",
    kind: "text",
    fallback:
      "Every card is 9×12, printed on 14pt stock with a high-gloss UV coating, full color on both sides. These are actual cards we mailed.",
  },
  {
    page: "advertise",
    key: "cards.cta",
    label: "Real cards: link",
    kind: "text",
    fallback: "See past cards by neighborhood",
  },
  {
    page: "advertise",
    key: "coverage.eyebrow",
    label: "Coverage: label",
    kind: "text",
    fallback: "Where we mail",
  },
  {
    page: "advertise",
    key: "coverage.title",
    label: "Coverage: heading",
    kind: "text",
    fallback: "Pick the neighborhoods you want",
  },
  {
    page: "advertise",
    key: "coverage.sub",
    label: "Coverage: intro",
    kind: "text",
    fallback:
      "Every zone mails on its own schedule, so you can buy one neighborhood, a market, or the whole Lowcountry. Each has its own page with ZIP codes, household counts and the dates it goes out.",
  },
  {
    page: "advertise",
    key: "testimonials.eyebrow",
    label: "Testimonials: label",
    kind: "text",
    fallback: "Local businesses on LBS",
  },
  {
    page: "advertise",
    key: "testimonials.title",
    label: "Testimonials: heading",
    kind: "text",
    fallback: "Trusted around the Lowcountry",
  },
  {
    page: "advertise",
    key: "cta.title",
    label: "Closing band: heading",
    kind: "text",
    fallback: "Reserve your spot on the next card.",
  },
  {
    page: "advertise",
    key: "cta.sub",
    label: "Closing band: line under the heading",
    kind: "text",
    fallback:
      "Pick a neighborhood and lock your category before a competitor does.",
  },
  {
    page: "advertise",
    key: "cta.label",
    label: "Closing band: button",
    kind: "text",
    fallback: "Reserve a Spot",
  },
  {
    page: "advertise",
    key: "faq.eyebrow",
    label: "Questions: label",
    kind: "text",
    fallback: "Questions",
  },
  {
    page: "advertise",
    key: "faq.title",
    label: "Questions: heading",
    kind: "text",
    fallback: "Advertising, answered",
  },

  /* ---------------- advertiser update ---------------- */
  /*
   * What a new issue is pre-filled with, not what any existing issue
   * says. Every issue keeps its own copy from the moment it is built, so
   * changing these never rewrites something already drafted or sent, and
   * an issue on screen can still be edited freely on its own page.
   */
  {
    page: "newsletter",
    key: "default.subject",
    label: "Subject line a new issue starts with",
    kind: "text",
    fallback: "Spotlight Advertiser Update, {date}",
    hint: "{date} becomes the issue date, like Aug 15, 2026.",
  },
  {
    page: "newsletter",
    key: "default.preheader",
    label: "Preview line a new issue starts with",
    kind: "text",
    fallback: "Open zones, artwork deadlines and what is still available.",
    hint: "The grey text after the subject in an inbox.",
  },
  {
    page: "newsletter",
    key: "default.why",
    label: "Why they are getting this",
    kind: "text",
    fallback:
      "You are getting this because you have advertised with us, have a listing in our directory, or asked us about advertising around Charleston. It goes out twice a month with open zones and artwork deadlines. If it is not useful, the unsubscribe link at the bottom takes you straight off.",
    hint: "Sits under the greeting. Clear it on an issue to drop the line.",
  },
  {
    page: "newsletter",
    key: "default.intro",
    label: "Opening a new issue starts with",
    kind: "text",
    fallback:
      "Here is where things stand across the Lowcountry right now: what is open, what is closing, and what is coming next.",
  },
  {
    page: "newsletter",
    key: "default.print",
    label: "Print products line",
    kind: "text",
    fallback:
      "Need anything printed? Alongside the postcards we do business cards, flyers, brochures, yard signs, banners, magnets and more. Just reply to this email and tell us what you are after.",
    hint: "Appears in every issue. Clear it on an issue to drop the section.",
  },
  {
    page: "newsletter",
    key: "default.signoff",
    label: "Sign-off a new issue starts with",
    kind: "text",
    fallback: "Andrew\nLowcountry Business Spotlight",
    hint: "Line breaks are kept.",
  },

  /*
   * Printing.
   *
   * The advertise page keeps its FAQ answers in code and makes only the
   * section headings editable. This page deliberately does not, and the
   * reason is what the answers contain: turnaround, the minimum order,
   * how many revisions are included, and who pays for a reprint. Those
   * are operating terms that settle as the trade printer's quotes and
   * schedule firm up, not marketing copy that holds still. Leaving them
   * compiled in would mean a commit and a deploy to state a turnaround,
   * which is the exact thing this table exists to stop.
   *
   * They are also the wording customers are held to, so the page and
   * the proof terms in _print/ have to agree. Editing one is a prompt
   * to check the other.
   *
   * Product names, specs and quantities stay in print-products.ts. They
   * are structured data feeding the offer catalogue in JSON-LD, not
   * prose, and a text box is the wrong shape for them.
   */
  {
    page: "printing",
    key: "hero.eyebrow",
    label: "Hero eyebrow",
    kind: "text",
    fallback: "Printing",
  },
  {
    page: "printing",
    key: "hero.headline",
    label: "Hero headline",
    kind: "text",
    fallback: "Business card and flyer printing in the Lowcountry",
    hint: "Carries the two searches asked about most. Worth keeping both in it.",
  },
  {
    page: "printing",
    key: "hero.sub",
    label: "Hero subheading",
    kind: "text",
    fallback:
      "Cards, flyers, postcards and magnets for Charleston-area businesses — with the design handled, not left to you. Send us what you need and we will come back with a price.",
  },
  {
    page: "printing",
    key: "hero.cta",
    label: "Hero button",
    kind: "text",
    fallback: "Get a quote",
  },
  {
    page: "printing",
    key: "pitch.title",
    label: "Opening section heading",
    kind: "text",
    fallback: "The part most printers make you do yourself",
  },
  {
    page: "printing",
    key: "pitch.body",
    label: "Opening section paragraphs",
    kind: "list",
    fallback: [
      "Order business cards from a national printer and the first thing you are asked for is a print-ready file — 300 DPI, CMYK, correct bleed. For most small businesses that request is where the whole project stops. The cards never get ordered, because the artwork was never the easy part.",
      "If we have designed anything for you before, we already have your logo, your colours, your photographs and your offer sitting in a file. Putting them on a business card is our job, not yours, and it does not cost extra. If we have never worked together, send whatever you have and we will tell you straight away whether it can be used.",
      "The printing itself is competitively priced. The design being handled is the part you cannot get anywhere else.",
    ],
    hint: "One paragraph per line. This is the argument the page rests on.",
  },
  {
    page: "printing",
    key: "products.eyebrow",
    label: "Product list eyebrow",
    kind: "text",
    fallback: "What we print",
  },
  {
    page: "printing",
    key: "products.title",
    label: "Product list heading",
    kind: "text",
    fallback: "The list",
  },
  {
    page: "printing",
    key: "products.sub",
    label: "Product list subheading",
    kind: "text",
    fallback:
      "Quantities shown are the ones worth quoting. Ask for something not on here and we will tell you honestly whether we are the right people for it.",
  },
  {
    page: "printing",
    key: "products.footnote",
    label: "Note under the product list",
    kind: "text",
    fallback:
      "Banners, yard signs and vehicle wraps go through a local sign shop we work with. You still deal with us — we take the brief and the artwork, they produce it.",
  },
  {
    page: "printing",
    key: "steps.eyebrow",
    label: "How it works eyebrow",
    kind: "text",
    fallback: "How it works",
  },
  {
    page: "printing",
    key: "steps.title",
    label: "How it works heading",
    kind: "text",
    fallback: "Four steps, and one of them is yours",
  },
  {
    page: "printing",
    key: "quote.title",
    label: "Quote form heading",
    kind: "text",
    fallback: "Get a quote",
  },
  {
    page: "printing",
    key: "quote.sub",
    label: "Quote form subheading",
    kind: "text",
    fallback:
      "Tell us the product and roughly how many. You do not need to know the stock or the finish — that is what the quote is for. No payment now, and nothing gets printed until you have seen a proof and said yes to it.",
  },
  {
    page: "printing",
    key: "faq.eyebrow",
    label: "FAQ eyebrow",
    kind: "text",
    fallback: "Questions",
  },
  {
    page: "printing",
    key: "faq.title",
    label: "FAQ heading",
    kind: "text",
    fallback: "Before you ask",
  },
  {
    page: "printing",
    key: "faq.1.q",
    label: "FAQ 1 — question",
    kind: "text",
    fallback: "Do I have to supply artwork?",
  },
  {
    page: "printing",
    key: "faq.1.a",
    label: "FAQ 1 — answer",
    kind: "text",
    fallback:
      "No. If we have designed anything for you before — a postcard ad, a flyer, anything — we already hold your logo, colours and photography, and adapting it to another product costs you nothing. If we have never worked together, send whatever you have and we will tell you honestly whether it can be used or needs rebuilding, and what that would cost, before starting.",
  },
  {
    page: "printing",
    key: "faq.2.q",
    label: "FAQ 2 — question",
    kind: "text",
    fallback: "Do you print for businesses that don't advertise with you?",
  },
  {
    page: "printing",
    key: "faq.2.a",
    label: "FAQ 2 — answer",
    kind: "text",
    fallback:
      "Yes. Most of this work comes from businesses already on our postcards, but there is no requirement. If you just need cards printed, that is a perfectly good reason to get in touch.",
    hint: "This is what opens print up beyond existing advertisers. Worth keeping.",
  },
  {
    page: "printing",
    key: "faq.3.q",
    label: "FAQ 3 — question",
    kind: "text",
    fallback: "How fast is it?",
  },
  {
    page: "printing",
    key: "faq.3.a",
    label: "FAQ 3 — answer",
    kind: "text",
    fallback:
      "Turnaround starts when you approve the proof, not when you ask for a quote, and the exact number of days is confirmed on your quote because it depends on the product and the print schedule. If you have a hard deadline — an event, an opening, a mailing date — say so up front and we will work backwards from it.",
    hint: "Name real days here once the printer confirms them. Specific beats vague.",
  },
  {
    page: "printing",
    key: "faq.4.q",
    label: "FAQ 4 — question",
    kind: "text",
    fallback: "How many revisions do I get?",
  },
  {
    page: "printing",
    key: "faq.4.a",
    label: "FAQ 4 — answer",
    kind: "text",
    fallback:
      "One round is included, meaning all your changes sent together rather than one at a time. Further rounds are chargeable, and we will always tell you before a request crosses that line rather than afterwards.",
    hint: "Must match the proof terms in _print/. Change both together.",
  },
  {
    page: "printing",
    key: "faq.5.q",
    label: "FAQ 5 — question",
    kind: "text",
    fallback: "What happens if something is printed wrong?",
  },
  {
    page: "printing",
    key: "faq.5.a",
    label: "FAQ 5 — answer",
    kind: "text",
    fallback:
      "If the printer makes an error, or we do, it is reprinted at no cost to you. If a mistake makes it through onto a proof you approved, a reprint is chargeable at cost — we make nothing on it. That is why the proof stage matters and why it is worth taking an extra day over it.",
    hint: "The one customers test. Saying it here is what keeps it a conversation.",
  },
  {
    page: "printing",
    key: "faq.6.q",
    label: "FAQ 6 — question",
    kind: "text",
    fallback: "Is there a minimum order?",
  },
  {
    page: "printing",
    key: "faq.6.a",
    label: "FAQ 6 — answer",
    kind: "text",
    fallback:
      "There is a minimum order value, mostly so a very small reorder does not end up costing more in handling than it is worth. If you are an existing advertiser and the job falls under it, we will usually add it to your next mailing invoice instead, which is less hassle for everybody.",
    hint: "Name the figure once it is settled on the rate sheet.",
  },
  {
    page: "printing",
    key: "faq.7.q",
    label: "FAQ 7 — question",
    kind: "text",
    fallback: "Do you do banners and signs?",
  },
  {
    page: "printing",
    key: "faq.7.a",
    label: "FAQ 7 — answer",
    kind: "text",
    fallback:
      "Not in house. We work with a local sign shop for anything outdoor or large format — you deal with us, we handle the brief and the artwork, and they produce it. It means you get one point of contact without us pretending to be a sign company.",
  },
];
