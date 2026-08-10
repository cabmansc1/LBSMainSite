"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Peek = {
  span: string;
  count: number;
  title: string;
  groups: { name: string; count: number }[];
};

/**
 * Building this weekend's roundup.
 *
 * The count is fetched before anything is written, because the useful
 * question on a Thursday is "is there enough on to be worth a piece"
 * and the answer to that should not cost a draft nobody wanted.
 */
export function RoundupButton() {
  const router = useRouter();
  const [peek, setPeek] = useState<Peek | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [made, setMade] = useState<{ slug: string; id: number } | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/admin/roundup")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live && j) setPeek(j);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  async function build() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/roundup", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not build.");
      setMade({ slug: j.slug, id: j.id });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not build.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-line rounded-(--radius-card) bg-white p-5 mb-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-[58ch]">
          <b className="text-[14.5px]">This weekend&rsquo;s roundup</b>
          <p className="text-[13px] text-muted mt-1">
            {peek
              ? peek.count > 0
                ? `${peek.count} published events between Friday and Sunday, ${peek.span}. Builds a draft grouped by market — write the opening and press publish.`
                : `Nothing published for ${peek.span} yet. Approve a few events first.`
              : "Counting what is on…"}
          </p>
          {peek && peek.groups.length > 0 && (
            <p className="text-[12.5px] text-muted mt-1.5 num">
              {peek.groups.map((g) => `${g.name} (${g.count})`).join(" · ")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={build}
          disabled={busy || !peek?.count}
          className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-navy-950 text-white disabled:opacity-40"
        >
          {busy ? "Building" : "Build the draft"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-[13px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-3.5 py-2">
          {error}
        </p>
      )}

      {made && (
        <p className="mt-3 text-[13px]">
          Draft ready.{" "}
          <a
            href={`/admin/stories/${made.id}`}
            className="font-semibold text-brand-deep"
          >
            Open it and write the top &rarr;
          </a>
        </p>
      )}
    </div>
  );
}
