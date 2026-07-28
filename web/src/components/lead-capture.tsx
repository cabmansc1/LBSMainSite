"use client";

import { useState } from "react";

/**
 * Shared plumbing for the three lead forms: the contact form, the quiz
 * result, and the ROI calculator. All three post the same JSON to
 * /api/leads and differ only in what they attach to it.
 *
 * The honeypot field is on every one of them. It is the spam control the
 * new site actually ships with, because reCAPTCHA needs keys and the
 * rule here is that nothing depends on a key that is not set.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

let scriptLoad: Promise<void> | null = null;

/**
 * reCAPTCHA v3, loaded only when an operator sets the site key. It has
 * to be set together with RECAPTCHA_SECRET on the server: the server
 * ignores tokens without the secret, and rejects submissions with no
 * token once the secret is set, exactly as process_form.php did. One
 * without the other is the configuration that loses real leads.
 */
function loadRecaptcha(): Promise<void> {
  if (scriptLoad) return scriptLoad;
  scriptLoad = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("reCAPTCHA script blocked"));
    document.head.appendChild(script);
  });
  return scriptLoad;
}

async function recaptchaToken(): Promise<string> {
  if (!SITE_KEY) return "";
  try {
    await loadRecaptcha();
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha) return "";
    await new Promise<void>((resolve) => grecaptcha.ready(resolve));
    return await grecaptcha.execute(SITE_KEY, { action: "lead_submit" });
  } catch (e) {
    console.error("[lead-capture] reCAPTCHA unavailable:", e);
    return "";
  }
}

export type LeadSource = "advertise" | "quiz" | "roi";

/** Throws with a message fit to show the visitor. */
export async function submitLead(
  source: LeadSource,
  fields: Record<string, unknown>,
): Promise<void> {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...fields,
      source,
      recaptchaToken: await recaptchaToken(),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? "That did not go through.");
}

export const FIELD_CLASS =
  "w-full text-[14.5px] px-3.5 py-2.5 bg-white text-navy-950 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950";

export const LABEL_CLASS =
  "text-[12.5px] font-semibold text-body block mb-1.5";

/** Humans never see or fill this. A filled one is dropped server side. */
export function Honeypot() {
  return (
    <input
      type="text"
      name="company_website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="hidden"
    />
  );
}

/**
 * Email capture for the two tools, the quiz and the ROI calculator.
 *
 * One field. Both of these sit at the end of something the visitor came
 * to do, with the answer already on screen, so the form is a small ask
 * beside it rather than a gate in front of it. Asking for a name and a
 * phone number here is how a finished quiz turns into an abandoned one.
 */
export function EmailCapture({
  source,
  details,
  blurb,
  action,
  confirmation,
}: {
  source: LeadSource;
  /** Read at submit time, so it carries whatever is on screen now. */
  details: Record<string, unknown>;
  blurb: string;
  action: string;
  confirmation: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trap = String(new FormData(e.currentTarget).get("company_website") ?? "");
    setState("sending");
    setError("");
    try {
      await submitLead(source, { ...details, email, company_website: trap });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not go through.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="text-[13.5px] text-body bg-surface border border-line rounded-[10px] px-4 py-3.5">
        {confirmation}
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-surface border border-line rounded-[10px] p-4 grid gap-2.5"
    >
      <p className="text-[13.5px] text-body">{blurb}</p>
      <div className="flex gap-2.5 flex-wrap">
        <label htmlFor={`capture-${source}`} className="sr-only">
          Email
        </label>
        <input
          id={`capture-${source}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@business.com"
          className={`${FIELD_CLASS} flex-1 min-w-[200px]`}
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="bg-navy-950 text-white font-semibold text-[14px] px-5 py-2.5 rounded-(--radius-btn) hover:bg-navy-800 transition-colors disabled:opacity-60"
        >
          {state === "sending" ? "Sending..." : action}
        </button>
      </div>
      <Honeypot />
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
    </form>
  );
}
