"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push("/account");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Sign in failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <label htmlFor="li-email" className="text-[12.5px] font-semibold text-body block mb-1.5">
          Email
        </label>
        <input
          id="li-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950"
        />
      </div>
      <div>
        <label htmlFor="li-pass" className="text-[12.5px] font-semibold text-body block mb-1.5">
          Password
        </label>
        <input
          id="li-pass"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="bg-navy-950 text-white font-semibold text-[15px] px-6 py-3 rounded-(--radius-btn) hover:bg-navy-800 transition-colors disabled:opacity-60"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
