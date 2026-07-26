"use client";

import { useState } from "react";
import {
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
  triple: { label: "Triple", dims: "3 mediums", note: "Owns a whole band" },
  quad: { label: "Quad", dims: "2 larges", note: "Largest format we print" },
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
  reach,
  availability,
  takenCategories,
  categories,
}: {
  /** Spot preselected from the pricing page link. */
  initialSize?: SpotSize;
  /** Mission Control card being bought onto: a zone can have several. */
  cardId?: string;
  zoneSlug: string;
  zoneName: string;
  mailMonth: string;
  reach: Reach;
  availability: SpotAvail[];
  takenCategories: string[];
  categories: string[];
}) {
  const [size, setSize] = useState<SpotSize>(initialSize ?? "medium");
  const [business, setBusiness] = useState("");
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "waitlisted">("idle");

  const priceCents = POSTCARD_PRICING[reach][size].priceCents;
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
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
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
          {(["small", "medium", "large", "triple", "quad"] as SpotSize[])
            .filter((s) => isOffered(POSTCARD_PRICING[reach]?.[s]))
            .map((s) => {
            const open = openFor(s);
            const sold = open <= 0;
            const meta = SPOT_META[s];
            const p = POSTCARD_PRICING[reach][s];
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
                  className={`rounded border border-[#cbe7fa] bg-brand-tint ${
                    s === "small" ? "w-10 h-7" : s === "medium" ? "w-10 h-13" : "w-13 h-20"
                  }`}
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
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="pc-biz" className="text-[12.5px] font-semibold text-body block mb-1.5">
                Business name
              </label>
              <input
                id="pc-biz"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                maxLength={128}
                placeholder="Palmetto Plumbing Co."
                className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950"
              />
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
                maxLength={255}
                className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950"
              />
            </div>
          </div>
          <div>
            <label htmlFor="pc-cat" className="text-[12.5px] font-semibold text-body block mb-1.5">
              Industry category
            </label>
            <select
              id="pc-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950"
            >
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option
                  key={c}
                  value={c}
                  // Taken categories stay visible so the exclusivity is
                  // obvious, but cannot be chosen.
                  disabled={isTaken(c)}
                >
                  {c}
                  {isTaken(c) ? " (taken on this card)" : ""}
                </option>
              ))}
            </select>
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
        <div className="bg-white rounded-[10px] border border-line p-4 rotate-[1deg] shadow-[0_12px_30px_rgba(11,31,51,.12)]">
          <div className="flex justify-between items-start px-1">
            <span className="font-bold text-[12.5px] tracking-tight">
              Lowcountry <span className="text-brand-deep">Business Spotlight</span>
            </span>
            <span className="w-8 h-10 border border-line-strong rounded-[2px] bg-surface text-muted text-[7px] font-bold flex items-center justify-center text-center leading-tight">
              FIRST
              <br />
              CLASS
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 p-1 pt-2.5">
            <div
              className={`rounded bg-navy-950 text-white flex items-center justify-center text-center p-1.5 ${
                size === "large"
                  ? "col-span-2 row-span-2 min-h-[96px] text-[11px]"
                  : size === "medium"
                    ? "row-span-2 min-h-[96px] text-[9.5px]"
                    : "min-h-[44px] text-[8.5px]"
              } font-semibold leading-snug`}
            >
              {business.trim() || "YOUR BUSINESS HERE"}
            </div>
            {Array.from({ length: size === "large" ? 4 : size === "medium" ? 5 : 7 }).map(
              (_, i) => (
                <div
                  key={i}
                  className="rounded bg-surface border border-line min-h-[44px] flex items-center justify-center text-[8px] font-semibold text-faint"
                >
                  AD
                </div>
              ),
            )}
          </div>
          <p className="text-center text-[9.5px] text-muted pt-2">
            Live preview · {zoneName} edition · {mailMonth}
          </p>
        </div>

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
              <dd className="font-bold num">{formatPrice(priceCents)}</dd>
            </div>
          </dl>
          <button
            onClick={checkout}
            disabled={!ready || status === "sending"}
            className="bg-cta text-navy-950 font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "sending" ? "Starting checkout..." : "Continue to secure payment"}
          </button>
          {status === "error" && (
            <p className="text-sm text-danger">Could not start checkout. Please try again.</p>
          )}
          <p className="text-xs text-muted text-center">
            Payments by Stripe · spot held for 30 minutes · category locks on
            payment
          </p>
        </div>
      </aside>
    </div>
  );
}
