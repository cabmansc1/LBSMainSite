import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { Card } from "@/components/sections";
import { getLivePricing } from "@/lib/pricing-store";
import {
  CORE_SIZES,
  FLAGSHIP_REACH,
  formatPrice,
  isOffered,
} from "@/lib/pricing";
import {
  activeSpecials,
  freeMonths,
  leadMessage,
  areasFor,
  monthsSentence,
  sellUntilLabel,
  type Special,
} from "@/lib/specials";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

// Prices are admin-editable, and a special that quotes a stale number is
// worse than one that quotes none.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Specials",
  description:
    "Limited-run offers on Lowcountry Business Spotlight postcard advertising, including three mailings for the price of two.",
  alternates: { canonical: `${SITE_URL}/specials` },
  openGraph: {
    title: `Specials | ${SITE_NAME}`,
    description: "Limited-run offers on postcard advertising.",
    url: `${SITE_URL}/specials`,
    siteName: SITE_NAME,
    type: "website",
  },
};

/**
 * Whatever is currently on offer.
 *
 * Every special routes to the form at the bottom rather than to
 * checkout. Checkout sells one mailing at a time, so a three-month run
 * cannot go through it without teaching orders to span mailings; these
 * are invoiced by hand instead. That is a deliberate first version — it
 * puts the offer in front of people before a payment flow gets built
 * for something that has not sold yet.
 */
export default async function SpecialsPage() {
  const specials = activeSpecials();
  const pricing = await getLivePricing();

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Specials
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[22ch] text-balance">
            {specials.length
              ? "Book a run, not a single card."
              : "Nothing on offer right now."}
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[58ch]">
            {specials.length
              ? "One mailing gets you seen. Three gets you remembered — the same spot, in the same homes, three months running."
              : "No specials are running at the moment. The standard rates are on the pricing page, and they are the same in every zone."}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12 grid gap-10">
        {specials.length === 0 ? (
          <Card className="p-7 grid gap-3 justify-items-start">
            <b className="text-[17px] font-semibold">
              Want to know when the next one runs?
            </b>
            <p className="text-[14.5px] text-muted max-w-[54ch]">
              Tell us the zone you care about and we will let you know
              before it goes out to the list.
            </p>
            <Link
              href="/contact"
              className="bg-cta text-navy-950 font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors"
            >
              Get in touch
            </Link>
          </Card>
        ) : (
          specials.map((s) => (
            <SpecialCard key={s.id} special={s} pricing={pricing} />
          ))
        )}

        {specials.length > 0 && (
          <section id="claim" className="scroll-mt-8 grid gap-4">
            <div className="max-w-[56ch]">
              <h2 className="text-[22px] font-bold tracking-[-0.02em]">
                Claim it
              </h2>
              <p className="text-[14.5px] text-muted mt-1.5">
                Tell us the area and the size you want and we will confirm
                there is room on all the cards, then send one invoice. No
                payment now, and nothing is booked until you say yes to
                what we send back.
              </p>
            </div>
            <ContactForm
              defaultMessage={leadMessage(specials[0])}
              locations={areasFor(specials[0])}
            />
          </section>
        )}
      </div>
    </>
  );
}

function SpecialCard({
  special: s,
  pricing,
}: {
  special: Special;
  pricing: Awaited<ReturnType<typeof getLivePricing>>;
}) {
  const areas = areasFor(s);
  const free = freeMonths(s);
  // The flagship card. Quoting every reach here turns an offer into a
  // rate table, and the pricing page already is one.
  const rates = pricing[FLAGSHIP_REACH];

  return (
    <Card className="p-7 md:p-9 grid gap-7">
      <div className="grid gap-2.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-brand-deep">
          {s.name} · {s.year}
        </span>
        <h2 className="text-[24px] md:text-[30px] font-bold tracking-[-0.025em] text-balance max-w-[20ch]">
          {s.headline}
        </h2>
        <p className="text-[15.5px] text-body leading-relaxed max-w-[60ch]">
          {s.blurb}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {s.months.map((m, i) => (
          <span
            key={m}
            className={
              // The free one is the point of the offer, so it is the one
              // that looks different.
              i >= s.monthsPaid
                ? "text-[13px] font-semibold px-3.5 py-1.5 rounded-full bg-cta text-navy-950"
                : "text-[13px] font-semibold px-3.5 py-1.5 rounded-full bg-surface border border-line text-body"
            }
          >
            {m}
            {i >= s.monthsPaid && " · free"}
          </span>
        ))}
      </div>

      <div className="grid gap-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-muted">
          What the run costs
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[14.5px] border-collapse min-w-[420px]">
            <thead>
              <tr className="text-left text-[12.5px] uppercase tracking-widest text-muted">
                <th className="font-semibold py-2 pr-4">Spot</th>
                <th className="font-semibold py-2 pr-4">One mailing</th>
                <th className="font-semibold py-2 pr-4">
                  All {s.months.length}
                </th>
                <th className="font-semibold py-2">You keep</th>
              </tr>
            </thead>
            <tbody>
              {CORE_SIZES.filter((size) => isOffered(rates[size])).map(
                (size) => {
                  const each = rates[size].priceCents;
                  return (
                    <tr key={size} className="border-t border-line">
                      <td className="py-2.5 pr-4 font-semibold capitalize">
                        {size}
                        <span className="block text-[12.5px] font-normal text-muted">
                          {rates[size].size}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 num">{formatPrice(each)}</td>
                      <td className="py-2.5 pr-4 num font-semibold">
                        {formatPrice(each * s.monthsPaid)}
                      </td>
                      <td className="py-2.5 num font-semibold text-brand-deep">
                        {formatPrice(each * free)}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[12.5px] text-muted">
          Prices are for the {FLAGSHIP_REACH === "5k" ? "5,000" : "10,000"}
          -home card. Larger spots and the 10,000-home run are on the{" "}
          <Link href="/pricing" className="text-brand-deep font-semibold">
            pricing page
          </Link>{" "}
          and the offer applies to those too.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-7">
        <div className="grid gap-2.5">
          <h3 className="text-[13px] font-semibold uppercase tracking-widest text-muted">
            Where
          </h3>
          {s.areas.length === 0 ? (
            <p className="text-[14.5px] text-body">
              Every area we mail — {areas.length} of them, from {areas[0]} to{" "}
              {areas[areas.length - 1]}. Pick yours on the form below.
            </p>
          ) : (
            <ul className="grid gap-1.5">
              {areas.map((a) => (
                <li
                  key={a}
                  className="text-[14.5px] text-body leading-snug pl-4 relative before:absolute before:left-0 before:top-[0.6em] before:w-1.5 before:h-1.5 before:rounded-full before:bg-brand"
                >
                  {a}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[13px] text-muted">
            Covers the {monthsSentence(s)} {s.year} mailings.
          </p>
        </div>

        <div className="grid gap-2.5">
          <h3 className="text-[13px] font-semibold uppercase tracking-widest text-muted">
            The small print
          </h3>
          <ul className="grid gap-1.5">
            {s.terms.map((t) => (
              <li
                key={t}
                className="text-[13.5px] text-body leading-snug pl-4 relative before:absolute before:left-0 before:top-[0.55em] before:w-1.5 before:h-1.5 before:rounded-full before:bg-line-strong"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <a
          href="#claim"
          className="bg-cta text-navy-950 font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors"
        >
          Claim this offer
        </a>
        <span className="text-[13px] text-muted">
          Offered until {sellUntilLabel(s)}, and only while the cards have
          room.
        </span>
      </div>
    </Card>
  );
}
