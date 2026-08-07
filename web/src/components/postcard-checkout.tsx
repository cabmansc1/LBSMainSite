"use client";

import { useState } from "react";
import Link from "next/link";
import { CardPreview } from "@/components/card-preview";
import { CategoryPicker } from "@/components/category-picker";
import type { Orientation } from "@/lib/card-capacity";
import {
  ALL_SIZES,
  isOffered,
  POSTCARD_PRICING,
  formatPrice,
  type Reach,
  type SpotSize,
} from "@/lib/pricing";

type SpotAvail = { size: SpotSize; open: number };

const SPOT_META: Record<SpotSize, { label: string; dims: string; note: string }> = {
  small: { label: "Small", dims: "3″ × 2″", note: "Logo, tagline, QR" },
  medium: { label: "Medium", dims: "3″ × 4″", note: "Offer, photo, QR" },
  large: { label: "Large", dims: "4″ × 6″", note: "Dominant position" },
  triple: { label: "Triple", dims: "3 mediums", note: "Three of four in a band" },
  quad: { label: "Quad", dims: "2 larges", note: "A quarter of the card" },
  full: {
    label: "Full page",
    dims: "one whole side",
    note: "Every spot on the non-postage side",
  },
};

/**
 * Swatches drawn to scale against each other: a medium is twice a small,
 * a large twice a medium, and so on up to the quad at eight smalls. The
 * old fixed classes gave triple and quad the large swatch, which made
 * the two biggest formats look identical to the one below them.
 */
const SWATCH: Record<SpotSize, { width: number; height: number }> = {
  small: { width: 26, height: 14 },
  medium: { width: 26, height: 28 },
  large: { width: 52, height: 28 },
  triple: { width: 52, height: 42 },
  quad: { width: 52, height: 56 },
  full: { width: 52, height: 74 },
};

/**
 * Self-serve Spotlight Postcard checkout: spot size with live counts,
 * business details, category lock, and a live ad preview that renders
 * the buyer's business name onto the card as they type. Falls through
 * to /api/checkout which creates the hold + Stripe session.
 */
