"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CORE_SIZES,
  HOUSEHOLDS,
  POSTCARD_PRICING,
  formatPrice,
  type Reach,
  type SpotSize,
} from "@/lib/pricing";
import { EmailCapture } from "@/components/lead-capture";
import { trackQuizComplete } from "@/components/analytics";

/**
 * The four step ad finder, rebuilt from find-your-ad.php. Same questions,
 * same recommendation rule: the largest size the stated budget covers at
 * the chosen reach. Prices come from live pricing rather than the
 * hardcoded config the PHP used, so admin edits reach it.
 */

const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurant / Food", desc: "Dining, catering, food service" },
  { value: "home-services", label: "Home Services", desc: "HVAC, plumbing, roofing, and trades" },
  { value: "health-beauty", label: "Health & Beauty", desc: "Salon, spa, wellness, fitness" },
  { value: "retail", label: "Retail / Shopping", desc: "Shops, boutiques, showrooms" },
  { value: "professional", label: "Professional Services", desc: "Legal, financial, real estate" },
  { value: "other", label: "Other", desc: "Anything else serving the Lowcountry" },
];

const GOALS = [
  { value: "awareness", label: "Brand Awareness", desc: "Be the name people already know" },
  { value: "leads", label: "Generate Leads", desc: "Calls, forms, and quote requests" },
  { value: "sales", label: "Drive Sales", desc: "Move an offer this month" },
  { value: "launch", label: "New Launch", desc: "Open a location or a new service" },
];

const STEPS = [
  "What type of business do you have?",
  "What is your main goal?",
  "How many homes do you want to reach?",
  "What is your budget?",
];

const SUBTITLES = [
  "This helps us tailor our recommendation",
  "What the mailing needs to do for you",
  "Every mailing covers full USPS carrier routes",
  "Set what you want to spend per mailing",
];

