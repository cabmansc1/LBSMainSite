"use client";

import { useState } from "react";

type Row = {
  cardId: string;
  zoneName: string;
  /** Mission Control's name for the card, e.g. "Nexton/Cane Bay". */
  cardName?: string;
  zips: string[];
  routeCount: number;
  routeHouseholds: number;
  /** Sales copy shown to buyers wherever this card is offered. */
  description: string;
  mailMonth: string;
  orientation: "horizontal" | "vertical";
  totalSpots: number;
  spotsTaken: number;
  remainingSqIn: number;
  totalSqIn: number;
};

export function AdminCards({ cards }: { cards: Row[] }) {
  const [rows, setRows] = useState(cards);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(cards.map((c) => [c.cardId, c.description])),
  );

  async function saveDescription(cardId: string) {
    setBusy(cardId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "card-description",
          cardId,
          description: drafts[cardId] ?? "",
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      setRows((r) =>
        r.map((x) =>
          x.cardId === cardId ? { ...x, description: drafts[cardId] ?? "" } : x,
        ),
      );
      setMessage("Saved. Buyers see it wherever this card is offered.");
    } catch (e) {
      setMessage(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  async function setOrientation(
    cardId: string,
    orientation: "horizontal" | "vertical",
  ) {
    setBusy(cardId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "card-orientation", cardId, orientation }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      setRows((r) =>
        r.map((x) =>
          x.cardId === cardId
            ? {
                ...x,
                orientation,
                totalSqIn: orientation === "vertical" ? 204 : 192,
              }
            : x,
        ),
      );
      setMessage("Saved. Availability updated across the site.");
    } catch (e) {
      setMessage(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-8 text-center">
        No upcoming cards in Mission Control right now.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[760px]">
          <thead>
            <tr>
              {["Card", "Mails", "Filled", "Space left", "Orientation"].map((h) => (
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
            {rows.flatMap((c) => [
              <tr key={c.cardId} className="hover:bg-surface">
                <td className="px-4 py-3.5 border-b border-line font-semibold">
                  {c.zoneName}
                  {c.cardName && (
                    <span className="block text-[12.5px] font-medium text-muted">
                      {c.cardName}
                    </span>
                  )}
                  {c.zips.length > 0 ? (
                    // The route sum stays here and nowhere public. Routes
                    // change up to the print deadline, so this is a
                    // planning figure: useful for deciding what a card
                    // still needs, misleading as a quoted reach.
                    <span className="block text-[12px] text-muted num font-normal">
                      ZIP {c.zips.join(", ")} · {c.routeCount} routes ·{" "}
                      {c.routeHouseholds.toLocaleString("en-US")} addresses
                    </span>
                  ) : (
                    <span className="block text-[12px] text-[#a05e00] font-normal">
                      No route table in Mission Control notes
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 border-b border-line">{c.mailMonth}</td>
                <td className="px-4 py-3.5 border-b border-line num">
                  {c.spotsTaken} of {c.totalSpots} spots
                </td>
                <td className="px-4 py-3.5 border-b border-line num text-muted">
                  {c.remainingSqIn} of {c.totalSqIn} sq in
                </td>
                <td className="px-4 py-3.5 border-b border-line">
                  <span className="inline-flex rounded-[9px] border border-line-strong overflow-hidden">
                    {(["horizontal", "vertical"] as const).map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setOrientation(c.cardId, o)}
                        disabled={busy === c.cardId}
                        className={`text-[12.5px] font-semibold px-3 py-1.5 capitalize disabled:opacity-50 ${
                          c.orientation === o
                            ? "bg-navy-950 text-white"
                            : "bg-white text-muted hover:text-navy-950"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </span>
                </td>
              </tr>,
              <tr key={`${c.cardId}-desc`}>
                <td colSpan={5} className="px-4 pb-4 border-b border-line">
                  <label
                    htmlFor={`desc-${c.cardId}`}
                    className="text-[11px] uppercase tracking-wider text-muted font-semibold block mb-1.5"
                  >
                    What this card is, in a sentence
                  </label>
                  <div className="flex gap-2 items-start flex-wrap">
                    <textarea
                      id={`desc-${c.cardId}`}
                      rows={2}
                      maxLength={400}
                      value={drafts[c.cardId] ?? ""}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [c.cardId]: e.target.value }))
                      }
                      placeholder="Nexton and Cane Bay: the master-planned side of Summerville, thousands of new rooftops and families who moved in this year."
                      className="flex-1 min-w-[280px] text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
                    />
                    <button
                      type="button"
                      onClick={() => saveDescription(c.cardId)}
                      disabled={
                        busy === c.cardId || (drafts[c.cardId] ?? "") === c.description
                      }
                      className="bg-navy-950 text-white text-[13px] font-semibold px-4 py-2.5 rounded-[10px] hover:bg-navy-800 disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-[11.5px] text-muted mt-1.5 num">
                    {(drafts[c.cardId] ?? "").length} of 400 characters. Shown to
                    buyers on the pricing picker, the card chooser and checkout.
                  </p>
                </td>
              </tr>,
            ])}
          </tbody>
        </table>
      </div>
      <p className="text-[12.5px] text-muted mt-3">
        Horizontal holds 192 square inches: 16 mediums, 8 larges, or 32 smalls.
        Vertical holds 204, enough for 6 larges plus 5 mediums.
      </p>
      {message && (
        <p className="text-[13px] font-semibold text-body mt-2">{message}</p>
      )}
    </>
  );
}