export function PostcardCheckout({
  initialSize,
  cardId,
  zoneSlug,
  zoneName,
  mailMonth,
  orientation,
  reach,
  availability,
  takenCategories,
  categories,
  pricing = POSTCARD_PRICING,
  listPricing,
  account,
}: {
  /** Spot preselected from the pricing page link. */
  initialSize?: SpotSize;
  /** Mission Control card being bought onto: a zone can have several. */
  cardId?: string;
  zoneSlug: string;
  zoneName: string;
  mailMonth: string;
  /** How the card is printed, which decides how the preview lays out. */
  orientation: Orientation;
  reach: Reach;
  availability: SpotAvail[];
  takenCategories: string[];
  categories: string[];
  /**
   * Live prices from the admin.
   *
   * This component used to read the POSTCARD_PRICING constant directly
   * while /api/checkout charged getLivePricing(), so a price edited in
   * the admin changed what was billed and not what was shown. A
   * customer could be quoted one number and charged another, which is
   * the shape of a chargeback rather than a display bug. The constant
   * stays as the default so the component still works on its own.
   */
  pricing?: typeof POSTCARD_PRICING;
  /** Set only when this buyer is on an agreed rate, so the saving can be
   *  shown against what everybody else pays. */
  listPricing?: typeof POSTCARD_PRICING;
  /**
   * Who is signed in, when somebody is.
   *
   * Signing in used to change the price and nothing else, so an
   * advertiser still typed their own business name and email into a form
   * we already had both for. Typing either of them differently starts a
   * second record: the order lands under an address their portal does
   * not read, or the campaign arrives in Mission Control under a name
   * that has to be matched back to their listing by guesswork.
   *
   * So the two that split a record are fixed to the account, and the
   * rest are filled in and still editable.
   */
  account?: {
    email: string;
    /** From their listing or their last order. Empty when we know none. */
    businessName: string;
    phone: string;
    /** Their directory category, when it is one this card offers. */
    category: string;
    /** Their agreed rate is being applied to these prices. */
    hasRate: boolean;
  };
}) {
  const [size, setSize] = useState<SpotSize>(initialSize ?? "medium");
  // Prefilled from the account where there is one. A name we hold is
  // locked; a name we do not is an ordinary empty field.
  const lockedName = !!account?.businessName;
  const [business, setBusiness] = useState(account?.businessName ?? "");
  const [category, setCategory] = useState(account?.category ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [phone, setPhone] = useState(account?.phone ?? "");
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "waitlisted">("idle");
  const [reason, setReason] = useState("");

  const priceCents = pricing[reach][size].priceCents;
  const listCents = listPricing?.[reach][size].priceCents;
  const discounted = typeof listCents === "number" && listCents > priceCents;
  const openFor = (s: SpotSize) => availability.find((a) => a.size === s)?.open ?? 0;
  const norm = (v: string) => v.trim().toLowerCase();
  const takenSet = new Set(takenCategories.map(norm));
  const isTaken = (c: string) => takenSet.has(norm(c));
  const takenHere = categories.filter(isTaken);
  const categoryTaken = category !== "" && isTaken(category);
  const [waitlistFor, setWaitlistFor] = useState("");
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const ready =
    business.trim().length > 1 &&
    category !== "" &&
    !categoryTaken &&
    emailOk &&
    openFor(size) > 0;

  async function checkout() {
    if (!ready) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "postcard",
          zoneSlug,
          spotSize: size,
          cardId,
          reach,
          businessName: business.trim(),
          category,
          email,
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      // The server's own words when it has any. It refuses for reasons a
      // buyer can act on — the category went while they were typing, the
      // card closed — and "Could not start checkout" for all of them
      // tells them to retry the one thing that will not work.
      if (!res.ok || !data.url) throw new Error(String(data.error ?? ""));
      window.location.href = data.url;
    } catch (e) {
      setReason(e instanceof Error ? e.message : "");
      setStatus("error");
    }
  }

  async function joinWaitlist(forCategory: string) {
    if (!forCategory) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoneSlug,
          category: forCategory,
          email,
          businessName: business.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("waitlisted");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-5 items-start">
      <div className="grid gap-4">
        <div className="grid gap-2.5" role="radiogroup" aria-label="Ad size">
          {ALL_SIZES
            .filter((s) => isOffered(pricing[reach]?.[s]))
            .map((s) => {
            const open = openFor(s);
            const sold = open <= 0;
            const meta = SPOT_META[s];
            const p = pricing[reach][s];
            return (
              <button
                key={s}
                disabled={sold}
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={`grid grid-cols-[auto_1fr_auto] gap-4 items-center text-left px-5 py-4 rounded-(--radius-card) border bg-white transition-colors ${
                  sold
                    ? "opacity-50 cursor-not-allowed border-line"
                    : size === s
                      ? "border-navy-950 border-[1.5px]"
                      : "border-line hover:border-faint"
                }`}
              >
                <span
                  style={SWATCH[s]}
                  className="rounded border border-[#cbe7fa] bg-brand-tint block shrink-0"
                />
                <span>
                  <b className="block text-[15px] font-semibold tracking-tight">
                    {meta.label} · {meta.dims}
                  </b>
                  <span className="text-[12.5px] text-muted">{meta.note}</span>
                </span>
                <span className="grid gap-1.5 justify-items-end">
                  <b className="text-[19px] font-bold tracking-tight num">
                    {formatPrice(p.priceCents)}
                  </b>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-surface border border-line ${
                      sold ? "text-danger" : open <= 2 ? "text-[#a05e00]" : "text-body"
                    }`}
                  >
                    <span
                      className={`w-[7px] h-[7px] rounded-full ${
                        sold ? "bg-danger" : open <= 2 ? "bg-cta" : "bg-ok"
                      }`}
                    />
                    {sold ? "Sold out" : `${open} open`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="bg-white border border-line rounded-(--radius-card) p-6 grid gap-4">
          <h2 className="text-[16px] font-semibold tracking-tight">Your business</h2>

          {account && (
            // Said plainly, because the two fields below stop being
            // editable and an input that ignores typing with no
            // explanation reads as broken.
            <p className="text-[12.5px] text-body bg-brand-tint border border-brand/25 rounded-[10px] px-3.5 py-2.5">
              Booking as <b>{account.businessName || account.email}</b>. This card
              joins the rest of your campaigns in your account.{" "}
              {lockedName && (
                <>
                  Buying for a different business? Sign out first, or{" "}
                  <Link href="/contact" className="text-brand-deep font-semibold hover:underline">
                    tell us
                  </Link>{" "}
                  and we will set it up.
                </>
              )}
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="pc-biz" className="text-[12.5px] font-semibold text-body block mb-1.5">
                Business name
              </label>
              <input
                id="pc-biz"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                readOnly={lockedName}
                maxLength={128}
                placeholder="Palmetto Plumbing Co."
                aria-describedby={lockedName ? "pc-biz-why" : undefined}
                className={`w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950 ${
                  lockedName ? "bg-surface text-muted" : ""
                }`}
              />
              {lockedName && (
                <p id="pc-biz-why" className="text-[12px] text-muted mt-1.5">
                  From your account, so this card files under the same business
                  as your others.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="pc-email" className="text-[12.5px] font-semibold text-body block mb-1.5">
                Email for receipts and proofs
              </label>
              <input
                id="pc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!!account}
                maxLength={255}
                aria-describedby={account ? "pc-email-why" : undefined}
                className={`w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950 ${
                  account ? "bg-surface text-muted" : ""
                }`}
              />
              {account && (
                // Not a preference. An order bought under a second
                // address is an order their portal will never show them.
                <p id="pc-email-why" className="text-[12px] text-muted mt-1.5">
                  The address you signed in with, so the receipt and the proof
                  reach the same inbox as your account.
                </p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="pc-phone" className="text-[12.5px] font-semibold text-body block mb-1.5">
              Mobile number{" "}
              <span className="font-normal text-muted">(optional)</span>
            </label>
            {/* Optional, and the reason is given rather than assumed.
                Artwork and proof deadlines are the two moments where a
                missed email costs a print slot, and they are the only
                things we text about. Asked for here rather than made
                required, because this is a paid form and friction on it
                costs sales. */}
            <input
              id="pc-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={32}
              placeholder="(843) 555-0142"
              aria-describedby="pc-phone-why"
              className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950"
            />
            <p id="pc-phone-why" className="text-[12px] text-muted mt-1.5">
              Only used to text you about your artwork deadline and your
              proof. Nothing else.
            </p>
          </div>
          <div>
            <label htmlFor="pc-cat" className="text-[12.5px] font-semibold text-body block mb-1.5">
              Industry category
            </label>
            {/* Searchable rather than a native select: the category list
                runs to the low hundreds, and scrolling to find yours is
                the worst moment in the purchase. Taken categories stay
                listed and marked, so exclusivity reads as the product
                rather than as a missing option. */}
            <CategoryPicker
              id="pc-cat"
              categories={categories}
              value={category}
              onChange={setCategory}
              isTaken={isTaken}
              placeholder="Search categories..."
            />
          </div>
          {takenHere.length > 0 && (
            <div className="bg-surface border border-line rounded-[10px] px-4 py-3.5 grid gap-2.5">
              <p className="text-[13px] text-body">
                <b>{takenHere.length}</b>{" "}
                {takenHere.length === 1 ? "category is" : "categories are"}{" "}
                already exclusive on this card: {takenHere.join(", ")}. Only one
                business per category rides a card.
              </p>
              <div className="flex gap-2 flex-wrap items-center">
                <select
                  value={waitlistFor}
                  onChange={(e) => setWaitlistFor(e.target.value)}
                  aria-label="Category to join the waitlist for"
                  className="text-[13.5px] px-3 py-2 border border-line-strong rounded-lg bg-white"
                >
                  <option value="">Want one of them next time?</option>
                  {takenHere.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => joinWaitlist(waitlistFor)}
                  disabled={!waitlistFor || !emailOk || status === "sending"}
                  className="bg-navy-950 text-white font-semibold text-[13px] px-4 py-2 rounded-lg hover:bg-navy-800 disabled:opacity-50"
                >
                  {!emailOk ? "Enter your email above first" : "Join the waitlist"}
                </button>
              </div>
            </div>
          )}
          {status === "waitlisted" && (
            <p className="text-sm font-medium text-ok bg-[#e5f5ec] border border-[#bfe8d2] rounded-[10px] px-4 py-3">
              You are on the {zoneName} waitlist for {waitlistFor || category}. We will email
              you first when the next card opens.
            </p>
          )}
        </div>
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-5">
        <CardPreview
          size={size}
          business={business}
          zoneName={zoneName}
          mailMonth={mailMonth}
          orientation={orientation}
        />

        <div className="bg-white border border-line rounded-(--radius-card) p-6 grid gap-3">
          <h2 className="text-[16px] font-semibold tracking-tight">Order summary</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Zone</dt>
              <dd className="font-semibold">{zoneName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Mailing</dt>
              <dd className="font-semibold">{mailMonth}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Spot</dt>
              <dd className="font-semibold">
                {SPOT_META[size].label} {SPOT_META[size].dims}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Ad design</dt>
              <dd className="font-semibold text-ok">Included</dd>
            </div>
            <div className="flex justify-between border-t border-line-strong pt-3 text-[16px]">
              <dt className="font-bold">Due today</dt>
              <dd className="font-bold num">
                {discounted && (
                  <span className="font-normal text-muted line-through mr-2">
                    {formatPrice(listCents!)}
                  </span>
                )}
                {formatPrice(priceCents)}
              </dd>
            </div>
          </dl>
          {discounted ? (
            <p className="text-[12.5px] font-semibold text-ok -mt-1">
              Your agreed rate{account?.businessName ? ` for ${account.businessName}` : ""},
              already applied.
            </p>
          ) : (
            // A rate that covers some sizes and not others used to say
            // nothing at all on the sizes it misses, which reads as the
            // rate having been forgotten. Better to say where it stands.
            account?.hasRate && (
              <p className="text-[12.5px] text-muted -mt-1">
                Your agreed rate does not cover this spot size, so this one is
                at the list price.
              </p>
            )
          )}
          <button
            onClick={checkout}
            disabled={!ready || status === "sending"}
            className="bg-cta text-navy-950 font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "sending" ? "Starting checkout..." : "Continue to secure payment"}
          </button>
          {status === "error" && (
            <p className="text-sm text-danger">
              {reason || "Could not start checkout. Please try again."}
            </p>
          )}
          {/* True as of the claim written at checkout: the category is
              reserved for half an hour while they pay. It says category
              rather than spot because that is what is actually held. */}
          <p className="text-xs text-muted text-center">
            Payments by Stripe · category held for 30 minutes · locks on payment
          </p>
        </div>
      </aside>
    </div>
  );
}
