import type { Metadata } from "next";
import Link from "next/link";
import { GuidePage, type GuideFaq } from "@/components/guide-page";
import { guideBySlug } from "@/lib/guides";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

const guide = guideBySlug("eddm-cost-charleston")!;

export const metadata: Metadata = {
  title: guide.title,
  description: guide.description,
  alternates: { canonical: `${SITE_URL}/guides/${guide.slug}` },
};

const FAQS: GuideFaq[] = [
  {
    q: "How much does EDDM cost per piece?",
    a: "The USPS retail EDDM rate is about 26 cents a piece as of 2026, but that is postage only. Once printing, design and your own time are counted, a realistic all-in figure for a 5,000-piece run is closer to 46 to 67 cents a home for a mid-size card.",
  },
  {
    q: "Is EDDM cheaper than a shared postcard?",
    a: "No, not per home. EDDM is cheaper per home than a solo mailing with a purchased list, but a shared card splits the same postage and printing between several businesses, which is why a spot starts around five cents a household. EDDM wins on control, not on price.",
  },
  {
    q: "Do you need a mailing permit for EDDM?",
    a: "Not for EDDM Retail, which is the version most small businesses use. You do need to fill in a facing slip, bundle the pieces in hundreds, and physically deliver them to the post office that serves the routes you picked.",
  },
  {
    q: "How many homes are on a postal route in Charleston?",
    a: "Most residential carrier routes in the Charleston area run somewhere between 400 and 1,200 deliverable addresses. You buy whole routes with EDDM, so your reach comes in those increments rather than a round number you choose.",
  },
];

export default function Page() {
  return (
    <GuidePage guide={guide} faqs={FAQS}>
      <p>
        Every Door Direct Mail is the United States Postal Service programme
        that lets a business mail every address on a carrier route without
        buying a list or holding a mailing permit. It is genuinely useful, and
        for some businesses it is the right answer. It is also consistently
        quoted at a price that leaves out most of what it costs.
      </p>
      <p>
        This is the whole bill for a 5,000-piece EDDM campaign in the Charleston
        area, including the parts that do not appear on the USPS page.
      </p>

      <h2>The postage, which is the part everyone quotes</h2>
      <p>
        EDDM Retail postage runs about 26 cents a piece as of 2026. That is
        still a real saving against a first-class stamp and it is what makes the
        programme attractive. It is also only about half of what the campaign
        actually costs.
      </p>
      <p>
        Two constraints come attached. You buy whole carrier routes, so your
        reach arrives in lumps of roughly 400 to 1,200 homes rather than a
        number you choose — asking for 5,000 homes can mean as few as four
        routes, and overshooting by a few hundred homes is normal rather than
        something you can trim. And there is a 5,000-piece daily cap per zip
        code on EDDM Retail, which matters if you were hoping to blanket
        Summerville in one go.
      </p>

      <h2>Printing, which is the part that surprises people</h2>
      <p>
        A 6.5x9 card — around the smallest that qualifies for EDDM — runs
        something like 15 to 25 cents a piece at 5,000 copies, on decent stock,
        printed both sides and delivered to you. Go up to a 9x12 and you are
        closer to 35 to 50 cents.
      </p>
      <p>
        The cheaper sticker prices you will find online are quoted to people who
        already have a print-ready file, order on the printer&rsquo;s schedule
        rather than their own, and pay shipping as a separate line. A business
        ordering one run, once, usually lands at the top of these ranges rather
        than the bottom — and a reprint for a file problem lands above them.
      </p>
      <p>
        Order fewer than 5,000 and the per-piece price climbs steeply. Print is
        a setup-cost business; the first card costs nearly as much as the first
        thousand.
      </p>

      <h2>Design, which is either money or evenings</h2>
      <p>
        A designer who has laid out direct mail before will charge somewhere
        between $250 and $800 for a two-sided oversized card. You can do it
        yourself in Canva, and plenty of businesses do — but a card that looks
        homemade gets binned at the mailbox, and the postage was the same either
        way. This is the line item most likely to decide whether the campaign
        works at all.
      </p>

      <h2>The parts nobody costs at all</h2>
      <ul>
        <li>
          <strong>Bundling.</strong> EDDM pieces go in bundles of 50 to 100 with
          a facing slip on each. For 5,000 pieces that is 50 to 100 bundles,
          counted by hand, by somebody.
        </li>
        <li>
          <strong>The drop-off.</strong> Bundles go to the specific post office
          that serves the routes you selected — not the one nearest you. In a
          region this spread out that can be a real trip, and more than one if
          you picked routes across two offices.
        </li>
        <li>
          <strong>The paperwork.</strong> Forms per route, and a first attempt
          that gets sent back for a formatting problem is common enough to plan
          for.
        </li>
        <li>
          <strong>Reprints.</strong> Get the size or the indicia wrong and the
          post office will not take the mailing. That is the whole print run.
        </li>
      </ul>

      <h2>What it comes to</h2>
      <p>
        Adding it up for 5,000 pieces of a mid-size card: roughly $1,300 of
        postage, $750 to $1,250 of print delivered, and $250 to $800 of design
        if you are not doing it yourself. Call it{" "}
        <strong>$2,300 to $3,350 all in</strong>, which is{" "}
        <strong>46 to 67 cents a household</strong> — plus a day of
        somebody&rsquo;s time bundling and driving.
      </p>
      <p>
        For a 9x12 card of the kind that actually gets noticed, the print side
        alone pushes the total past $3,300.
      </p>

      <h2>When EDDM is the right answer</h2>
      <p>
        Genuinely, sometimes it is. Solo EDDM beats a shared card when:
      </p>
      <ul>
        <li>
          <strong>You need the whole card.</strong> A grand opening, a menu, a
          multi-page offer — anything where a shared spot is too small to carry
          the message.
        </li>
        <li>
          <strong>Your area is not one of ours.</strong> If the homes you want
          are outside the zones we mail, no amount of cost advantage helps you.
        </li>
        <li>
          <strong>Your timing is exact.</strong> A shared card mails when the
          card mails. Solo mail goes when you want it to.
        </li>
        <li>
          <strong>Your budget is comfortable at $3,000 a drop</strong> and you
          would rather own every inch of the card than share it.
        </li>
      </ul>

      <h2>When it is not</h2>
      <p>
        A shared 9x12 card splits that same postage and printing between several
        businesses that do not compete with one another. A spot starts at $249
        for a mailing to 5,000 homes — around{" "}
        <strong>five cents a household</strong>, with design, print and postage
        included and no bundling, no facing slips and no trip to the post
        office.
      </p>
      <p>
        The honest trade is space and timing. You get a portion of the card
        rather than all of it, and it mails on the schedule for that zone. In
        exchange the cost per home drops by roughly a factor of eight, and the
        whole logistical tail disappears. For most local businesses running
        their first direct mail, that is the trade worth making — and if it
        works, the case for spending $3,000 on your own card gets much easier
        to make.
      </p>
      <p>
        For the full comparison across both and everything in between, see{" "}
        <Link href="/guides/direct-mail-cost-per-household">
          direct mail cost per household
        </Link>
        , or the{" "}
        <Link href="/direct-mail-marketing">
          overview of how shared mailings work
        </Link>
        .
      </p>

      <h2>A note on these numbers</h2>
      <p>
        Postage and print prices move. The USPS rate changes at least annually
        and printers quote differently by volume, stock and season. Treat the
        figures here as the right order of magnitude and check the current USPS
        rate before committing — the shape of the answer holds even when the
        exact numbers shift.
      </p>
    </GuidePage>
  );
}
