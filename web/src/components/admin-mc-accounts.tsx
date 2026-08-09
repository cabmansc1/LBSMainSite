"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The Mission Control customer list, with what each one is missing.
 *
 * The default selection is everybody who still needs the thing the
 * button does, because the common case is "set up the ones that are not
 * set up". Customers with nothing missing stay on the list, ticked off,
 * so the count on the page and the number of businesses visible always
 * agree; a list that hides its finished rows is one you cannot check.
 */

export type McAccountRow = {
  email: string;
  businessName: string;
  contactName: string;
  phone: string;
  category: string;
  cards: number;
  lastCard: string;
  lastMailDateIso: string;
  paidCents: number;
  hasLogin: boolean;
  hasListing: boolean;
  categorySlug: string;
  blocked?: string;
};

type Result = { created: number; skipped: number; errors: { email: string; error: string }[] };

const money = (cents: number) =>
  cents > 0 ? `$${Math.round(cents / 100).toLocaleString()}` : "";

export function AdminMcAccounts({ rows }: { rows: McAccountRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"" | "logins" | "listings">("");
  const [result, setResult] = useState<(Result & { what: string }) | null>(null);
  const [err, setErr] = useState("");
  // Counting them was never the hard part. Reading the list was: they
  // were mixed in with everybody else, so "who cannot be contacted"
  // meant scrolling two hundred rows looking for a blank column.
  const [noEmailOnly, setNoEmailOnly] = useState(false);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const base = noEmailOnly ? rows.filter((r) => !r.email) : rows;
    if (!q) return base;
    return base.filter(
      (r) =>
        r.businessName.toLowerCase().includes(q) ||
        r.email.includes(q) ||
        r.category.toLowerCase().includes(q),
    );
  }, [rows, filter, noEmailOnly]);

  const needsLogin = rows.filter((r) => !r.blocked && !r.hasLogin);
  const needsListing = rows.filter(
    (r) => !r.blocked && !r.hasListing && r.businessName.trim(),
  );
  const unreachable = rows.filter((r) => r.blocked);

  const toggle = (email: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });

  const selectAll = (list: McAccountRow[]) =>
    setPicked(new Set(list.map((r) => r.email)));

  async function run(action: "create-logins" | "create-listings") {
    setBusy(action === "create-logins" ? "logins" : "listings");
    setErr("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/mc-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, emails: [...picked] }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not finish.");
      setResult({
        what: action === "create-logins" ? "logins" : "listings",
        created: Number(j.created ?? 0),
        skipped: Number(j.skipped ?? 0),
        errors: j.errors ?? [],
      });
      setPicked(new Set());
      // The badges on every row are now stale, and a screen that still
      // says "no login" after making one is how the same button gets
      // pressed twice.
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not finish.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by business, email or category"
          className="text-sm px-3 py-2 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950 min-w-[260px] flex-1"
        />
        <button
          type="button"
          onClick={() => selectAll(needsLogin)}
          className="text-[12.5px] font-semibold px-3 py-2 rounded-[10px] border border-line-strong bg-white hover:bg-surface"
        >
          Select {needsLogin.length} without a login
        </button>
        <button
          type="button"
          onClick={() => selectAll(needsListing)}
          className="text-[12.5px] font-semibold px-3 py-2 rounded-[10px] border border-line-strong bg-white hover:bg-surface"
        >
          Select {needsListing.length} without a listing
        </button>
        {picked.size > 0 && (
          <button
            type="button"
            onClick={() => setPicked(new Set())}
            className="text-[12.5px] font-semibold text-muted hover:text-navy-950"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border border-line rounded-(--radius-card) bg-white px-4 py-3">
        <span className="text-[13px] font-semibold">
          {picked.size} selected
        </span>
        <button
          type="button"
          disabled={picked.size === 0 || busy !== ""}
          onClick={() => run("create-logins")}
          className="bg-navy-950 text-white text-[13px] font-bold px-4 py-2 rounded-(--radius-btn) hover:bg-navy-800 disabled:opacity-40"
        >
          {busy === "logins" ? "Creating..." : "Create logins"}
        </button>
        <button
          type="button"
          disabled={picked.size === 0 || busy !== ""}
          onClick={() => run("create-listings")}
          className="bg-white text-navy-950 text-[13px] font-bold px-4 py-2 rounded-(--radius-btn) border border-line-strong hover:bg-surface disabled:opacity-40"
        >
          {busy === "listings" ? "Creating..." : "Create listings"}
        </button>
        <span className="text-[12.5px] text-muted">
          Listings are created unverified, so they wait under Pending review
          in Directory and nothing appears publicly until you approve it.
          Nobody is emailed.
        </span>
      </div>

      {err && (
        <p className="text-[13px] font-semibold text-[#a33]">{err}</p>
      )}
      {result && (
        <div className="border border-line rounded-(--radius-card) bg-white px-4 py-3 grid gap-1.5">
          <p className="text-[13px] text-body">
            Created {result.created} {result.what}
            {result.skipped > 0 && `, skipped ${result.skipped} already set up`}
            .
          </p>
          {result.errors.length > 0 && (
            <ul className="text-[12.5px] text-[#a33] grid gap-0.5">
              {result.errors.map((e) => (
                <li key={e.email}>
                  {e.email}: {e.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {unreachable.length > 0 && (
        <div className="text-[13px] text-[#7a4a00] bg-cta-tint border border-[#f3ddbb] rounded-lg px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <span>
            {unreachable.length} customer
            {unreachable.length === 1 ? " has" : "s have"} no email in Mission
            Control. No login can be made for them, and the advertiser update
            cannot reach them.
          </span>
          <button
            type="button"
            onClick={() => setNoEmailOnly((v) => !v)}
            className="ml-auto text-[12.5px] font-semibold px-3 py-1.5 rounded-[8px] border border-[#e0c48f] bg-white"
          >
            {noEmailOnly ? "Show everyone" : "Show only these"}
          </button>
        </div>
      )}

      {noEmailOnly && (
        <p className="text-[12.5px] text-muted">
          Showing the {unreachable.length} with no email on file. Adding an
          address in Mission Control is what fixes it; nothing here can invent
          one.
        </p>
      )}

      <div className="border border-line rounded-(--radius-card) bg-white overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[720px]">
          <thead>
            <tr className="text-left border-b border-line">
              <th className="w-9 px-3 py-2.5"></th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
                Business
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
                Cards
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
                Most recent
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
                In the site
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.email || r.businessName}
                className="border-b border-line last:border-0 align-top"
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    disabled={!!r.blocked}
                    checked={picked.has(r.email)}
                    onChange={() => toggle(r.email)}
                    aria-label={`Select ${r.businessName || r.email}`}
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="font-semibold">{r.businessName || "(no name)"}</div>
                  <div className="text-[12.5px] text-muted">
                    {r.email || "no email on file"}
                    {r.category && ` · ${r.category}`}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {r.cards}
                  {money(r.paidCents) && (
                    <span className="text-[12.5px] text-muted"> · {money(r.paidCents)}</span>
                  )}
                </td>
                <td className="px-3 py-3 text-[13px] text-body">{r.lastCard}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge on={r.hasLogin} label="Login" />
                    <Badge on={r.hasListing} label="Listing" />
                  </div>
                  {r.blocked && (
                    <div className="text-[12px] text-muted mt-1">{r.blocked}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={
        on
          ? "text-[11.5px] font-semibold px-2 py-0.5 rounded-full bg-ok text-white"
          : "text-[11.5px] font-semibold px-2 py-0.5 rounded-full bg-surface text-muted border border-line"
      }
    >
      {on ? label : `No ${label.toLowerCase()}`}
    </span>
  );
}
