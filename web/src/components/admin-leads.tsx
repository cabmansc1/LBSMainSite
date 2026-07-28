"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminLead } from "@/lib/admin-data";

/**
 * Leads, with the ability to clear them out.
 *
 * The legacy admin/leads.php has always allowed a hard delete behind a
 * confirm, so this is parity rather than a new power. Bulk selection is
 * the addition: this table collects quiz submissions and form fills,
 * which arrive in bursts and go stale, and removing them one row at a
 * time is why nobody ever does it.
 *
 * The contact is not lost. process_form.php and save-quiz-lead.php push
 * every lead to GoHighLevel at capture time, and this table is the
 * local copy.
 */
export function AdminLeads({ leads }: { leads: AdminLead[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  async function remove(ids: number[], label: string) {
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/leads", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const j = await res.json().catch(() => ({}));
      // An expired session redirects to the login page, which fetch
      // follows and which answers 200 with HTML. res.ok alone would read
      // that as a successful delete.
      if (!res.ok || j.ok !== true) {
        throw new Error(j.error ?? "Could not delete those. Try signing in again.");
      }
      setSelected([]);
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  if (leads.length === 0) {
    return (
      <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-8 text-center">
        No leads captured yet.
      </p>
    );
  }

  return (
    <>
      {selected.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-[12.5px] text-muted num ml-auto">
            {selected.length} selected
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              remove(
                selected,
                `${selected.length} lead${selected.length === 1 ? "" : "s"}`,
              )
            }
            className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[8px] border border-line-strong text-danger disabled:opacity-40"
          >
            {busy ? "Deleting..." : "Delete selected"}
          </button>
        </div>
      )}
      {error && <p className="text-[13px] text-danger mb-2">{error}</p>}

      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[880px]">
          <thead>
            <tr>
              <th className="w-10 px-4 py-3 border-b border-line bg-surface">
                <input
                  type="checkbox"
                  aria-label="Select all leads"
                  checked={selected.length === leads.length}
                  onChange={(e) =>
                    setSelected(e.target.checked ? leads.map((l) => l.id) : [])
                  }
                />
              </th>
              {["Business", "Contact", "Area", "Interested in", "Received", ""].map(
                (h, i) => (
                  <th
                    key={h || `blank-${i}`}
                    className={`text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface ${
                      i === 5 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-surface align-top">
                <td className="px-4 py-3.5 border-b border-line">
                  <input
                    type="checkbox"
                    aria-label={`Select ${l.company || l.email}`}
                    checked={selected.includes(l.id)}
                    onChange={() => toggle(l.id)}
                  />
                </td>
                <td className="px-4 py-3.5 border-b border-line font-semibold">
                  {l.company || "-"}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px]">
                  {l.contact}
                  <div>
                    {l.email && (
                      <a
                        href={`mailto:${l.email}`}
                        className="text-brand-deep hover:underline"
                      >
                        {l.email}
                      </a>
                    )}
                  </div>
                  {l.phone && <div className="text-muted num">{l.phone}</div>}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px] text-muted">
                  {l.location || "-"}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px]">
                  {l.interest || "-"}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-[12.5px] text-muted num">
                  {l.createdAt?.slice(0, 16) ?? "-"}
                </td>
                <td className="px-4 py-3.5 border-b border-line text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove([l.id], l.company || l.email || "this lead")}
                    className="text-[12.5px] font-semibold text-muted hover:text-danger disabled:opacity-40"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