export function AdFinder({
  pricing = POSTCARD_PRICING,
}: {
  pricing?: typeof POSTCARD_PRICING;
}) {
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState("");
  const [goal, setGoal] = useState("");
  const [reach, setReach] = useState<Reach>("5k");
  const min = pricing["5k"].small.priceCents;
  const max = pricing["10k"].large.priceCents;
  const [budget, setBudget] = useState(pricing["5k"].medium.priceCents);
  const [done, setDone] = useState(false);

  // The largest size the budget covers at this reach, exactly as the
  // legacy quiz decided it.
  const recommended: SpotSize =
    [...CORE_SIZES].reverse().find((s) => budget >= pricing[reach][s].priceCents) ??
    "small";
  const tier = pricing[reach][recommended];
  const homes = reach === "5k" ? "5,000" : "10,000";

  const canAdvance =
    (step === 0 && businessType) || (step === 1 && goal) || step === 2 || step === 3;

  const optionClass = (active: boolean) =>
    `text-left px-5 py-4 rounded-(--radius-card) border bg-white transition-colors ${
      active ? "border-navy-950 border-[1.5px]" : "border-line hover:border-faint"
    }`;

  const businessLabel = BUSINESS_TYPES.find((b) => b.value === businessType)?.label;
  const goalLabel = GOALS.find((g) => g.value === goal)?.label;

  if (done) {
    return (
      <div className="grid gap-4 max-w-[720px]">
        <div className="bg-white border border-line rounded-(--radius-card) p-7 grid gap-5">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">
            Your recommendation
          </span>
          <div>
            <b className="block text-[26px] font-bold tracking-[-0.03em]">
              {tier.size} ad, {homes} households
            </b>
            <span className="text-[14.5px] text-muted">
              {tier.description} on our shared 9x12 postcard
            </span>
          </div>
          <div className="text-[40px] font-bold tracking-[-0.035em] leading-none num">
            {formatPrice(tier.priceCents)}
            <span className="text-sm font-medium text-muted tracking-normal">
              {" "}
              / mailing
            </span>
          </div>
          <dl className="grid sm:grid-cols-2 gap-2.5">
            {[
              ["Business", businessLabel],
              ["Goal", goalLabel],
              ["Reach", `${homes} homes`],
              ["Budget", formatPrice(budget)],
            ].map(([k, v]) => (
              <div
                key={k as string}
                className="bg-surface border border-line rounded-[10px] px-4 py-3"
              >
                <dt className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                  {k}
                </dt>
                <dd className="text-[14.5px] font-semibold mt-0.5">{v ?? "-"}</dd>
              </div>
            ))}
          </dl>
          <div className="flex gap-3 flex-wrap">
            <Link
              href={`/pricing?reach=${reach}`}
              className="bg-cta text-navy-950 font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors"
            >
              Reserve this spot
            </Link>
            <button
              onClick={() => {
                setDone(false);
                setStep(0);
              }}
              className="bg-white text-ink border border-line-strong font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:border-faint transition-colors"
            >
              Start over
            </button>
          </div>
        </div>
        {/* Answers plus an email is a lead with a stated budget on it,
            which is the most qualified thing this site collects short of
            a sale. save-quiz-lead.php recorded exactly these fields. */}
        <EmailCapture
          source="quiz"
          details={{
            businessTypeLabel: businessLabel ?? "",
            goalLabel: goalLabel ?? "",
            mailingSize: HOUSEHOLDS[reach],
            budget: budget / 100,
            recommendedAdSize: `${recommended[0].toUpperCase()}${recommended.slice(1)} (${tier.size})`,
            recommendedPrice: tier.priceCents / 100,
          }}
          blurb="Leave your email and we will follow up with what is still open on the next card in your area."
          action="Save my result"
          confirmation="Got it. We have your recommendation on file and will be in touch about what is open near you."
        />
        <p className="text-[13px] text-muted">
          Category exclusivity, ad design, print, and postage are included at
          every size.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 max-w-[720px]">
      <div>
        <div className="h-1.5 bg-surface border border-line rounded-full overflow-hidden">
          <div
            className="h-full bg-cta transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="text-[12.5px] text-muted mt-2 num">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      <div>
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">{STEPS[step]}</h2>
        <p className="text-[14.5px] text-muted mt-1">{SUBTITLES[step]}</p>
      </div>

      {step === 0 && (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {BUSINESS_TYPES.map((b) => (
            <button
              key={b.value}
              onClick={() => setBusinessType(b.value)}
              aria-pressed={businessType === b.value}
              className={optionClass(businessType === b.value)}
            >
              <b className="block text-[15px] font-semibold">{b.label}</b>
              <span className="text-[12.5px] text-muted">{b.desc}</span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {GOALS.map((g) => (
            <button
              key={g.value}
              onClick={() => setGoal(g.value)}
              aria-pressed={goal === g.value}
              className={optionClass(goal === g.value)}
            >
              <b className="block text-[15px] font-semibold">{g.label}</b>
              <span className="text-[12.5px] text-muted">{g.desc}</span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {(["5k", "10k"] as Reach[]).map((r) => (
            <button
              key={r}
              onClick={() => setReach(r)}
              aria-pressed={reach === r}
              className={optionClass(reach === r)}
            >
              <b className="block text-[15px] font-semibold num">
                {r === "5k" ? "5,000" : "10,000"} households
              </b>
              <span className="text-[12.5px] text-muted">
                {r === "5k"
                  ? "One neighborhood zone per mailing"
                  : "Double the reach in a single send"}
              </span>
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="bg-white border border-line rounded-(--radius-card) p-7 grid gap-5">
          <div>
            <b className="text-[34px] font-bold tracking-[-0.03em] num">
              {formatPrice(budget)}
            </b>
            <span className="text-[13.5px] text-muted"> per mailing</span>
          </div>
          <div>
            <label htmlFor="budget" className="sr-only">
              Budget per mailing
            </label>
            <input
              id="budget"
              type="range"
              min={min}
              max={max}
              step={100}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-[#ff8c00]"
            />
            <div className="flex justify-between text-[12.5px] text-muted num mt-1">
              <span>{formatPrice(min)}</span>
              <span>{formatPrice(max)}</span>
            </div>
          </div>
          <p className="text-[13.5px] text-body bg-surface border border-line rounded-[10px] px-4 py-3">
            Based on your budget we recommend the{" "}
            <b className="font-semibold">
              {tier.size} ad at {homes} homes
            </b>
            .
          </p>
        </div>
      )}

      <div className="flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="bg-white text-ink border border-line-strong font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:border-faint transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={() => {
            if (step < STEPS.length - 1) {
              setStep(step + 1);
              return;
            }
            setDone(true);
            // The moment showResults() fired these in find-your-ad.php:
            // a recommendation is on screen, so the visitor is a lead.
            trackQuizComplete(businessType, goal);
          }}
          disabled={!canAdvance}
          className="bg-cta text-navy-950 font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === STEPS.length - 1 ? "See my recommendation" : "Continue"}
        </button>
      </div>
    </div>
  );
}
