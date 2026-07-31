"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Two ways in, code first.
 *
 * Buying does not create a password, so for most advertisers the code
 * is the only route that works and it leads. Existing directory members
 * have real bcrypt passwords from the legacy site, which still work, so
 * the password form stays rather than being retired out from under
 * them.
 *
 * The code path is two steps in one component on purpose: sending the
 * user to a second page loses the email they just typed, and asking
 * them to retype it while holding a code in their head is exactly where
 * people give up.
 */
export function LoginForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"code" | "password">("code");
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const done = () => {
    router.push("/account");
    router.refresh();
  };

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json } as { ok: boolean; json: Record<string, string> };
  };

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { ok, json } = await post("/api/auth/request-code", { email });
    setBusy(false);
    if (!ok) return setError(json.error ?? "Could not send a code.");
    setNotice(json.message ?? "Check your email.");
    setStep("code");
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { ok, json } = await post("/api/auth/verify-code", { email, code });
    if (ok) return done();
    setBusy(false);
    setError(json.error ?? "That code is not right.");
  }

  async function submitPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const { ok, json } = await post("/api/auth/login", data);
    if (ok) return done();
    setBusy(false);
    setError(json.error ?? "Sign in failed. Please try again.");
  }

  const field =
    "w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950";
  const button =
    "bg-navy-950 text-white font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-navy-800 transition-colors disabled:opacity-60";

  if (mode === "password") {
    return (
      <form onSubmit={submitPassword} className="grid gap-4">
        <div>
          <label htmlFor="li-email" className="text-[12.5px] font-semibold text-body block mb-1.5">
            Email
          </label>
          <input id="li-email" name="email" type="email" required autoComplete="email" className={field} />
        </div>
        <div>
          <label htmlFor="li-pass" className="text-[12.5px] font-semibold text-body block mb-1.5">
            Password
          </label>
          <input id="li-pass" name="password" type="password" required autoComplete="current-password" className={field} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={busy} className={button}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => { setMode("code"); setError(""); }}
          className="text-[13px] text-brand-deep font-semibold hover:underline justify-self-start"
        >
          Email me a code instead
        </button>
      </form>
    );
  }

  if (step === "email") {
    return (
      <form onSubmit={requestCode} className="grid gap-4">
        <div>
          <label htmlFor="li-email" className="text-[12.5px] font-semibold text-body block mb-1.5">
            Email
          </label>
          <input
            id="li-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
          <p className="text-[12px] text-muted mt-1.5">
            We will email you a six digit code. No password needed.
          </p>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={busy} className={button}>
          {busy ? "Sending..." : "Email me a code"}
        </button>
        <button
          type="button"
          onClick={() => { setMode("password"); setError(""); }}
          className="text-[13px] text-brand-deep font-semibold hover:underline justify-self-start"
        >
          I have a password
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitCode} className="grid gap-4">
      {notice && <p className="text-[13px] text-body">{notice}</p>}
      <div>
        <label htmlFor="li-code" className="text-[12.5px] font-semibold text-body block mb-1.5">
          Your code
        </label>
        <input
          id="li-code"
          // Numeric keypad on phones, and one-time-code lets iOS and
          // Android offer the code straight from the notification.
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={7}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          className={`${field} text-[22px] tracking-[0.3em] font-semibold num`}
        />
        <p className="text-[12px] text-muted mt-1.5">
          Sent to {email}. It expires in 10 minutes.
        </p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy} className={button}>
        {busy ? "Checking..." : "Sign in"}
      </button>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => { setStep("email"); setCode(""); setError(""); setNotice(""); }}
          className="text-[13px] text-brand-deep font-semibold hover:underline"
        >
          Use a different email
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={(e) => { setCode(""); requestCode(e); }}
          className="text-[13px] text-muted hover:text-body"
        >
          Send another code
        </button>
      </div>
    </form>
  );
}
