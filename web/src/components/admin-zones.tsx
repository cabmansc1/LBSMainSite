"use client";

import { useState } from "react";

/**
 * Zone facts: the countable things about a mailing area.
 *
 * These lived in code until now, which is how a page went on offering
 * "12,000 households" in a zone with 21,614 mailboxes, and how both
 * islands promised a 5,000 run that neither could fill. A number you
 * cannot correct without a deploy is a number that stays wrong.
 *
 * Blank is a real answer and means "not counted yet". It is not the
 * same as zero, and the pages say so: copy that quotes a count falls
 * back to wording that does not.
 */

export type ZoneRow = {
  slug: string;
  name: string;
  zips: string;
  mailboxes: string;
  population: string;
  mailsWith: string;
};

const cell = "px-4 py-3 border-b border-line";
const input =
  "w-full text-[13.5px] px-2.5 py-1.5 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950 num";

export function AdminZones({ initial }: { initial: ZoneRow[] }) {
  const [rows, setRows] = useState<ZoneRow[]>(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const set = (slug: string, patch: Partial<ZoneRow>) =>
    setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, ...patch } : r)));

  const counted = rows.filter((r) => r.mailboxes.trim() !== "").length;

  async function save() {
    setState("saving");
    setMessage("");

    const overrides: Record<
      string,
      { mailboxes: number | null; population?: number; mailsWith: string | null }
    > = {};

    for (const r of rows) {
      const mailboxes = r.mailboxes.trim();
      const population = r.population.trim();

      if (mailboxes !== "") {
        const n = Number(mailboxes);
        if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) {
          setState("error");
          setMessage(`${r.name}: mailboxes must be a number between 1 and 1,000,000`);
          return;
        }
      }
      if (population !== "") {
        const n = Number(population);
        if (!Number.isFinite(n) || n <= 0) {
          setState("error");
          setMessage(`${r.name}: population must be a positive number`);
          return;
        }
      }
      // Pairing a zone with itself would collapse it into nothing.
      if (r.mailsWith === r.slug) {
        setState("error");
        setMessage(`${r.name} cannot share a card with itself`);
        return;
      }

      overrides[r.slug] = {
        // null clears the count rather than storing a zero, which would
        // read as a zone with no mailboxes in it.
        mailboxes: mailboxes === "" ? null : Math.round(Number(mailboxes)),
        ...(population === "" ? {} : { population: Math.round(Number(population)) }),
        mailsWith: r.mailsWith === "" ? null : r.mailsWith,
      };
    }

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "zone-facts", overrides }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setState("saved");
        setMessage("Saved. Zone pages, the map and the calendar are updated.");
      } else {
        setState("error");
        setMessage(j.error ?? "Save failed");
      }
    } catch {
      setState("error");
      setMessage("Save failed");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[760px]">
          <thead>
            <tr>
              {["Zone", "ZIP codes", "Mailboxes", "Population", "Mails with"].map((h) => (
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
            {rows.map((r) => (
              <tr key={r.slug} className="hover:bg-surface">
                <td className={`${cell} font-semibold`}>
                  {r.name}
                  <span className="block text-[11.5px] font-normal text-muted">
                    {r.slug}
                  </span>
                </td>
                <td className={`${cell} text-muted num whitespace-nowrap`}>{r.zips}</td>
                <td className={`${cell} w-[130px]`}>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={r.mailboxes}
                    onChange={(e) => set(r.slug, { mailboxes: e.target.value })}
                    placeholder="Not counted"
                    aria-label={`Mailboxes in ${r.name}`}
                    className={input}
                  />
                </td>
                <td className={`${cell} w-[130px]`}>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={r.population}
                    onChange={(e) => set(r.slug, { population: e.target.value })}
                    aria-label={`Population of ${r.name}`}
                    className={input}
                  />
                </td>
                <td className={`${cell} w-[210px]`}>
                  <select
                    value={r.mailsWith}
                    onChange={(e) => set(r.slug, { mailsWith: e.target.value })}
                    aria-label={`Zone ${r.name} shares a card with`}
                    className="w-full text-[13.5px] px-2.5 py-1.5 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950"
                  >
                    <option value="">Mails on its own</option>
                    {rows
                      .filter((o) => o.slug !== r.slug)
                      .map((o) => (
                        <option key={o.slug} value={o.slug}>
                          {o.name}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3.5 flex-wrap">
        <button
          onClick={save}
          disabled={state === "saving"}
          className="text-[14px] font-semibold px-5 py-2.5 rounded-(--radius-btn) bg-navy-950 text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {state === "saving" ? "Saving..." : "Save zone facts"}
        </button>
        <span className="text-[12.5px] text-muted num">
          {counted} of {rows.length} zones counted
        </span>
        {message && (
          <span
            className={`text-[13px] ${state === "error" ? "text-[#b42318]" : "text-ok"}`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
