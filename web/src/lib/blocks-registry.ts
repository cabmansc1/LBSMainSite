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
    hint: "Wrap one phrase in *asterisks* to colour it.",
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
    hint: "Wrap one phrase in *asterisks* to colour it.",
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
];
