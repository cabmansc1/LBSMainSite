"use client";

import { useState } from "react";
import { ZONES } from "@/lib/zones";
import {
  FIELD_CLASS,
  Honeypot,
  LABEL_CLASS,
  submitLead,
} from "@/components/lead-capture";
import { CONTACT_PHONE } from "@/lib/seo";

/**
 * The contact form, replacing the advertise/contact path that
 * process_form.php served. Same five fields it required, plus the
 * neighborhood, which the legacy form carried as a hidden package field
 * and which decides which card a lead is even about.
 *
 * Everything optional is marked optional. The one thing this form has to
 * do is get a real person's email into the CRM, and a required field
 * somebody cannot answer is a lead that never arrives.
 */
export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setState("sending");
    setError("");
    try {
      await submitLead("advertise", data);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not go through.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="bg-white border border-line rounded-(--radius-card) p-7 grid gap-2">
        <b className="text-[17px] font-semibold">Thanks, we have it.</b>
        <p className="text-[14.5px] text-muted max-w-[52ch]">
          Someone will reply within one business day. If it is urgent, call or
          text {CONTACT_PHONE} and you will reach a person.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-line rounded-(--radius-card) p-7 grid gap-3.5"
    >
      <div className="grid sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="lead-company" className={LABEL_CLASS}>
            Business name
          </label>
          <input
            id="lead-company"
            name="companyName"
            required
            maxLength={190}
            autoComplete="organization"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="lead-name" className={LABEL_CLASS}>
            Your name
          </label>
          <input
            id="lead-name"
            name="contactName"
            required
            maxLength={190}
            autoComplete="name"
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="lead-email" className={LABEL_CLASS}>
            Email
          </label>
          <input
            id="lead-email"
            name="email"
            type="email"
            required
            maxLength={190}
            autoComplete="email"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="lead-phone" className={LABEL_CLASS}>
            Phone <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="lead-phone"
            name="phone"
            type="tel"
            maxLength={40}
            autoComplete="tel"
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="lead-category" className={LABEL_CLASS}>
            Your industry <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="lead-category"
            name="category"
            maxLength={120}
            placeholder="Roofing, dental, pizza..."
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="lead-location" className={LABEL_CLASS}>
            Neighborhood <span className="font-normal text-muted">(optional)</span>
          </label>
          <select
            id="lead-location"
            name="location"
            defaultValue=""
            className={`${FIELD_CLASS} cursor-pointer`}
          >
            <option value="">Not sure yet</option>
            {ZONES.map((z) => (
              <option key={z.slug} value={z.name}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="lead-message" className={LABEL_CLASS}>
          What can we help with?
        </label>
        <textarea
          id="lead-message"
          name="message"
          rows={4}
          maxLength={4000}
          placeholder="Which mailing you are asking about, what you sell, or anything else."
          className={FIELD_CLASS}
        />
      </div>

      <Honeypot />

      <button
        type="submit"
        disabled={state === "sending"}
        className="justify-self-start bg-cta text-navy-950 font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors disabled:opacity-60"
      >
        {state === "sending" ? "Sending..." : "Send message"}
      </button>

      {error && <p className="text-[13px] text-danger">{error}</p>}
      <p className="text-[12.5px] text-muted">
        We reply within one business day. No spam, no list sharing.
      </p>
    </form>
  );
}
