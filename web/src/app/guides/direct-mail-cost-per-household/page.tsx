import type { Metadata } from "next";
import Link from "next/link";
import { GuidePage, type GuideFaq } from "@/components/guide-page";
import { guideBySlug } from "@/lib/guides";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

const guide = guideBySlug("direct-mail-cost-per-household")!;

export const metadata: Metadata = {
  title: guide.title,
  description: guide.description,
  alternates: { canonical: `${SITE_URL}/guides/${guide.slug}` },
};

const FAQS: GuideFaq[] = [
  {
    q: "What is a typical direct mail cost per household?",
    a: "In the Charleston area it ranges from about five cents a home on a shared oversized postcard to around 52 cents to just over a dollar for a solo EDDM campaign, and 75 cents to well over a dollar for addressed mail to a purchased list. The spread is mostly about how much of the card you own and who else is splitting the postage.",
  },
  {
    q: "Why is shared mail so much cheaper per home?",
    a: "Because postage and printing are paid once for the card, not once per business on it. A 9x12 card carrying several non-competing businesses costs the same to print and mail as one carrying a single business, so splitting it divides the biggest two line items several ways.",
  },
  {
    q: "Is cost per household the right way to compare?",
    a: "Only as a starting point. A cheaper card that nobody reads costs infinitely more per customer than an expensive one that works. Use cost per household to size the budget, then judge on cost per enquiry once you have run something.",
  },
  {
    q: "How many mailings does it take to see a result?",
    a: "Most businesses see calls from a single mailing, but the pattern that works better is the same homes three times. Three mailings to 5,000 homes generally outperforms one mailing to 15,000, because familiarity is what turns a card into a call.",
  },
];

export default function Page() {
  return (
    <GuidePage guide={guide} faqs={FAQS}>
      <p>
        <strong>
          Direct mail in the Charleston Lowcountry costs between about five
          cents and just over a dollar per household, depending on how you do
          it.
        </strong>{" "}
        A spot on a shared oversized postcard sits at the bottom of that range;
        addressed mail to a purchased list sits at the top. Here is what
        accounts for a twenty-fold spread, and which end you should be aiming
        at.
      </p>

      <h2>The range, by method</h2>
      <ul>
        <li>
          <strong>Shared postcard, around 5&cent; a home.</strong> A spot on a
          9x12 card mailed to 5,000 homes, from $249 with design, print and
          postage included. Several non-competing businesses split the card.
        </li>
        <li>
          <strong>Solo EDDM, 52&cent; to $1.05 a home.</strong> Your own card
          to whole postal routes. Postage is cheap; print, design and the
          bundling and drop-off are not.{" "}
          <Link href="/guides/eddm-cost-charleston">
            Full breakdown here
          </Link>
          .
        </li>
        <li>
          <strong>Coupon envelope or shared mailer, 8&cent; to 20&cent;.</strong>{" "}
          Cheap per home, but you are one coupon among forty and usually with no
          protection against a competitor in the same envelope.
        </li>
        <li>
          <strong>Addressed mail to a bought list, 75&cent; to $1.50.</strong>{" "}
          First-class postage, list rental and print. Justified when you are
          targeting a narrow, high-value audience — a $30,000 job makes almost
          any per-home cost look reasonable.
        </li>
      </ul>

      <h2>What actually moves the number</h2>

      <h3>1. How many businesses share the card</h3>
      <p>
        This is the single biggest factor and it is not close. Postage and
        printing are paid per <em>card</em>, not per business on it. A 9x12
        mailed to 5,000 homes costs roughly the same to produce whether it
        carries one business or eight — so eight businesses sharing it each pay
        a fraction of what one would.
      </p>
      <p>
        Everything else on this list moves the number by tens of percent.
        Sharing moves it by a factor of eight.
      </p>

      <h3>2. How much of the card you take</h3>
      <p>
        A small 3x2 spot and a full side of the card reach exactly the same
        5,000 homes. What changes is how much attention you get when the card is
        picked up. Cost per household rises with the size of the spot;
        cost per household who actually notices you does not rise nearly as
        fast.
      </p>

      <h3>3. Reach</h3>
      <p>
        Doubling from 5,000 homes to 10,000 does not double the price, because
        design and setup are already paid for. Per home, the larger run is
        usually a little cheaper. Whether it is a better idea is a separate
        question — see frequency, below.
      </p>

      <h3>4. Design</h3>
      <p>
        A quoted per-piece price that excludes design is not a real price. A
        two-sided oversized card costs $250 to $800 from somebody who has done
        it before. On a 5,000-piece run that is five to sixteen cents a home on
        its own — enough to change which option is cheapest.
      </p>

      <h3>5. Frequency, which changes the maths entirely</h3>
      <p>
        Cost per household is a per-mailing figure, and it quietly assumes one
        mailing is a campaign. It usually is not.
      </p>
      <p>
        Consider two ways to spend the same money. One mailing to 15,000 homes
        reaches three times as many households, once each. Three mailings to the
        same 5,000 homes reaches a third as many, three times each. The second
        almost always produces more calls, because the first card is an
        introduction and the third is a name they recognise. Per household
        reached, the second looks three times more expensive. Per customer
        gained, it is usually cheaper.
      </p>

      <h2>A worked comparison</h2>
      <p>
        Say you have $750 and you want to reach homes in Mount Pleasant.
      </p>
      <ul>
        <li>
          <strong>Option A — one solo EDDM drop.</strong> About 1,400 homes
          once, at roughly 52&cent; each. You own the whole card. You also
          bundle, drive and file the paperwork.
        </li>
        <li>
          <strong>Option B — one shared mailing, larger spot.</strong> 5,000
          homes once, with a 4x6 spot. Three and a half times the reach, a quarter of the
          card.
        </li>
        <li>
          <strong>Option C — three shared mailings, small spot.</strong> The
          same 5,000 homes three times over. Fewer households, far more
          familiarity.
        </li>
      </ul>
      <p>
        For a brand-new business with something to explain, A can be right. For
        a business that needs to be known, C beats both — and it is the reason
        our{" "}
        <Link href="/specials">fourth-quarter run</Link> exists as a single
        booking.
      </p>

      <h2>The number that actually matters</h2>
      <p>
        Cost per household is how you size a budget. It is not how you judge a
        campaign. The number that matters is cost per enquiry, and you cannot
        know it in advance — only after a mailing, by asking every caller where
        they heard about you.
      </p>
      <p>
        A card at five cents a home that produces nothing is infinitely
        expensive. A card at fifty cents a home that fills your calendar for a
        month is cheap. Start with the cheapest credible test, measure honestly,
        and let the second campaign be the one you spend real money on.
      </p>
      <p>
        Not sure it is worth testing at all? That question is worth answering
        properly first —{" "}
        <Link href="/guides/is-direct-mail-worth-it">
          including the cases where the answer is no
        </Link>
        .
      </p>
    </GuidePage>
  );
}
