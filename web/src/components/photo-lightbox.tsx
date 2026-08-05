"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Listing photos, openable.
 *
 * The grid crops every photo to a square with object-cover, which is
 * right for a tidy grid and wrong for a photo of a dining room: the ends
 * are simply gone and there was no way to see them. The thumbnails stay
 * cropped; clicking one shows the whole thing.
 *
 * Keyboard and screen readers get the same thing. These are buttons
 * rather than clickable divs, Escape closes, the arrows move, and focus
 * is not stolen from the page underneath by anything except the dialog
 * itself.
 */

export type LightboxPhoto = { url: string; alt: string };

export function PhotoGrid({ photos }: { photos: LightboxPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const move = useCallback(
    (by: number) =>
      setOpen((i) =>
        i === null ? null : (i + by + photos.length) % photos.length,
      ),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    document.addEventListener("keydown", key);
    // The page behind must not scroll while a full-screen image is over
    // it, or closing leaves you somewhere you did not choose to be.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = previous;
    };
  }, [open, close, move]);

  const current = open === null ? null : photos[open];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {photos.map((p, i) => (
          <button
            key={p.url}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={p.alt ? `View ${p.alt}` : `View photo ${i + 1}`}
            className="group relative rounded-[10px] overflow-hidden border border-line bg-surface cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.alt}
              loading="lazy"
              className="w-full aspect-square object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.alt || "Photo"}
          onClick={close}
          className="fixed inset-0 z-[100] bg-navy-950/92 flex items-center justify-center p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.alt}
            // Stops a click on the photo itself from closing, which is
            // the reflex when zooming in on a detail.
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[88vh] object-contain rounded-[10px]"
          />

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/12 text-white text-[22px] leading-none grid place-items-center hover:bg-white/22"
          >
            ×
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  move(-1);
                }}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/12 text-white text-[20px] leading-none grid place-items-center hover:bg-white/22"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  move(1);
                }}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/12 text-white text-[20px] leading-none grid place-items-center hover:bg-white/22"
              >
                ›
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12.5px] font-semibold text-white/80 num">
                {(open ?? 0) + 1} of {photos.length}
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
