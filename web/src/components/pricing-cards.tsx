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
        body: JSON.stringify({ interest: "smaller-card", zoneSlug: zone, email }),
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
      <p className="text-[13px] text-body mt-3.5 max-w-[560px]">
        Got it. We will email you as soon as the {PLANNED_REACH.attributive} card is
        priced in that neighborhood.
      </p>
    );
  }

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
    <form
      onSubmit={submit}
      className="mt-3.5 max-w-[560px] bg-surface border border-line rounded-xl p-4 grid gap-2.5"
    >
      <p className="text-[13px] text-body">
        A {PLANNED_REACH.attributive} card is coming. Tell us where you want it and we
        will price it for you first.
      </p>
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
          {state === "sending" ? "Sending..." : "Keep me posted"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[13px] text-muted hover:text-body"
        >
          Never mind
        </button>
      </div>
    </form>
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
    sub: "Dominant position",
    features: ["Everything in Medium", "Largest ad on the card", "Priority placement"],
  },
  triple: {
    label: "Triple",
    dims: "3 mediums",
    sub: "Owns a whole band of the card",
    features: ["Everything in Large", "Three medium spots together", "Impossible to skim past"],
  },
  quad: {
    label: "Quad",
    dims: "2 larges",
    sub: "Half the card is yours",
    features: ["Everything in Triple", "Two larges or four mediums", "A half-card takeover"],
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
};

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
  // Keyed by card id where MC gives one, else by zone slug.
  const keyOf = (c: OpenCard) => c.cardId ?? c.zoneSlug;
  const [picked, setPicked] = useState(initialCard);
  const card = cards.find((c) => keyOf(c) === picked);

  // A zone can be filling more than one card at a time, and each card has
  // its own inventory and its own category locks, so the label has to name
  // the mailing when there is a choice to make.
  const zoneCounts = new Map<string, number>();
  for (const c of cards) {
    zoneCounts.set(c.zoneSlug, (zoneCounts.get(c.zoneSlug) ?? 0) + 1);
  }
  const labelFor = (c: OpenCard) => {
    if ((zoneCounts.get(c.zoneSlug) ?? 0) <= 1) return c.zoneName;
    // Two cards in one zone cover different parts of town, so the name
    // and the ZIPs matter more than the month.
    const part = c.cardName ?? `mails ${c.mailMonth}`;
    const zips = c.zips?.length ? ` (${c.zips.join(", ")})` : "";
    return `${c.zoneName}: ${part}${zips}`;
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
    if (!card) return "/coverage-map";
    const q = new URLSearchParams({ spot: size, reach });
    if (card.cardId) q.set("card", card.cardId);
    return `/postcards/${card.zoneSlug}/checkout?${q}`;
  };

  return (
    <>
      <div
        className="inline-flex bg-surface border border-line rounded-[10px] p-[3px] mt-7"
        role="group"
        aria-label="Mailing reach"
      >
        {(["5k", "10k"] as Reach[]).map((r) => (
          <button
            key={r}
            onClick={() => {
              setReach(r);
              remember(picked, r);
            }}
            className={`text-[13.5px] font-semibold px-5 py-2 rounded-lg transition-colors inline-flex items-center gap-2 ${
              reach === r ? "bg-navy-950 text-white" : "text-muted hover:text-body"
            }`}
            aria-pressed={reach === r}
          >
            {r === "5k" ? "5,000 households" : "10,000 households"}
            {/* The flagship used to win by being the initial state, which
                is invisible. Say it. */}
            {r === FLAGSHIP_REACH && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  reach === r
                    ? "bg-white/15 text-white"
                    : "bg-line text-muted"
                }`}
              >
                Standard
              </span>
            )}
          </button>
        ))}
      </div>

      <SmallerCardInterest zoneSlug={card?.zoneSlug} />

      <div className="mt-6 bg-surface border border-line rounded-xl p-5 max-w-[560px]">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="w-6 h-6 rounded-full bg-cta text-navy-950 text-[12px] font-extrabold grid place-items-center">
            1
          </span>
          <b className="text-[15px]">Pick your neighborhood</b>
        </div>
        {cards.length > 0 ? (
          <>
            <select
              value={picked}
              onChange={(e) => {
                setPicked(e.target.value);
                remember(e.target.value, reach);
              }}
              aria-label="Neighborhood"
              className="w-full text-[15px] font-medium px-4 py-3 rounded-[10px] bg-white text-navy-950 border border-line-strong cursor-pointer focus:outline-none focus:border-navy-950"
            >
              <option value="">Choose a neighborhood...</option>
              {cards.map((c) => (
                <option key={keyOf(c)} value={keyOf(c)}>
                  {labelFor(c)}
                </option>
              ))}
            </select>
            {card?.description && (
              <p className="text-[13px] text-body mt-2.5">{card.description}</p>
            )}
            <p className="text-[12.5px] text-muted mt-2">
              {card
                ? `${card.cardName ? `${card.cardName}. ` : ""}Mails ${card.mailMonth}${
                    card.zips?.length ? `, ZIP ${card.zips.join(", ")}` : ""
                  }. Now pick an ad size below to reserve.`
                : `${cards.length} ${cards.length === 1 ? "card is" : "cards are"} open for booking right now.`}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-muted">
            No neighborhoods are open for booking this minute.{" "}
            <a href="/contact" className="text-brand-deep font-semibold hover:underline">
              Tell us where you want to be
            </a>{" "}
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
                {card ? `Reserve ${meta.label}` : `Choose ${meta.label}`}
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
                {priced
                  ? card
                    ? `Reserve ${meta.label}`
                    : `Choose ${meta.label}`
                  : "Talk to us"}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
