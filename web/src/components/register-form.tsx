"use client";

import { useState } from "react";
import Link from "next/link";

type Option = { name: string; slug: string };
type Plan = "basic" | "monthly" | "annual";

const field =
  "w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950";
const label = "text-[12.5px] font-semibold text-body block mb-1.5";

function Field({
  id,
  title,
  hint,
  error,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {title}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-[#b42318] mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-muted mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

export function RegisterForm({
  categories,
  locations,
  monthly,
  annual,
  annualSaving,
  paymentsOn,
  prefill,
}: {
  categories: Option[];
  locations: Option[];
  monthly: string;
  annual: string;
  annualSaving: string | null;
  /** False when Stripe has no key, so the paid plans cannot be honoured. */
  paymentsOn: boolean;
  /**
   * What we already know, for an advertiser who is signed in.
   *
   * Somebody who has bought a postcard spot has already given us their
   * business name, phone and email. Asking for them again is the
   * difference between a form they finish and a form they close.
   */
  prefill?: Partial<Record<"businessName" | "contactName" | "email" | "phone", string>>;
}) {
  const [plan, setPlan] = useState<Plan>("basic");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    businessName: prefill?.businessName ?? "",
    contactName: prefill?.contactName ?? "",
    email: prefill?.email ?? "",
    phone: prefill?.phone ?? "",
    website: "",
    description: "",
    category: "",
    locationArea: "",
    company_website: "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const PLANS: { key: Plan; name: string; price: string; note: string }[] = [
    { key: "basic", name: "Basic", price: "Free", note: "forever" },
    { key: "monthly", name: "Premium", price: monthly, note: "per month" },
    {
      key: "annual",
      name: "Premium",
      price: annual,
      note: annualSaving ? `per year, saves ${annualSaving}` : "per year",
    },
  ];

  async function submit() {
    setBusy(true);
    setErr("");
    setFieldErrors({});
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, plan }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (j.fields) setFieldErrors(j.fields);
        throw new Error(j.error ?? "That did not go through.");
      }
      // Paid plans hand off to Stripe. Free ones finish here.
      if (j.url) {
        window.location.href = j.url;
        return;
      }
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not go through.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="grid gap-3">
        <h2 className="text-[19px] font-bold tracking-tight">
          Got it. Your listing is with us.
        </h2>
        <p className="text-[14px] text-body leading-relaxed">
          We check every free listing before it goes live, usually the same
          day. You will get an email when it is published.
        </p>
        <p className="text-[14px] text-body leading-relaxed">
          {/* They have an account they never chose a password for, so
              the route in has to be spelled out. */}
          We have made you an account under {form.email}. To edit your listing,
          sign in with that address and we will email you a code. There is no
          password to remember.
        </p>
        <Link
          href="/login"
          className="justify-self-start text-[14px] font-semibold px-4 py-2.5 rounded-(--radius-btn) bg-navy-950 text-white hover:bg-navy-800"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-2.5">
        <legend className={label}>Choose your listing</legend>
        <div className="grid sm:grid-cols-3 gap-2.5">
          {PLANS.map((p) => {
            const disabled = p.key !== "basic" && !paymentsOn;
            const active = plan === p.key;
            return (
              <button
                key={p.key}
                type="button"
                disabled={disabled}
                onClick={() => setPlan(p.key)}
                aria-pressed={active}
                className={`text-left p-3.5 rounded-xl border transition-colors ${
                  active
                    ? "border-navy-950 bg-navy-950 text-white"
                    : "border-line-strong bg-white hover:border-navy-950"
                } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <span className="text-[12px] font-bold uppercase tracking-wider block">
                  {p.name}
                </span>
                <span className="text-[19px] font-bold tracking-tight num block">
                  {p.price}
                </span>
                <span
                  className={`text-[12px] block ${active ? "text-[#93A5B8]" : "text-muted"}`}
                >
                  {p.note}
                </span>
              </button>
            );
          })}
        </div>
        {!paymentsOn && (
          <p className="text-[12px] text-muted">
            Premium is not available to buy online just yet. Get in touch and
            we will set it up.
          </p>
        )}
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-3.5">
        <Field id="rf-business" title="Business name" error={fieldErrors.businessName}>
          <input
            id="rf-business"
            value={form.businessName}
            onChange={(e) => set("businessName", e.target.value)}
            className={field}
          />
        </Field>
        <Field id="rf-contact" title="Your name">
          <input
            id="rf-contact"
            value={form.contactName}
            onChange={(e) => set("contactName", e.target.value)}
            className={field}
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3.5">
        <Field
          id="rf-email"
          title="Email"
          hint="How you sign in, and how customers reach you."
          error={fieldErrors.email}
        >
          <input
            id="rf-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={field}
          />
        </Field>
        <Field id="rf-phone" title="Phone" error={fieldErrors.phone}>
          <input
            id="rf-phone"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(843) 555-0142"
            className={field}
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3.5">
        <Field id="rf-category" title="Category" error={fieldErrors.category}>
          <select
            id="rf-category"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className={field}
          >
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="rf-area" title="Area" error={fieldErrors.locationArea}>
          <select
            id="rf-area"
            value={form.locationArea}
            onChange={(e) => set("locationArea", e.target.value)}
            className={field}
          >
            <option value="">Choose an area</option>
            {locations.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        id="rf-website"
        title="Website"
        hint="Optional. We will add https:// for you."
        error={fieldErrors.website}
      >
        <input
          id="rf-website"
          value={form.website}
          onChange={(e) => set("website", e.target.value)}
          placeholder="yourbusiness.com"
          className={field}
        />
      </Field>

      <Field
        id="rf-description"
        title="What you do"
        hint="A couple of sentences. This is the part people read before they call."
        error={fieldErrors.description}
      >
        <textarea
          id="rf-description"
          rows={5}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className={`${field} leading-relaxed`}
        />
      </Field>

      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <div className="hidden" aria-hidden>
        <label htmlFor="company_website">Company website</label>
        <input
          id="company_website"
          tabIndex={-1}
          autoComplete="off"
          value={form.company_website}
          onChange={(e) => set("company_website", e.target.value)}
        />
      </div>

      {/* Only when it is not already sitting under the field it is
          about. The same sentence twice on one screen reads as two
          different problems. */}
      {err && Object.keys(fieldErrors).length === 0 && (
        <p className="text-[13px] text-[#b42318]">{err}</p>
      )}
      {Object.keys(fieldErrors).length > 0 && (
        <p className="text-[13px] text-[#b42318]">
          Check the highlighted {Object.keys(fieldErrors).length === 1 ? "field" : "fields"} above.
        </p>
      )}

      <div className="grid gap-2 justify-items-start">
        <button
          onClick={submit}
          disabled={busy}
          className="text-[14.5px] font-semibold px-5 py-3 rounded-(--radius-btn) bg-cta text-navy-950 hover:bg-cta-hover hover:text-white transition-colors disabled:opacity-60"
        >
          {busy
            ? "Working..."
            : plan === "basic"
              ? "List my business free"
              : "Continue to payment"}
        </button>
        <p className="text-[12px] text-muted">
          {plan === "basic"
            ? "We check every free listing before it goes live, usually the same day."
            : "Card details are handled by Stripe. Your listing goes live as soon as the payment clears."}
        </p>
      </div>
    </div>
  );
}
