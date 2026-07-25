"use client";

import { useState } from "react";

/**
 * Admin QR studio: preview an advertiser's branded QR, download SVG
 * directly or convert to high-res PNG client-side via canvas.
 */
export function QrStudio({
  advertisers,
}: {
  advertisers: { slug: string; name: string; scans?: number }[];
}) {
  const [slug, setSlug] = useState(advertisers[0]?.slug ?? "");
  const [style, setStyle] = useState<"brand" | "plain">("brand");
  const current = advertisers.find((a) => a.slug === slug);
  const src = slug ? `/api/qr/${slug}${style === "plain" ? "?style=plain" : ""}` : "";

  async function downloadPng() {
    const res = await fetch(src);
    const svgText = await res.text();
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const SIZE = 2048; // print-res
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    URL.revokeObjectURL(url);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qr-${slug}.png`;
    a.click();
  }

  return (
    <div className="grid lg:grid-cols-[.55fr_.45fr] gap-5 items-start">
      <div className="bg-white border border-line rounded-(--radius-card) p-6.5 grid gap-4">
        <div>
          <label htmlFor="qr-adv" className="text-[12.5px] font-semibold text-body block mb-1.5">
            Advertiser
          </label>
          <select
            id="qr-adv"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950"
          >
            {advertisers.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-[12.5px] font-semibold text-body block mb-1.5">Style</span>
          <div className="flex gap-2">
            {(
              [
                ["brand", "Branded (badge)"],
                ["plain", "Plain (small print)"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStyle(key)}
                className={`text-[13px] font-semibold px-4 py-2 rounded-lg border transition-colors ${
                  style === key
                    ? "bg-navy-950 text-white border-navy-950"
                    : "bg-white text-body border-line-strong hover:border-faint"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <dl className="grid gap-2 text-[13.5px] border-t border-line pt-4">
          <div className="flex justify-between">
            <dt className="text-muted">Points to</dt>
            <dd className="font-semibold">/q/{slug}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Scans recorded</dt>
            <dd className="font-semibold num">{current?.scans ?? 0}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Error correction</dt>
            <dd className="font-semibold">{style === "brand" ? "H (30%)" : "M (15%)"}</dd>
          </div>
        </dl>
        <div className="flex gap-2.5 flex-wrap">
          <a
            href={src}
            download={`qr-${slug}.svg`}
            className="bg-navy-950 text-white font-semibold text-[13.5px] px-4.5 py-2.5 rounded-(--radius-btn) hover:bg-navy-800 transition-colors"
          >
            Download SVG (print)
          </a>
          <button
            onClick={downloadPng}
            className="bg-white text-ink border border-line-strong font-semibold text-[13.5px] px-4.5 py-2.5 rounded-(--radius-btn) hover:border-faint transition-colors"
          >
            Download PNG (2048px)
          </button>
        </div>
        <p className="text-[12px] text-muted">
          Always print at 0.8 inches or larger and scan-test a proof before
          the full run. The branded style needs the larger size; use plain
          below one inch.
        </p>
      </div>

      <div className="bg-surface border border-line rounded-(--radius-card) p-8 grid place-items-center">
        {src ? (
          // The SVG endpoint is same-origin; an img tag keeps preview simple.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`QR code preview for ${current?.name ?? slug}`} className="w-full max-w-[300px] h-auto" />
        ) : (
          <p className="text-muted text-sm">Pick an advertiser</p>
        )}
      </div>
    </div>
  );
}
