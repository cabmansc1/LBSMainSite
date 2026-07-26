"use client";

import { useState } from "react";

/**
 * CSV import with in-browser parsing and preview before anything is
 * sent. Handles quoted fields; first row must be headers. Column names
 * are matched loosely (case/space insensitive).
 */

type Kind = "advertisers" | "cards";

const COLUMNS: Record<Kind, { key: string; label: string; required?: boolean }[]> = {
  advertisers: [
    { key: "businessName", label: "business name", required: true },
    { key: "contactName", label: "contact name" },
    { key: "email", label: "email" },
    { key: "phone", label: "phone" },
    { key: "category", label: "category" },
    { key: "zone", label: "zone" },
  ],
  cards: [
    { key: "imageUrl", label: "image url", required: true },
    { key: "zoneSlug", label: "zone" },
    { key: "mailMonth", label: "mail month" },
    { key: "caption", label: "caption" },
  ],
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export function ImportTool() {
  const [kind, setKind] = useState<Kind>("advertisers");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const cols = COLUMNS[kind];

  function handleFile(file: File) {
    setFileName(file.name);
    setResult("");
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ""));
      if (parsed.length < 2) {
        setRows([]);
        setResult("That file has no data rows. First row must be headers.");
        return;
      }
      const headers = parsed[0].map(norm);
      const mapped = parsed.slice(1).map((r) => {
        const obj: Record<string, string> = {};
        cols.forEach((c) => {
          const idx = headers.findIndex((h) => h.includes(norm(c.label)) || h === norm(c.key));
          obj[c.key] = idx >= 0 ? (r[idx] ?? "").trim() : "";
        });
        return obj;
      });
      setRows(mapped);
    };
    reader.readAsText(file);
  }

  const problems = rows
    .map((r, i) => {
      const missing = cols.filter((c) => c.required && !r[c.key]);
      return missing.length ? { row: i + 1, msg: `missing ${missing.map((m) => m.label).join(", ")}` } : null;
    })
    .filter(Boolean) as { row: number; msg: string }[];

  async function submit() {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      const n = data.imported ?? data.wouldImport ?? 0;
      setResult(
        data.preview
          ? `Validated: ${n} rows ready to import (preview mode, nothing written until the database connects). ${data.errors?.length ?? 0} rows had problems.`
          : `Imported ${n} rows. ${data.errors?.length ?? 0} rows had problems.`,
      );
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Import failed. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-5">
      <div className="flex gap-2">
        {(
          [
            ["advertisers", "Advertisers"],
            ["cards", "Past cards"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setKind(key);
              setRows([]);
              setFileName("");
              setResult("");
            }}
            className={`text-[13.5px] font-semibold px-4.5 py-2 rounded-lg border transition-colors ${
              kind === key
                ? "bg-navy-950 text-white border-navy-950"
                : "bg-white text-body border-line-strong hover:border-faint"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-line rounded-(--radius-card) p-6.5 grid gap-4">
        <div>
          <p className="text-[13.5px] text-body mb-2">
            Upload a CSV with a header row. Recognized columns:{" "}
            {cols.map((c) => (
              <code key={c.key} className="bg-surface border border-line rounded px-1.5 py-0.5 text-[12px] mr-1">
                {c.label}
                {c.required ? "*" : ""}
              </code>
            ))}
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Choose CSV file"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="text-[13.5px]"
          />
        </div>

        {rows.length > 0 && (
          <>
            <div className="overflow-x-auto border border-line rounded-[10px]">
              <table className="w-full border-collapse text-[12.5px] min-w-[560px]">
                <thead>
                  <tr>
                    <th className="text-left text-[10.5px] uppercase tracking-wider text-muted font-semibold px-3 py-2 border-b border-line bg-surface">#</th>
                    {cols.map((c) => (
                      <th key={c.key} className="text-left text-[10.5px] uppercase tracking-wider text-muted font-semibold px-3 py-2 border-b border-line bg-surface">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 border-b border-line text-muted num">{i + 1}</td>
                      {cols.map((c) => (
                        <td key={c.key} className={`px-3 py-2 border-b border-line ${c.required && !r[c.key] ? "text-danger font-semibold" : ""}`}>
                          {r[c.key] || (c.required ? "MISSING" : "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12.5px] text-muted">
              {fileName}: {rows.length} rows{rows.length > 8 ? ` (showing first 8)` : ""}
              {problems.length > 0 && (
                <span className="text-danger font-semibold">
                  {" "}· {problems.length} rows have missing required fields and will be skipped
                </span>
              )}
            </p>
            <button
              onClick={submit}
              disabled={busy || rows.length === problems.length}
              className="justify-self-start bg-cta text-navy-950 font-semibold text-[14.5px] px-5.5 py-2.5 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors disabled:opacity-50"
            >
              {busy ? "Importing..." : `Import ${rows.length - problems.length} rows`}
            </button>
          </>
        )}

        {result && (
          <p className="text-[13.5px] font-medium bg-surface border border-line rounded-[10px] px-4 py-3">
            {result}
          </p>
        )}
      </div>
    </div>
  );
}
