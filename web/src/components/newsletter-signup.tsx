"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { FIELD_CLASS, Honeypot } from "@/components/lead-capture";

/**
 * The footer newsletter signup, replacing the .site-newsletter block in
 * footer.php.
 *
 * Email address only. It is the lowest-commitment thing on the site:
 * every other capture asks for a business name or a phone number, and
 * somebody who is only curious will not give either of those yet.
 */

/**
 * Sections where a newsletter band is noise rather than an offer. The
 * footer lives in the root layout, so it renders under the admin
 * dashboard, the advertiser portal and the sign-in pages too. Somebody
 * already signed in is not a visitor to convert, and an admin looking at
 * their own leads table has no use for a subscribe box.
 */
const HIDDEN_PREFIXES = [
  "/admin",
  "/account",
  "/login",
  "/register",
  "/forgot-password",
];

/**
 * The PHP sent basename($_SERVER['PHP_SELF'], '.php'), so the homepage
 * reported "index" and everything else reported its page name. Keeping
 * "index" for "/" means the values arriving in GoHighLevel from this
 * site match the ones already there, rather than starting a second
 * vocabulary for the same pages.
 */
function pageSource(pathname: string): string {
  const slug = pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "-");
  return slug.slice(0, 50) || "index";
}

export function NewsletterSignup() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  // A subscribe box beside a payment form competes with the one action
  // that page exists for.
  if (pathname.endsWith("/checkout")) return null;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trap = String(
      new FormData(e.currentTarget).get("company_website") ?? "",
    );
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: pageSource(pathname),
          company_website: trap,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setMessage(body.error ?? "That did not go through. Please try again.");
        setState("error");
        return;
      }
      // Already subscribed comes back here, not as an error, because it
      // is a confirmation: the address is on the list either way.
      setMessage(body.message ?? "Thanks for subscribing!");
      setState("done");
    } catch {
      setMessage("That did not go through. Please try again.");
      setState("error");
    }
  }

  return (
    <div className="border-b border-white/8">
      <div className="mx-auto max-w-[1120px] px-6 py-9 grid gap-5 md:grid-cols-2 md:items-center">
        <div>
          <h5 className="text-white text-[15px] font-semibold tracking-tight mb-1.5">
            Stay in the loop
          </h5>
          <p className="max-w-[46ch]">
            Get local business tips, new listings, and exclusive deals
            delivered to your inbox.
          </p>
        </div>

        {state === "done" ? (
          <p
            role="status"
            className="text-white md:justify-self-end md:text-right"
          >
            {message}
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-2 md:justify-self-end w-full md:max-w-[420px]">
            <div className="flex gap-2.5 flex-wrap">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={190}
                autoComplete="email"
                placeholder="Enter your email address"
                className={`${FIELD_CLASS} flex-1 min-w-[190px]`}
              />
              <button
                type="submit"
                disabled={state === "sending"}
                /* Blue, not the orange CTA: the design system spends
                   orange once per screen and every page already spends
                   it on the primary action. */
                className="bg-brand text-navy-950 font-semibold text-[14px] px-5 py-2.5 rounded-(--radius-btn) hover:bg-brand-deep hover:text-white transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {state === "sending" ? "Subscribing..." : "Subscribe"}
              </button>
            </div>
            <Honeypot />
            {state === "error" && (
              <p role="alert" className="text-[12.5px] text-[#FF9A9A]">
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
