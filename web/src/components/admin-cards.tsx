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
            {rows.map((c) => (
              <tr key={c.cardId} className="hover:bg-surface">
                <td className="px-4 py-3.5 border-b border-line font-semibold">
                  {c.zoneName}
                  {c.cardName && (
                    <span className="block text-[12.5px] font-medium text-muted">
                      {c.cardName}
                    </span>
                  )}
                  {c.zips.length > 0 ? (
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
              </tr>
            ))}
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
