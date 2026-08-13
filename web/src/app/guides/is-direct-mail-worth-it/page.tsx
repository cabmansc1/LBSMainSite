import type { Metadata } from "next";
import Link from "next/link";
import { GuidePage, type GuideFaq } from "@/components/guide-page";
import { guideBySlug } from "@/lib/guides";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

const guide = guideBySlug("is-direct-mail-worth-it")!;

export const metadata: Metadata = {
  title: guide.title,
  description: guide.description,
  alternates: { canonical: `${SITE_URL}/guides/${guide.slug}` },
};

const FAQS: GuideFaq[] = [
  {
    q: "Does direct mail still work?",
    a: "For local businesses selling to homeowners, yes — largely because so much marketing spend moved online that the mailbox got quiet. It works poorly for businesses with no local service area, for very narrow B2B products, and for anyone who cannot answer the phone when it rings.",
  },
  {
    q: "What response rate should I expect from a postcard?",
    a: "Be sceptical of the industry averages you will find quoted, which are usually drawn from campaigns with a house list. For a shared card to a cold neighbourhood, a realistic mental model is a handful of calls per thousand homes, varying enormously by category and offer.",
  },
  {
    q: "How do I know if the postcard worked?",
    a: "Ask every caller how they heard about you and write it down, use a QR code or a landing page unique to the card, and compare the two weeks after a drop with the two weeks before. None of these is perfect on its own; together they are enough to make a decision.",
  },
  {
    q: "What is the cheapest way to test direct mail?",
    a: "A small spot on a shared card to one zone — around $249 for 5,000 homes with design included. That is enough to learn whether your offer moves anybody without committing to a print run of your own.",
  },
];

export default function Page() {
  return (
    <GuidePage guide={guide} faqs={FAQS}>
      <p>
        The honest answer is that it depends on what you sell and who you sell
        it to, and the businesses it does not work for are specific enough to
        list. So this starts with those, because a page that says direct mail
        works for everybody is an advert, not an answer.
      </p>

      <h2>When it is not worth it</h2>
      <ul>
        <li>
          <strong>You have no local service area.</strong> If your customers are
          nationwide or online, mailing a neighbourhood is spending money to
          reach people who cannot buy from you.
        </li>
        <li>
          <strong>Your buyer is a specific job title at a specific company.</strong>{" "}
          Narrow B2B is a list problem, not a neighbourhood problem. Mailing
          every home to find eight operations managers is a poor trade.
        </li>
        <li>
          <strong>You cannot answer the phone.</strong> This is the most common
          reason a campaign fails, and it has nothing to do with the card. If
          calls go to voicemail during working hours, the mailing generates
          demand for a competitor.
        </li>
        <li>
          <strong>You need it to pay back this month.</strong> Cards get kept.
          A good chunk of the response arrives weeks later, and a business that
          has to see return within thirty days will conclude it failed while it
          is still working.
        </li>
        <li>
          <strong>You have nothing to say.</strong>{" "}&ldquo;We do plumbing&rdquo;
          is not a reason to call. Without an offer, a reason to act, or something
          genuinely distinctive, the card is a business card mailed to
          strangers.
        </li>
      </ul>

      <h2>When it works well</h2>
      <ul>
        <li>
          <strong>Home services.</strong> Roofing, HVAC, plumbing, pest,
          landscaping, pressure washing. Homeowners keep the card until they
          need it, which is exactly the behaviour the medium rewards.
        </li>
        <li>
          <strong>Restaurants and food, within a tight radius.</strong> People
          eat near where they live. A card that reaches the neighbourhood around
          you is reaching the only people who were ever going to come.
        </li>
        <li>
          <strong>Anything with a high job value.</strong> If one customer is
          worth $8,000, the entire campaign needs one customer. That maths is
          hard to lose.
        </li>
        <li>
          <strong>New businesses and new locations.</strong> Nobody is searching
          for you yet, because they do not know you exist. Mail does not require
          them to already be looking.
        </li>
        <li>
          <strong>Businesses whose customers are not online much.</strong>{" "}
          Skewing older, or in neighbourhoods where word of mouth still does the
          work. The mailbox reaches people the feed does not.
        </li>
      </ul>

      <h2>Why it works better here than it used to</h2>
      <p>
        Not nostalgia — arithmetic. Marketing budgets moved online over the last
        fifteen years, which made online expensive and crowded and left the
        mailbox comparatively empty. A household that gets forty emails and a
        hundred ads a day gets maybe three pieces of real mail. Attention is a
        market, and the mailbox is currently underpriced.
      </p>
      <p>
        The Lowcountry sharpens that. High homeownership, strong neighbourhood
        identity, and a lot of hiring done on a neighbour&rsquo;s
        recommendation. A card from a business two streets away reads as local,
        not as junk.
      </p>

      <h2>What a realistic result looks like</h2>
      <p>
        You will find industry averages quoted between 2% and 9%. Treat them
        with suspicion: most come from campaigns mailing to a house list of
        past customers, which is a completely different thing from a cold
        neighbourhood.
      </p>
      <p>
        A more useful mental model for a shared card to homes that have never
        heard of you is a handful of calls per thousand homes — varying hugely
        by category, offer and season. A roofer after a storm and a boutique in
        February are not the same business.
      </p>
      <p>
        Which is why the only number worth planning around is your own: what a
        customer is worth to you, and how many you need for the mailing to have
        paid for itself. If a $249 spot needs one customer to break even, the
        decision is easy long before you know the response rate.
      </p>

      <h2>How to test it without gambling</h2>
      <ol>
        <li>
          <strong>Start with one zone and one mailing.</strong> A small spot on
          a shared card, around $249 for 5,000 homes with design included. Cheap
          enough that a null result is information rather than a loss.
        </li>
        <li>
          <strong>Put one offer on it.</strong> Not three. A single reason to
          act, with a deadline.
        </li>
        <li>
          <strong>Make it measurable.</strong> A QR code, a dedicated landing
          page, or simply asking every caller and writing it down. Do at least
          one.
        </li>
        <li>
          <strong>Answer the phone.</strong> Genuinely — clear the two weeks
          after the drop.
        </li>
        <li>
          <strong>Judge it at six weeks, not two.</strong> The tail is real and
          most of the giving-up happens before it arrives.
        </li>
      </ol>
      <p>
        If the first mailing produces nothing at all, the offer is usually the
        problem before the medium is. If it produces something, the second and
        third mailings to the same homes are where it compounds — which is the
        argument for a{" "}
        <Link href="/specials">run of three</Link> rather than a single card.
      </p>
      <p>
        Working out the budget? See{" "}
        <Link href="/guides/direct-mail-cost-per-household">
          what direct mail costs per household
        </Link>
        , or compare the options in{" "}
        <Link href="/guides/charleston-direct-mail-companies">
          Charleston direct mail companies
        </Link>
        .
      </p>
    </GuidePage>
  );
}
