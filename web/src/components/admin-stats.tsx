"use client";

import { useState } from "react";
import type { SiteStat } from "@/lib/admin-data";

type Draft = {
  id?: number;
  key: string;
  value: string;
  label: string;
  order: number;
  active: boolean;
};

const blank: Draft = { key: "", value: "", label: "", order: 0, active: true };

export function AdminStats({ stats }: { stats: SiteStat[] }) {
  const [rows, setRows] = useState<Draft[]>(
    stats.map((s) => ({
      id: s.id,
      key: s.key,
      value: s.value,
      label: s.label,
      order: s.order,
      active: s.active,
    })),
  );
  const [busy, setBusy] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [message, setMessage] = useState("");

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? "Save failed");
  }

  async function saveRow(i: number) {
    const row = rows[i];
    setBusy(i);
    setMessage("");
    try {
      await post({ type: "stat", stat: row });
      setMessage(`Saved ${row.label || row.key}`);
    } catch (e) {
      setMessage(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  async function remove(i: number) {
    const row = rows[i];
    setBusy(i);
    try {
      if (row.id) await post({ type: "stat-delete", id: row.id });
      setRows(rows.filter((_, x) => x !== i));
      setMessage("Removed");
    } catch (e) {
      setMessage(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  async function addNew() {
    if (!draft.key || !draft.label) {
      setMessage("A key and label are required");
      return;
    }
    setBusy("new");
    try {
      await post({ type: "stat", stat: draft });
      setRows([...rows, draft]);
      setDraft(blank);
      setMessage("Added");
    } catch (e) {
      setMessage(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  const input =
    "w-full text-sm px-3 py-2 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[760px]">
          <thead>
            <tr>
              {["Key", "Value", "Label", "Order", "Live", ""].map((h) => (
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
            {rows.map((r, i) => (
              <tr key={r.id ?? `new-${i}`} className="hover:bg-surface">
                <td className="px-3 py-2.5 border-b border-line">
                  <input
                    className={input}
                    value={r.key}
                    onChange={(e) => {
                      const n = [...rows];
                      n[i] = { ...r, key: e.target.value };
                      setRows(n);
                    }}
                  />
                </td>
                <td className="px-3 py-2.5 border-b border-line">
                  <input
                    className={input}
                    value={r.value}
                    onChange={(e) => {
                      const n = [...rows];
                      n[i] = { ...r, value: e.target.value };
                      setRows(n);
                    }}
                  />
                </td>
                <td className="px-3 py-2.5 border-b border-line">
                  <input
                    className={input}
                    value={r.label}
                    onChange={(e) => {
                      const n = [...rows];
                      n[i] = { ...r, label: e.target.value };
                      setRows(n);
                    }}
                  />
                </td>
                <td className="px-3 py-2.5 border-b border-line">
                  <input
                    type="number"
                    className={`${input} w-20 num`}
                    value={r.order}
                    onChange={(e) => {
                      const n = [...rows];
                      n[i] = { ...r, order: Number(e.target.value) };
                      setRows(n);
                    }}
                  />
                </td>
                <td className="px-3 py-2.5 border-b border-line">
                  <input
                    type="checkbox"
                    checked={r.active}
                    onChange={(e) => {
                      const n = [...rows];
                      n[i] = { ...r, active: e.target.checked };
                      setRows(n);
                    }}
                  />
                </td>
                <td className="px-3 py-2.5 border-b border-line whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => saveRow(i)}
                    disabled={busy === i}
                    className="text-[13px] font-semibold text-brand-deep hover:underline disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={busy === i}
                    className="text-[13px] font-semibold text-muted hover:text-[#a33] ml-3 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-sm text-muted px-4 py-6 text-center">
            No stats yet. Add the first one below.
          </p>
        )}
      </div>

      <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3">
        <h2 className="text-[15px] font-semibold">Add a stat</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          <input
            className={input}
            placeholder="Key (homes_reached)"
            value={draft.key}
            onChange={(e) => setDraft({ ...draft, key: e.target.value })}
          />
          <input
            className={input}
            placeholder="Value (25,000+)"
            value={draft.value}
            onChange={(e) => setDraft({ ...draft, value: e.target.value })}
          />
          <input
            className={input}
            placeholder="Label (Homes reached)"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
          <button
            type="button"
            onClick={addNew}
            disabled={busy === "new"}
            className="bg-navy-950 text-white text-[14px] font-semibold px-4 py-2 rounded-(--radius-btn) hover:bg-navy-800 disabled:opacity-60"
          >
            Add stat
          </button>
        </div>
      </div>

      {message && (
        <p className="text-[13px] font-semibold text-body">{message}</p>
      )}
    </div>
  );
}
