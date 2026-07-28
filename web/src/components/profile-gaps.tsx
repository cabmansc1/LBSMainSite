"use client";

import { useState } from "react";
import type { MissingField } from "@/lib/profile";

/**
 * Asks for the contact details checkout let the advertiser skip.
 *
 * Deliberately not a modal and not dismissible-forever. It is one quiet
 * row at the top of the dashboard that disappears the moment it is
 * answered, because the thing it protects against, a missed artwork
 * deadline, is worth one visible line and not worth a wall.
 */
export function ProfileGaps({ fields }: { fields: MissingField[] }) {
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const needsPhone = fields.some((f) => f.key === "phone");
  if (!needsPhone || state === "done") return null;
  const why = fields.find((f) => f.key === "phone")?.why ?? "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not save.");
      setState("error");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mb-4 bg-cta-tint border border-[#f3ddbb] rounded-(--radius-card) p-5 grid gap-2.5"
    >
      <div>
        <b className="text-[15px] font-bold tracking-tight">
          Add your mobile number
        </b>
        <p className="text-[13px] text-body mt-1 max-w-[62ch]">{why}</p>
      </div>
      <div className="flex gap-2.5 flex-wrap items-start">
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          maxLength={32}
          placeholder="(843) 555-0142"
          aria-label="Mobile number"
          className="flex-1 min-w-[190px] text-[14.5px] px-3.5 py-2.5 rounded-lg bg-white border border-line-strong focus:outline-none focus:border-navy-950"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="text-[14px] font-semibold px-4 py-2.5 rounded-(--radius-btn) bg-navy-950 text-white disabled:opacity-60"
        >
          {state === "sending" ? "Saving..." : "Save"}
        </button>
      </div>
      {error && <p className="text-[12.5px] text-[#b42318]">{error}</p>}
    </form>
  );
}
