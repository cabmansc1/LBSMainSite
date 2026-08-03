"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BIG_SIZES,
  CORE_SIZES,
  FLAGSHIP_REACH,
  PLANNED_REACH,
  POSTCARD_PRICING,
  formatPrice,
  centsPerHome,
  type Reach,
  type SpotSize,
} from "@/lib/pricing";
import { ZONES } from "@/lib/zones";

/**
 * "Tell me when you have one of these": a neighborhood and an email.
 *
 * Shared by the two cases where a buyer wants a reach we cannot sell
 * them today, one because it is not priced yet and one because none is
 * scheduled. Both are the same promise and the same demand signal, so
 * they are the same form with different words around it.
 */
function InterestForm({
  interest,
  zoneSlug,
  prompt,
  submitLabel,
  onCancel,
}: {
  interest: "smaller-card" | "larger-card";
  zoneSlug?: string;
  prompt: React.ReactNode;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const [zone, setZone] = useState(zoneSlug ?? "");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  // Picking a neighborhood above should carry down here, but never
  // overwrite a choice already made in this form.
  useEffect(() => {
    if (zoneSlug) setZone((z) => z || zoneSlug);
  }, [zoneSlug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest, zoneSlug: zone, email }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not go through.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not go through.");
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p className="text-[13.5px] text-body">
        Got it. We will email you as soon as one is scheduled in that
        neighborhood.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-2.5">
      <div className="text-[13px] text-body">{prompt}</div>
      <div className="flex gap-2.5 flex-wrap">
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          required
          aria-label="Neighborhood"
          className="flex-1 min-w-[170px] text-[14px] px-3 py-2.5 rounded-[10px] bg-white text-navy-950 border border-line-strong cursor-pointer focus:outline-none focus:border-navy-950"
        >
          <option value="">Which neighborhood?</option>
          {ZONES.map((z) => (
            <option key={z.slug} value={z.slug}>
              {z.name}
            </option>
          ))}
        </select>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@business.com"
          aria-label="Email"
          className="flex-1 min-w-[170px] text-[14px] px-3 py-2.5 rounded-[10px] bg-white text-navy-950 border border-line-strong focus:outline-none focus:border-navy-950"
        />
      </div>
      {error && <p className="text-[12.5px] text-[#b42318]">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === "sending"}
          className="text-[14px] font-semibold px-4 py-2.5 rounded-(--radius-btn) bg-navy-950 text-white disabled:opacity-60"
        >
          {state === "sending" ? "Sending..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[13px] text-muted hover:text-body"
          >
            Never mind
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Interest capture for the smaller card we do not sell yet.
 *
 * Deliberately quiet and deliberately not a third button on the reach
 * toggle. Three equal options turn a flagship into a menu, and an option
 * with no price gives a hesitant buyer a reason to wait rather than buy.
 * This catches the person who would otherwise leave believing 5,000 is
 * our floor, and it records which zone they wanted, which is the demand
 * data needed to price the thing.
 */
function SmallerCardInterest({ zoneSlug }: { zoneSlug?: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <p className="text-[13px] text-muted mt-3.5 max-w-[560px]">
        Planning a smaller run? A {PLANNED_REACH.attributive} card is coming.{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-semibold text-brand-deep hover:underline"
        >
          Tell us your neighborhood
        </button>{" "}
        and we will price it for you first.
      </p>
    );
  }

  return (
    <div className="mt-3.5 max-w-[560px] bg-surface border border-line rounded-xl p-4">
      <InterestForm
        interest="smaller-card"
        zoneSlug={zoneSlug}
        submitLabel="Keep me posted"
        onCancel={() => setOpen(false)}
        prompt={
          <>
            A {PLANNED_REACH.attributive} card is coming. Tell us where you want
            it and we will price it for you first.
          </>
        }
      />
    </div>
  );
}

const CARD_META: Record<
  SpotSize,
  { label: string; dims: string; sub: string; features: string[]; popular?: boolean }
> = {
  small: {
    label: "Small",
    dims: "3″ × 2″",
    sub: "Business-card size",
    features: ["Category exclusivity", "Free ad design", "QR and URL tracking"],
  },
  medium: {
    label: "Medium",
    dims: "3″ × 4″",
    sub: "Double the canvas",
    features: ["Everything in Small", "Room for offer and photo", "Social spotlight post"],
    popular: true,
  },
  large: {
    label: "Large",
    dims: "4″ × 6″",
    // "Largest ad on the card" was written when Large was the top of the
    // range. Triple, Quad and Full page are all bigger, and the claim
    // was sitting directly above three tiers that contradicted it.
    sub: "Four small spots in one",
    features: [
      "Everything in Medium",
      "Room for photos, offer, and hours",
      "Priority placement",
    ],
  },
  // The fractions here are the real ones, from card-capacity.ts: a
  // horizontal card is 192 square inches of ad space, one side is 96,
  // and a band is the four mediums across the top or the bottom of a
  // side. Triple is 36 and Quad is 48, so "a whole band" and "half the
  // card" were both overstating what somebody was buying.
  triple: {
    label: "Triple",
    dims: "3 mediums",
    sub: "Three of the four spots in one band",
    features: ["Everything in Large", "Three medium spots together", "Impossible to skim past"],
  },
  quad: {
    label: "Quad",
    dims: "2 larges",
    sub: "A quarter of the whole card",
    features: ["Everything in Triple", "Two larges or four mediums", "Half of one printed side"],
  },
  full: {
    label: "Full page",
    dims: "one whole side",
    sub: "Every spot on the non-postage side",
    features: ["Everything in Quad", "No other business on your side", "One per card, ever"],
  },
};

const SIZES = CORE_SIZES;
const BIG = BIG_SIZES;

export type OpenCard = {
  /** Mission Control card id, so a zone with two cards filling at once
   *  sends the buyer to the right one. */
  cardId?: string;
  zoneSlug: string;
  zoneName: string;
  mailMonth: string;
  /** What Mission Control calls the card, e.g. "Nexton/Cane Bay". */
  cardName?: string;
  /** ZIPs the card's carrier routes fall in. */
  zips?: string[];
  /** What this card is, written in the admin. */
  description?: string;
  /** Households the card actually reaches, which decides which reach it
   *  can be bought at. */
  households?: number;
};

/**
 * Which reach tier a card belongs to.
 *
 * Mission Control gives a real household count, not a tier, so a card
 * reaching 5,200 homes is a 5,000 card and one reaching 9,800 is a
 * 10,000 card. The midpoint is the only sensible split, and anything
 * without a count is treated as the standard reach rather than being
 * hidden from a page whose job is to sell it.
 */
const reachOf = (c: OpenCard): Reach =>
  (c.households ?? 0) >= 7500 ? "10k" : "5k";

export function PricingCards({
  pricing = POSTCARD_PRICING,
  cards = [],
  initialCard = "",
  initialReach = "5k",
}: {
  pricing?: typeof POSTCARD_PRICING;
  /** Every card open for booking, one entry per card and not per zone. */
  cards?: OpenCard[];
  /** Selection restored from the URL, so the back button keeps it. */
  initialCard?: string;
  initialReach?: Reach;
} = {}) {
  const [reach, setReach] = useState<Reach>(initialReach);
  const [month, setMonth] = useState("");
  // Keyed by card id where MC gives one, else by zone slug.
  const keyOf = (c: OpenCard) => c.cardId ?? c.zoneSlug;
  const [picked, setPicked] = useState(initialCard);

  // Only cards that are actually being mailed at the chosen reach. The
  // toggle used to be pure price selection, so choosing 10,000 and then
  // a neighborhood built a checkout link for a 10,000 household order
  // against a 5,000 household card. Nothing downstream could catch it,
  // because by then it was just a price and a card id.
  const atReach = cards.filter((c) => reachOf(c) === reach);
  const hasReach = (r: Reach) => cards.some((c) => reachOf(c) === r);

  // Months in the order they mail, which is the order the cards arrive
  // in from Mission Control. A Set keeps the first occurrence.
  const months = [...new Set(atReach.map((c) => c.mailMonth))];
  const visible = month ? atReach.filter((c) => c.mailMonth === month) : atReach;

  // The pick has to be one of the cards on offer. Switching reach or
  // month otherwise leaves a stale selection that the Reserve button
  // would happily send to checkout.
  const card = visible.find((c) => keyOf(c) === picked);

  // A zone can be filling more than one card at a time, and each card has
  // its own inventory and its own category locks, so the label has to name
  // the mailing when there is a choice to make.
  const labelFor = (c: OpenCard) => {
    // The card name always shows when it says something the zone name
    // does not. It used to appear only when a zone had two cards in the
    // list at once, which meant filtering to a single month turned
    // "Summerville: Nexton/Cane Bay" back into plain "Summerville", and
    // Nexton and Downtown Summerville are not the same neighborhood.
    const named =
      c.cardName && c.cardName.toLowerCase() !== c.zoneName.toLowerCase()
        ? `${c.zoneName}: ${c.cardName}`
        : c.zoneName;
    // And the month always shows. The dropdown was the one place a buyer
    // could not tell which mailing they were choosing until after they
    // had chosen it.
    return `${named}, mails ${c.mailMonth}`;
  };

  // Keep the choice in the URL. Coming back from checkout then restores
  // it instead of dropping the buyer back on step one.
  const remember = (nextCard: string, nextReach: Reach) => {
    const q = new URLSearchParams();
    if (nextCard) q.set("card", nextCard);
    q.set("reach", nextReach);
    window.history.replaceState(null, "", `/pricing?${q}`);
  };

  // On the way back from checkout the router serves the cached render of
  // this page, which was built before a card was picked, so the props
  // cannot carry the choice. The URL still does. Read it on mount.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const fromUrl = q.get("card");
    if (fromUrl) setPicked(fromUrl);
    if (q.get("reach") === "10k") setReach("10k");
  }, []);

  // Without a card we cannot know what they are buying onto, so the
  // button asks for one first rather than dropping them on a contact form.
  const hrefFor = (size: SpotSize) => {
    // Nothing of this size is being mailed, so there is no card to
    // reserve onto and no honest checkout to send anyone to.
    if (atReach.length === 0 && cards.length > 0) return "/contact";
    if (!card) return "/coverage-map";
    const q = new URLSearchParams({ spot: size, reach });
    if (card.cardId) q.set("card", card.cardId);
    return `/postcards/${card.zoneSlug}/checkout?${q}`;
  };

  /** What the button on a size card should say, given where we are. */
  const ctaFor = (label: string) =>
    atReach.length === 0 && cards.length > 0
      ? `Ask about ${label}`
      : card
        ? `Reserve ${label}`
        : `Choose ${label}`;

  return (
    <>
      <div
        className="inline-flex bg-surface border border-line rounded-[10px] p-[3px] mt-7"
        role="group"
        aria-label="Mailing reach"
      >
        {(["5k", "10k"] as Reach[]).map((r) => {
          // Not disabled. The prices are real and worth reading even when
          // nothing of that size is on the schedule, and a dead button
          // tells a buyer nothing about why. Say which it is instead, and
          // let the step below deal with the consequence.
          const none = cards.length > 0 && !hasReach(r);
          return (
            <button
              key={r}
              onClick={() => {
                setReach(r);
                setPicked("");
                setMonth("");
                remember("", r);
              }}
              className={`text-[13.5px] font-semibold px-5 py-2 rounded-lg transition-colors inline-flex items-center gap-2 ${
                reach === r
                  ? "bg-navy-950 text-white"
                  : none
                    ? "text-faint hover:text-muted"
                    : "text-muted hover:text-body"
              }`}
              aria-pressed={reach === r}
            >
              {r === "5k" ? "5,000 households" : "10,000 households"}
              {none ? (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    reach === r ? "bg-white/15 text-white" : "bg-line text-muted"
                  }`}
                >
                  None scheduled
                </span>
              ) : (
                /* The flagship used to win by being the initial state,
                   which is invisible. Say it. */
                r === FLAGSHIP_REACH && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      reach === r ? "bg-white/15 text-white" : "bg-line text-muted"
                    }`}
                  >
                    Standard
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>

      {/* Not while the step below is already asking for an email about a
          reach we cannot sell today. Two interest forms stacked reads as
          a site that sells nothing. */}
      {atReach.length > 0 && <SmallerCardInterest zoneSlug={card?.zoneSlug} />}

      <div className="mt-6 bg-surface border border-line rounded-xl p-5 max-w-[560px]">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="w-6 h-6 rounded-full bg-cta text-navy-950 text-[12px] font-extrabold grid place-items-center">
            1
          </span>
          <b className="text-[15px]">Pick your neighborhood</b>
        </div>
        {cards.length > 0 && atReach.length === 0 ? (
          // The reach is real and priced, but nothing that size is on the
          // schedule. Offering a neighborhood here is how a 10,000
          // household order got taken against a 5,000 household card.
          <div className="grid gap-2.5">
            <InterestForm
              interest="larger-card"
              zoneSlug={cards[0]?.zoneSlug}
              submitLabel="Tell me when one is scheduled"
              prompt={
                <>
                  No {reach === "10k" ? "10,000" : "5,000"} household cards are
                  on the schedule right now, so there is nothing to book at
                  this reach yet. The prices below are real. Tell us which
                  neighborhood you want one in and we will let you know as
                  soon as it is scheduled, or{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setReach(FLAGSHIP_REACH);
                      setPicked("");
                      setMonth("");
                      remember("", FLAGSHIP_REACH);
                    }}
                    className="font-semibold text-brand-deep hover:underline"
                  >
                    see what is open at{" "}
                    {FLAGSHIP_REACH === "5k" ? "5,000" : "10,000"} households
                  </button>
                  .
                </>
              }
            />
          </div>
        ) : cards.length > 0 ? (
          <>
            {/* Month first, neighborhood second.
                Reading order is the order these get used: the month
                narrows what is on offer, and the neighborhood is the
                actual choice. The other way round, a buyer picked their
                neighborhood and then reached for the month, which is
                exactly when a filter is most likely to invalidate what
                they had already chosen. */}
            <div className="flex gap-2.5 flex-wrap">
              {months.length > 1 && (
                <select
                  value={month}
                  onChange={(e) => {
                    const m = e.target.value;
                    setMonth(m);
                    // Only drop the pick when this filter would actually
                    // hide it. Clearing every time meant going back to
                    // "Any month" threw away a choice that was still on
                    // the list, and a card mailing the month you just
                    // chose was discarded along with the ones that were
                    // not.
                    const survives = atReach.some(
                      (c) => keyOf(c) === picked && (!m || c.mailMonth === m),
                    );
                    if (!survives) {
                      setPicked("");
                      remember("", reach);
                    }
                  }}
                  aria-label="Estimated mailing month"
                  className="flex-1 min-w-[150px] text-[15px] font-medium px-4 py-3 rounded-[10px] bg-white text-navy-950 border border-line-strong cursor-pointer focus:outline-none focus:border-navy-950"
                >
                  <option value="">Any month</option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={picked}
                onChange={(e) => {
                  setPicked(e.target.value);
                  remember(e.target.value, reach);
                }}
                aria-label="Neighborhood"
                className="flex-[2] min-w-[220px] text-[15px] font-medium px-4 py-3 rounded-[10px] bg-white text-navy-950 border border-line-strong cursor-pointer focus:outline-none focus:border-navy-950"
              >
                <option value="">Choose a neighborhood...</option>
                {visible.map((c) => (
                  <option key={keyOf(c)} value={keyOf(c)}>
                    {labelFor(c)}
                  </option>
                ))}
              </select>
            </div>
            {card?.description && (
              <p className="text-[13px] text-body mt-2.5">{card.description}</p>
            )}
            <p className="text-[12.5px] text-muted mt-2">
              {card
                ? `${card.cardName ? `${card.cardName}. ` : ""}Mails ${card.mailMonth}${
                    card.zips?.length ? `, ZIP ${card.zips.join(", ")}` : ""
                  }. Dates are estimated. Now pick an ad size below to reserve.`
                : visible.length === 0
                  ? `Nothing is open in ${month}. Choose another month.`
                  : `${visible.length} ${visible.length === 1 ? "card is" : "cards are"} open for booking${month ? ` in ${month}` : " right now"}.`}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-muted">
            No neighborhoods are open for booking this minute.{" "}
            <Link href="/contact" className="text-brand-deep font-semibold hover:underline">
              Tell us where you want to be
            </Link>{" "}
            and we will hold you a spot on the next card.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5 mt-7 mb-3">
        <span
          className={`w-6 h-6 rounded-full text-[12px] font-extrabold grid place-items-center ${
            card ? "bg-cta text-navy-950" : "bg-surface border border-line text-muted"
          }`}
        >
          2
        </span>
        <b className="text-[15px]">Pick your ad size</b>
      </div>

      <div className="grid md:grid-cols-3 gap-3.5 relative z-10">
        {SIZES.map((size) => {
          const meta = CARD_META[size];
          const tier = pricing[reach][size];
          return (
            <div
              key={size}
              className={`bg-white rounded-(--radius-card) p-7 grid gap-4.5 content-start relative border ${
                meta.popular ? "border-navy-950 border-[1.5px]" : "border-line"
              }`}
            >
              {meta.popular && (
                <span className="absolute -top-[11px] left-6 bg-navy-950 text-white text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {meta.label}
                </div>
                <div className="text-[21px] font-bold tracking-tight mt-1">{meta.dims}</div>
                <div className="text-[14.5px] text-muted">{meta.sub}</div>
              </div>
              <div>
                <div className="text-[42px] font-bold tracking-[-0.035em] leading-none num">
                  {formatPrice(tier.priceCents)}
                  <span className="text-sm font-medium text-muted tracking-normal">
                    {" "}
                    / mailing
                  </span>
                </div>
                <div className="text-[12.5px] text-muted mt-1.5 num">
                  {centsPerHome(tier.priceCents, reach)}
                </div>
              </div>
              <ul className="grid gap-2 text-[13.5px] text-body">
                {meta.features.map((f) => (
                  <li key={f} className="flex gap-2 items-start">
                    <svg className="text-ok mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={hrefFor(size)}
                className={`inline-flex items-center justify-center font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) transition-colors ${
                  meta.popular
                    ? "bg-cta text-navy-950 hover:bg-cta-hover hover:text-white"
                    : "bg-white text-ink border border-line-strong hover:border-faint"
                }`}
              >
                {ctaFor(meta.label)}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-3.5 grid md:grid-cols-3 gap-3.5 relative z-10">
        {BIG.map((size) => {
          const meta = CARD_META[size];
          const tier = pricing[reach]?.[size];
          // A price of zero means the size is not sold at this reach, and
          // the format is big enough that dropping it off the page reads
          // as though it does not exist. Show it and route to a
          // conversation instead.
          const priced = (tier?.priceCents ?? 0) > 0;
          return (
            <div
              key={size}
              className="bg-white rounded-(--radius-card) p-6 border border-line grid gap-3.5 content-start"
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {meta.label}
                </div>
                <div className="text-[17px] font-bold tracking-tight mt-1">
                  {meta.dims}
                </div>
                <div className="text-[13.5px] text-muted">{meta.sub}</div>
              </div>
              <div>
                <div className="text-[30px] font-bold tracking-[-0.03em] leading-none num">
                  {priced ? formatPrice(tier.priceCents) : "On request"}
                  {priced && (
                    <span className="text-sm font-medium text-muted tracking-normal">
                      {" "}
                      / mailing
                    </span>
                  )}
                </div>
                <div className="text-[12.5px] text-muted mt-1.5 num">
                  {priced
                    ? centsPerHome(tier.priceCents, reach)
                    : "Ask us about this reach"}
                </div>
              </div>
              <Link
                href={priced ? hrefFor(size) : "/contact"}
                className="inline-flex items-center justify-center font-semibold text-[14.5px] px-5 py-2.5 rounded-(--radius-btn) bg-white text-ink border border-line-strong hover:border-faint transition-colors"
              >
                {priced ? ctaFor(meta.label) : "Talk to us"}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
