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

function UserRow({ u }: { u: AdminUser }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(u.isActive);

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

  async function toggleActive() {
    const next = !active;
    setActive(next);
    try {
      await post({ action: "set-active", active: next });
    } catch {
      setActive(!next);
    }
  }

  return (
    <>
      <tr className="hover:bg-surface align-top">
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
        <td className="px-4 py-3 border-b border-line">
          <button
            type="button"
            onClick={toggleActive}
            className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border ${
              active
                ? "bg-[#e5f5ec] border-[#bfe8d2] text-ok"
                : "bg-surface border-line text-muted"
            }`}
          >
            {active ? "Active" : "Inactive"}
          </button>
        </td>
        <td className="px-4 py-3 border-b border-line whitespace-nowrap">
          <button
            type="button"
            onClick={() => {
              setOpen(!open);
              if (!password) setPassword(suggestPassword());
            }}
            className="text-[13px] font-semibold text-brand-deep hover:underline"
          >
            {open ? "Cancel" : "Set password"}
          </button>
        </td>
      </tr>
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

export function AdminUsers({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");
  const visible = query.trim()
    ? users.filter((u) =>
        [u.email, u.firstName, u.lastName, u.listings.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : users;

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
      </div>

      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[820px]">
          <thead>
            <tr>
              {["Account", "Linked listings", "Created", "Status", ""].map((h) => (
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
