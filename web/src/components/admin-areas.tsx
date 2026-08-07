"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DirectoryArea } from "@/lib/directory-areas";

/**
 * The towns and neighbourhoods a listing can be filed under.
 *
 * Slugs are shown but never editable. A listing records its area as the
 * slug rather than a link, so changing one would not move the listings,
 * it would strand them, and the screen would give no sign that it had.
 */
export function AdminAreas({ areas }: { areas: DirectoryArea[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const field =
    "w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      setName("");
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  // Shown live, because the slug is permanent and the moment to notice
  // it reads wrong is before the area exists, not after.
  const preview = name.trim()
    ? name
        .toLowerCase()
        .trim()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    : "";

  return (
    <div className="grid gap-5">
      {error && (
        <p className="text-[13px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3">
        <b className="text-[15px]">Add an area</b>
        <div className="flex gap-2.5 flex-wrap items-start">
          <label className="grid gap-1.5 flex-1 min-w-[220px]">
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
              Name as people say it
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folly Beach"
              className={field}
            />
            {preview && (
              <span className="text-[12px] text-muted num">
                Filed and linked as /directory/location/{preview}
              </span>
            )}
          </label>
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() => send({ action: "create", name })}
            className="text-[13px] font-bold px-4 py-2.5 rounded-[9px] bg-cta text-navy-950 disabled:opacity-40 mt-[22px]"
          >
            Add
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[640px]">
          <thead>
            <tr>
              {["Area", "Address", "Listings", "On the site", ""].map((h) => (
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
            {areas.map((a) => (
              <tr key={a.id} className="hover:bg-surface">
                <td className="px-4 py-3 border-b border-line">
                  {editing === a.id ? (
                    <div className="flex gap-2">
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className={field}
                        autoFocus
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => send({ action: "rename", id: a.id, name: draft })}
                        className="text-[12.5px] font-bold px-2.5 py-1.5 rounded-[8px] bg-navy-950 text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="text-[12.5px] px-2.5 py-1.5 rounded-[8px] border border-line-strong"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <b className="font-semibold">{a.name}</b>
                  )}
                </td>
                <td className="px-4 py-3 border-b border-line text-[12.5px] text-muted num">
                  /{a.slug}
                </td>
                <td className="px-4 py-3 border-b border-line num">{a.listings}</td>
                <td className="px-4 py-3 border-b border-line">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => send({ action: "active", id: a.id, active: !a.active })}
                    className={`text-[12.5px] font-bold px-2.5 py-1.5 rounded-[8px] border ${
                      a.active
                        ? "border-[#bfe5cd] bg-[#e7f6ec] text-[#0d7a3c]"
                        : "border-line-strong bg-surface text-muted"
                    }`}
                  >
                    {a.active ? "Showing" : "Hidden"}
                  </button>
                </td>
                <td className="px-4 py-3 border-b border-line text-right">
                  {editing !== a.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(a.id);
                        setDraft(a.name);
                      }}
                      className="text-[12.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-line-strong"
                    >
                      Rename
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {areas.length === 0 && (
          <p className="text-sm text-muted px-4 py-8 text-center">
            No areas yet.
          </p>
        )}
      </div>
    </div>
  );
}
