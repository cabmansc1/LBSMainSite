"use client";

import { useState } from "react";

const SURFACES = [
  { key: "advertise", label: "Contact form", hint: "Name, phone, message" },
  { key: "quiz", label: "Find Your Ad quiz", hint: "Answers and a recommendation" },
  { key: "roi", label: "ROI calculator", hint: "Projections" },
  { key: "newsletter", label: "Newsletter", hint: "Email and page only" },
  { key: "waitlist", label: "Waitlist", hint: "Category taken" },
  { key: "order", label: "Paid order", hint: "Becomes a customer" },
] as const;

type Result = {
  surface: string;
  configured: boolean;
  accepted: boolean;
  status?: number;
  reply?: string;
  endpoint: string;
  payload: Record<string, unknown>;
};

export function AdminGhlTest() {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function fire(surface: string) {
    setBusy(surface);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/ghl-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ surface }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok !== true) {
        throw new Error(j.error ?? "That did not go. Try signing in again.");
      }
      setResult(j as Result);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SURFACES.map((s) => (
          <button
            key={s.key}
            type="button"
            disabled={busy !== null}
            onClick={() => fire(s.key)}
            className="text-left border border-line rounded-(--radius-card) bg-white px-4 py-3.5 hover:border-faint disabled:opacity-50"
          >
            <b className="block text-[14px] font-semibold">
              {busy === s.key ? "Sending..." : s.label}
            </b>
            <span className="text-[12px] text-muted">{s.hint}</span>
          </button>
        ))}
      </div>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      {result && (
        <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3">
          {!result.configured ? (
            <p className="text-[13.5px] text-danger">
              No webhook is configured for <b>{result.surface}</b>. Set
              GHL_WEBHOOK_{result.surface.toUpperCase()} or GHL_WEBHOOK_URL.
              Nothing was sent.
            </p>
          ) : result.accepted ? (
            <div className="grid gap-1.5">
              <p className="text-[13.5px] text-ok font-semibold">
                Accepted with HTTP {result.status}.
              </p>
              {/* The distinction that costs people an afternoon. */}
              <p className="text-[12.5px] text-muted max-w-[74ch]">
                That means something answered, not that a workflow ran. If no
                execution appears in GoHighLevel, compare the endpoint and the
                reply below against what a webhook trigger should look like.
                A real inbound webhook lives on a leadconnectorhq.com host
                under a path beginning /hooks.
              </p>
            </div>
          ) : (
            <p className="text-[13.5px] text-danger">
              The send failed. The reason is in the server log on a line
              starting <code>[ghl]</code>.
            </p>
          )}

          <dl className="grid sm:grid-cols-2 gap-3 text-[12.5px]">
            <div>
              <dt className="font-semibold uppercase tracking-widest text-[11px] text-muted mb-1">
                Endpoint it went to
              </dt>
              <dd className="font-mono break-all">{result.endpoint}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-widest text-[11px] text-muted mb-1">
                What it replied
              </dt>
              <dd className="font-mono break-all">
                {result.reply?.trim() ? result.reply : "(empty response)"}
              </dd>
            </div>
          </dl>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-1.5">
              What was sent
            </div>
            <pre className="text-[11.5px] leading-relaxed bg-surface border border-line rounded-[8px] p-3.5 overflow-x-auto">
              {JSON.stringify(result.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
