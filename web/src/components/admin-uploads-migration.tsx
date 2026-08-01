"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CategorySurvey } from "@/lib/uploads-migration-types";

/**
 * Runs the legacy uploads migration, one batch at a time.
 *
 * The loop lives here rather than on the server because it is the only
 * place that can show progress while it happens. A migration of a few
 * hundred files takes minutes, and a button that appears to do nothing
 * for four minutes is a button people press again.
 */

type BatchResult = {
  category: string;
  attempted: number;
  done: number;
  missing: number;
  failed: number;
  remaining: number;
  errors: { filename: string; error: string }[];
};

type Problem = {
  category: string;
  filename: string;
  status: string;
  note: string;
  url: string;
};

const card = "border border-line rounded-(--radius-card) bg-white p-5.5";

export function AdminUploadsMigration({
  survey,
  base,
  problems,
}: {
  survey: CategorySurvey[];
  base: string;
  problems: Problem[];
}) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [err, setErr] = useState("");

  const say = (line: string) => setLog((l) => [...l, line]);

  async function runOne(category: string, label: string) {
    setRunning(category);
    setErr("");
    setLog([`Starting ${label}...`]);

    let total = 0;
    let missing = 0;
    let failed = 0;
    // Bounded so a bug that never reduces `remaining` stops on its own
    // rather than hammering the old host until the tab is closed.
    for (let round = 0; round < 400; round++) {
      let res: Response;
      try {
        res = await fetch("/api/admin/uploads-migration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, limit: 10 }),
        });
      } catch {
        setErr("Lost the connection. Press the button again to carry on.");
        break;
      }
      const j = (await res.json().catch(() => ({}))) as {
        result?: BatchResult;
        error?: string;
      };
      if (!res.ok || !j.result) {
        setErr(j.error ?? "That batch failed.");
        break;
      }
      const r = j.result;
      total += r.done;
      missing += r.missing;
      failed += r.failed;

      for (const e of r.errors.slice(0, 3)) {
        say(`  ${e.filename}: ${e.error}`);
      }
      say(
        `${total} moved${missing ? `, ${missing} not on the old host` : ""}${
          failed ? `, ${failed} failed` : ""
        } - ${r.remaining} to go`,
      );

      if (r.remaining === 0 || r.attempted === 0) {
        say(`Finished ${label}.`);
        break;
      }
    }

    setRunning(null);
    router.refresh();
  }

  async function retry() {
    setRunning("retry");
    setErr("");
    try {
      const res = await fetch("/api/admin/uploads-migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      const j = await res.json().catch(() => ({}));
      say(`Cleared ${j.cleared ?? 0} failed rows. Run the categories again.`);
      router.refresh();
    } catch {
      setErr("Could not reset those.");
    } finally {
      setRunning(null);
    }
  }

  const totalRemaining = survey.reduce((n, c) => n + c.remaining, 0);

  return (
    <div className="grid gap-4">
      <div className={card}>
        <p className="text-[13px] text-muted mb-1">Reading files from</p>
        <p className="text-[13.5px] font-mono break-all">{base}</p>
        <p className="text-[13px] text-body mt-3 leading-relaxed">
          {totalRemaining === 0
            ? "Nothing references the old host any more. It is safe to switch that service off."
            : `${totalRemaining} file${
                totalRemaining === 1 ? "" : "s"
              } still live only on the old host. Move them all before switching it off.`}
        </p>
      </div>

      <div className="grid gap-3">
        {survey.map((c) => (
          <div
            key={c.category}
            className={`${card} grid md:grid-cols-[1fr_auto] gap-4 items-center`}
          >
            <div>
              <b className="text-[15px]">{c.label}</b>
              <p className="text-[12.5px] text-muted mt-1">
                {[
                  `${c.remaining} to move`,
                  c.done ? `${c.done} moved` : null,
                  c.missing ? `${c.missing} not on the old host` : null,
                  c.failed ? `${c.failed} failed` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <button
              disabled={running !== null || c.remaining === 0}
              onClick={() => runOne(c.category, c.label)}
              className="bg-navy-950 text-white font-semibold text-[13px] px-4 py-2 rounded-(--radius-btn) hover:bg-navy-800 disabled:opacity-50"
            >
              {running === c.category
                ? "Moving..."
                : c.remaining === 0
                  ? "Done"
                  : `Move ${c.remaining}`}
            </button>
          </div>
        ))}
      </div>

      {err && (
        <p className="text-[13px] text-[#b42318] bg-[#fdf3f2] border border-[#f3c6c2] rounded-lg px-3.5 py-2.5">
          {err}
        </p>
      )}

      {log.length > 0 && (
        <div className={card}>
          <b className="text-[14px]">Progress</b>
          <pre className="text-[12.5px] leading-relaxed mt-2 whitespace-pre-wrap font-mono text-body">
            {log.join("\n")}
          </pre>
        </div>
      )}

      {problems.length > 0 && (
        <div className={card}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <b className="text-[14px]">
              {problems.length} file{problems.length === 1 ? "" : "s"} did not move
            </b>
            <button
              disabled={running !== null}
              onClick={retry}
              className="text-[13px] font-semibold text-brand-deep hover:underline disabled:opacity-50"
            >
              Reset the failed ones and try again
            </button>
          </div>
          <p className="text-[12.5px] text-muted mb-3 leading-relaxed">
            &ldquo;Not on the old host&rdquo; means the database row points at a
            file that is not there. That is a broken image today, not something
            this migration lost, and clearing the reference is the only fix.
          </p>
          <div className="grid gap-1.5">
            {problems.map((p) => (
              <div
                key={`${p.category}-${p.filename}`}
                className="text-[12.5px] grid md:grid-cols-[130px_1fr_auto] gap-2 items-baseline border-t border-line pt-1.5"
              >
                <span className="text-muted">{p.status}</span>
                <span className="font-mono break-all">{p.filename}</span>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-deep hover:underline whitespace-nowrap"
                >
                  check
                </a>
                {p.note && (
                  <span className="text-muted md:col-span-3">{p.note}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
