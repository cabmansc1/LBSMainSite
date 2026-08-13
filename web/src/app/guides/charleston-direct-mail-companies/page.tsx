import type { Metadata } from "next";
import Link from "next/link";
import { GuidePage, type GuideFaq } from "@/components/guide-page";
import { guideBySlug } from "@/lib/guides";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

const guide = guideBySlug("charleston-direct-mail-companies")!;

export const metadata: Metadata = {
  title: guide.title,
  description: guide.description,
  alternates: { canonical: `${SITE_URL}/guides/${guide.slug}` },
};

const FAQS: GuideFaq[] = [
  {
    q: "What are the direct mail options for a Charleston business?",
    a: "Broadly six: shared coupon envelopes such as Valpak and Money Mailer, shared magazines like Clipper, shared oversized postcards, solo EDDM through the USPS, addressed mail to a purchased list, and national online printers who handle print and mailing but not targeting advice.",
  },
  {
    q: "Is Valpak worth it for a small business?",
    a: "It can be, if you are a discount-led business with margin to give away and you are comfortable appearing alongside competitors. The envelope is cheap per home and reaches a lot of them. What it does not give you is exclusivity or much room to say anything beyond an offer.",
  },
  {
    q: "What is the difference between shared mail and a shared postcard?",
    a: "A shared mailer is usually an envelope or magazine containing many separate coupons, often including competitors in your category. A shared oversized postcard carries a handful of businesses on one card, with one business per category, so the format is larger and the competition is not on it.",
  },
  {
    q: "Do I need a local company or can I use a national printer?",
    a: "A national printer will produce and mail a card perfectly well and often cheaply. What they cannot do is tell you which Lowcountry routes are worth mailing, or stop a competitor buying the same neighbourhood the following month. Use them if you already know exactly what you want.",
  },
];

export default function Page() {
  return (
    <GuidePage guide={guide} faqs={FAQS}>
      <p>
        There are six realistic ways to get a printed offer into Lowcountry
        mailboxes. We run one of them, and this page is written by us — so
        rather than pretend otherwise, here is what each is genuinely best at,
        including the cases where the answer is not us.
      </p>

      <h2>1. Coupon envelopes — Valpak, Money Mailer</h2>
      <p>
        A blue envelope of coupons, mailed to a large number of homes for a low
        cost per household. Their reach is real and their pricing is
        competitive.
      </p>
      <p>
        <strong>Best for:</strong> discount-led businesses with margin to give
        away — pizza, oil changes, carpet cleaning, nail salons. If your offer
        is a price, this is a good place to put it.
      </p>
      <p>
        <strong>The trade:</strong> you are one coupon among many, competitors
        can be in the same envelope, and the format only really supports an
        offer. It is a poor fit for a business whose advantage is quality,
        reputation or expertise rather than price. Envelopes also get sorted
        over a bin.
      </p>

      <h2>2. Shared magazines — Clipper and similar</h2>
      <p>
        A booklet of local ads, more editorial in feel than a coupon envelope,
        with more room per advertiser.
      </p>
      <p>
        <strong>Best for:</strong> businesses that need to explain something —
        a service with several parts, a practice, a showroom.
      </p>
      <p>
        <strong>The trade:</strong> a booklet has to be opened and turned
        through, and the page you land on is not your choice. Category
        protection varies by publisher and is worth asking about explicitly.
      </p>

      <h2>3. Shared oversized postcards — what we do</h2>
      <p>
        A 9x12 card carrying a handful of non-competing local businesses, mailed
        to every home in a zone. One business per category, so no competitor
        appears on the card with you.
      </p>
      <p>
        <strong>Best for:</strong> local businesses that want to be known rather
        than just discounted, and for anybody testing direct mail for the first
        time — a spot starts around five cents a household with design, print
        and postage included.
      </p>
      <p>
        <strong>The trade:</strong> you get a portion of the card, not all of
        it, and it mails on that zone&rsquo;s schedule rather than yours. If you
        need the whole card or an exact date, this is the wrong product and
        solo mail is the right one.
      </p>

      <h2>4. Solo EDDM through the USPS</h2>
      <p>
        Your own card to whole carrier routes, no list required, no permit
        needed for the retail version.
      </p>
      <p>
        <strong>Best for:</strong> businesses with a bigger budget who want
        complete control of the card and the timing, and grand openings where
        the whole card needs to be about one thing.
      </p>
      <p>
        <strong>The trade:</strong> the postage looks cheap and the campaign is
        not. All in, expect{" "}
        <Link href="/guides/eddm-cost-charleston">43 to 62 cents a home</Link>{" "}
        once print, design, bundling and the drive to the post office are
        counted — roughly eight times a shared spot.
      </p>

      <h2>5. Addressed mail to a purchased list</h2>
      <p>
        Buy a list filtered by whatever you like — homeowners over a certain
        value, new movers, a specific age band — and mail them individually.
      </p>
      <p>
        <strong>Best for:</strong> high job values and narrow audiences. Roof
        replacements, solar, high-end remodels, anything where one customer is
        worth thousands and the wasted coverage of a whole neighbourhood is the
        expensive part.
      </p>
      <p>
        <strong>The trade:</strong> 75 cents to $1.50 a household, list quality
        varies a lot, and it takes real skill to target well. Cheap lists
        produce expensive mistakes.
      </p>

      <h2>6. National online printers</h2>
      <p>
        Upload a design, pick a radius, and they print and mail it. Efficient
        and often inexpensive.
      </p>
      <p>
        <strong>Best for:</strong> businesses that already know exactly which
        homes they want and have artwork ready.
      </p>
      <p>
        <strong>The trade:</strong> no local knowledge. Nobody at a national
        printer knows which Summerville routes are worth mailing, that
        Sullivan&rsquo;s Island and Isle of Palms only make sense together, or
        that your competitor bought the same zip last month. You are buying
        production, not advice.
      </p>

      <h2>How to choose</h2>
      <ul>
        <li>
          <strong>Your offer is a discount and your margin allows it</strong> —
          a coupon envelope will reach the most homes for the least money.
        </li>
        <li>
          <strong>You need to be remembered, not just clipped</strong> — a
          shared oversized card, ideally more than once to the same homes.
        </li>
        <li>
          <strong>You have a big budget and a big message</strong> — solo EDDM,
          and take the whole card.
        </li>
        <li>
          <strong>One customer is worth thousands</strong> — a targeted list,
          and spend the money on getting the list right.
        </li>
        <li>
          <strong>You have done this before and know what you want</strong> — a
          national printer will be the cheapest way to execute it.
        </li>
      </ul>

      <h2>The question worth asking any of them</h2>
      <p>
        Whoever you end up with, ask what happens if a competitor wants the same
        mailing. The answer separates the options more than price does. On our
        cards it is one business per category and the answer is that they
        cannot. Elsewhere it is often that they can, and will.
      </p>
      <p>
        If you want to see what the shared-card version costs in your area,{" "}
        <Link href="/pricing">pricing is here</Link>, and the{" "}
        <Link href="/direct-mail-marketing">overview explains the format</Link>.
        Still deciding whether to spend anything at all?{" "}
        <Link href="/guides/is-direct-mail-worth-it">Start here instead</Link>.
      </p>
    </GuidePage>
  );
}
