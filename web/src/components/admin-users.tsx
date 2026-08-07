"use client";

import { useState } from "react";
import type { AdminUser } from "@/lib/admin-data";

/** Readable, reasonably strong suggestion so admins do not invent weak ones. */
function suggestPassword() {
  const words = [
    "harbor", "marsh", "palmetto", "tidal", "cypress", "heron", "sandbar",
    "oyster", "cobble", "lantern", "pelican", "current",
  ];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(Math.random() * 90 + 10);
  return `${pick()}-${pick()}-${n}`;
}

/**
 * "3 months ago" rather than a date, because the question being asked is
 * how long it has been, and working that out from 2026-04-12 is a
 * subtraction the reader should not have to do. The date is underneath
 * for anyone who wants it.
 */
function sinceLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function UserRow({ u }: { u: AdminUser }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(u.isActive);
  const [deleted, setDeleted] = useState(false);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: u.id, ...body }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? "Failed");
  }

  async function savePassword() {
    setState("busy");
    setMessage("");
    try {
      await post({ action: "set-password", password });
      setState("done");
      setMessage("Password set. Copy it now, it is not shown again.");
    } catch (e) {
      setState("error");
      setMessage(String(e instanceof Error ? e.message : e));
    }
  }

  async function viewAs() {
    setState("busy");
    setMessage("");
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: u.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Could not open that account");
      window.location.href = "/account";
    } catch (e) {
      setState("error");
      setMessage(String(e instanceof Error ? e.message : e));
    }
  }

  async function toggleActive() {
    const next = !active;
    setActive(next);
    setState("idle");
    setMessage("");
    try {
      await post({ action: "set-active", active: next });
    } catch {
      setActive(!next);
      setState("error");
      setMessage("Could not change that. Try signing in again.");
    }
  }

  /**
   * Deleting is refused server-side when the account has card orders,
   * because an inner join means those paid orders would disappear from
   * the Orders page. The refusal comes back as a sentence, so it is
   * shown rather than swallowed.
   */
  async function remove() {
    const listings = u.listings.length;
    const note = listings
      ? `\n\n${listings} listing${listings === 1 ? "" : "s"} will stay in the directory, unlinked from any owner.`
      : "";
    if (!confirm(`Delete the account ${u.email}? This cannot be undone.${note}`)) {
      return;
    }
    setState("busy");
    setMessage("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: u.id, action: "delete" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok !== true) {
        throw new Error(j.error ?? "Could not delete that account.");
      }
      setDeleted(true);
    } catch (e) {
      setState("error");
      setMessage(String(e instanceof Error ? e.message : e));
    }
  }

  if (deleted) {
    return (
      <tr className="bg-surface">
        <td colSpan={5} className="px-4 py-3 border-b border-line text-[13px] text-muted">
          {u.email} deleted.
          {u.listings.length > 0 &&
            ` ${u.listings.length} listing${u.listings.length === 1 ? "" : "s"} kept in the directory, now unlinked.`}
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className={`hover:bg-surface align-top ${active ? "" : "text-muted"}`}>
        <td className="px-4 py-3 border-b border-line">
          <b className="font-semibold">{u.email}</b>
          <div className="text-[12px] text-muted mt-0.5">
            {[u.firstName, u.lastName].filter(Boolean).join(" ") || "No name"}
          </div>
        </td>
        <td className="px-4 py-3 border-b border-line text-[12.5px] text-muted">
          {u.listings.length > 0 ? u.listings.join(", ") : "No linked listing"}
        </td>
        <td className="px-4 py-3 border-b border-line text-[12.5px] text-muted">
          {u.createdAt ? u.createdAt.slice(0, 10) : "-"}
        </td>
        <td className="px-4 py-3 border-b border-line text-[12.5px]">
          {u.lastLogin ? (
            <>
              <span className="text-ink">{sinceLabel(u.lastLogin)}</span>
              <span className="block text-muted num">
                {u.lastLogin.slice(0, 10)}
                {u.loginCount > 1 ? ` · ${u.loginCount} sign-ins` : ""}
              </span>
            </>
          ) : (
            // Not an error and not necessarily an unused account: nothing
            // was recorded before this shipped, so everyone reads as never
            // until they come back.
            <span className="text-muted">Not since this was tracked</span>
          )}
        </td>
        <td className="px-4 py-3 border-b border-line">
          {/* The state and the control that changes it, rather than a
              chip that happens to be clickable. Nobody found that. */}
          <span
            className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border inline-block ${
              active
                ? "bg-[#e5f5ec] border-[#bfe8d2] text-ok"
                : "bg-surface border-line text-muted"
            }`}
          >
            {active ? "Active" : "Disabled"}
          </span>
          <button
            type="button"
            onClick={toggleActive}
            className="block mt-1 text-[12px] font-semibold text-muted hover:text-navy-950"
          >
            {active ? "Disable" : "Enable"}
          </button>
        </td>
        <td className="px-4 py-3 border-b border-line whitespace-nowrap">
          <div className="flex gap-3 items-center">
            {/* Preferred over setting a password to look around: it
                changes nothing about the account and sends no email. */}
            <button
              type="button"
              onClick={viewAs}
              className="text-[13px] font-semibold text-brand-deep hover:underline"
            >
              View as
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(!open);
                if (!password) setPassword(suggestPassword());
              }}
              className="text-[13px] font-semibold text-muted hover:text-navy-950"
            >
              {open ? "Cancel" : "Set password"}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={state === "busy"}
              className="text-[13px] font-semibold text-muted hover:text-danger disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
      {state === "error" && message && !open && (
        <tr>
          <td colSpan={5} className="px-4 pb-3 border-b border-line">
            <p className="text-[12.5px] text-danger max-w-[80ch]">{message}</p>
          </td>
        </tr>
      )}
      {open && (
        <tr className="bg-surface">
          <td colSpan={5} className="px-4 py-4 border-b border-line">
            <div className="flex items-end gap-3 flex-wrap">
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                  New password for {u.email}
                </span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-[280px] text-sm px-3 py-2 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950 font-mono"
                />
              </label>
              <button
                type="button"
                onClick={() => setPassword(suggestPassword())}
                className="text-[13px] font-semibold text-muted hover:text-navy-950 pb-2.5"
              >
                Suggest another
              </button>
              <button
                type="button"
                onClick={savePassword}
                disabled={state === "busy"}
                className="bg-cta text-navy-950 text-[13.5px] font-bold px-4 py-2.5 rounded-(--radius-btn) hover:bg-[#FFA033] disabled:opacity-60"
              >
                {state === "busy" ? "Saving..." : "Save password"}
              </button>
              {message && (
                <span
                  className={`text-[13px] font-semibold pb-2.5 ${
                    state === "error" ? "text-[#a33]" : "text-ok"
                  }`}
                >
                  {message}
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted mt-2.5">
              Sets a real password on this account. It works on both this site
              and the legacy site. Tell the owner to change it after signing in.
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Creates a login for an advertiser who has never signed in.
 *
 * Most advertisers arrived by phone, so they have a listing and card
 * history but no portal account, which means nothing to view as and no
 * way for them to be sent a code. This makes one without setting a
 * password on their behalf or emailing them anything.
 */
function CreateLogin() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function create() {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", email, firstName }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Could not create that login");
      setMsg(
        (j.created ? "Login created." : "That login already existed.") +
          (j.linkedListings
            ? ` Linked ${j.linkedListings} listing${j.linkedListings === 1 ? "" : "s"}.`
            : " No listing carries that email, so nothing was linked."),
      );
      setEmail("");
      setFirstName("");
      // The row has to appear in the table before it can be viewed as.
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] font-semibold text-brand-deep hover:underline"
      >
        Create a login
      </button>
    );
  }

  return (
    <div className="w-full border border-line rounded-(--radius-card) bg-white p-4 grid gap-2.5">
      <b className="text-[14px] font-semibold">Create a login</b>
      <p className="text-[12.5px] text-muted max-w-[64ch]">
        For an advertiser who has never signed in. No password is set and no
        email is sent. They sign in with a code whenever they want to, and
        you can view as them straight away.
      </p>
      <div className="flex gap-2.5 flex-wrap">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="their@email.com"
          className="flex-1 min-w-[220px] text-sm px-3 py-2 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
        />
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name (optional)"
          className="w-[180px] text-sm px-3 py-2 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
        />
        <button
          type="button"
          onClick={create}
          disabled={busy || !email}
          className="bg-navy-950 text-white text-[13px] font-semibold px-4 py-2 rounded-[10px] hover:bg-navy-800 disabled:opacity-60"
        >
          {busy ? "Creating..." : "Create"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setErr(""); setMsg(""); }}
          className="text-[13px] text-muted hover:text-navy-950"
        >
          Cancel
        </button>
      </div>
      {msg && <p className="text-[12.5px] text-ok">{msg}</p>}
      {err && <p className="text-[12.5px] text-danger">{err}</p>}
    </div>
  );
}

export function AdminUsers({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");
  // Newest account first is the default the screen has always had. The
  // other order is the one that answers a question: who has not been
  // back, oldest first, with never at the top.
  const [order, setOrder] = useState<"newest" | "stalest">("newest");

  const matched = query.trim()
    ? users.filter((u) =>
        [u.email, u.firstName, u.lastName, u.listings.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : users;

  const visible =
    order === "newest"
      ? matched
      : // Never sorts before the longest absence rather than after it:
        // an account that has never signed in is the strongest version
        // of the thing being looked for, not a missing value.
        [...matched].sort((a, b) => {
          const at = a.lastLogin ? new Date(a.lastLogin).getTime() : -1;
          const bt = b.lastLogin ? new Date(b.lastLogin).getTime() : -1;
          return at - bt;
        });

  const neverIn = users.filter((u) => !u.lastLogin).length;

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, name, or listing"
          className="w-full max-w-[360px] text-sm px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
        />
        <span className="text-[13px] text-muted num">{visible.length} accounts</span>
        <button
          type="button"
          onClick={() => setOrder(order === "newest" ? "stalest" : "newest")}
          className="text-[12.5px] font-semibold px-3 py-2 rounded-[9px] border border-line-strong"
        >
          {order === "newest" ? "Sort by last sign-in" : "Sort by newest"}
        </button>
        {neverIn > 0 && (
          <span className="text-[12.5px] text-muted num">
            {neverIn} not seen since tracking started
          </span>
        )}
        <div className="ml-auto">
          <CreateLogin />
        </div>
      </div>

      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        {/* Wider by a column, so the last one does not get squeezed into
            two words per line on a laptop. */}
        <table className="w-full border-collapse text-[13.5px] min-w-[960px]">
          <thead>
            <tr>
              {["Account", "Linked listings", "Created", "Last sign-in", "Status", ""].map((h) => (
                <th
                  key={h}
                  className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <UserRow key={u.id} u={u} />
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="text-sm text-muted px-4 py-8 text-center">
            No accounts match that search.
          </p>
        )}
      </div>
    </>
  );
}
