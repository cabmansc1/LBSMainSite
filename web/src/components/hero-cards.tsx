"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export type HeroCard = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** "Summerville, August 2026", when the shot is a real mailed card. */
  caption?: string;
  href?: string;
};

const INTERVAL_MS = 5000;

/**
 * The hero card, rotating through real mailed cards.
 *
 * It was one static sample while the archive filled up with photographs
 * of actual mailings. Those are better proof than a mockup, and there
 * are enough of them now that showing one is a waste of the rest.
 *
 * Every frame is stacked and positioned, with only opacity animating, so
 * the hero never changes height and the card below it never moves. The
 * first frame carries `priority` because it is the largest thing above
 * the fold and almost certainly the LCP element; the others are lazy,
 * since nobody sees frame four until twenty seconds in.
 */
export function HeroCards({ cards }: { cards: HeroCard[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cards.length < 2 || paused) return;
    // Somebody who has asked their system to reduce motion has asked for
    // this too. They still get the first card and the controls.
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    if (reduced) return;

    timer.current = setInterval(
      () => setIndex((i) => (i + 1) % cards.length),
      INTERVAL_MS,
    );
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [cards.length, paused]);

  if (cards.length === 0) return null;
  const current = cards[index];

  return (
    <div
      className="w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/*
        A fixed landscape frame that every card is fitted inside.

        Two things were wrong. The frames after the first were positioned
        with `absolute inset-0`, which stretches whatever it holds to the
        shape of the box, so a portrait card arrived distorted. And the
        box took its height from the first card, so a portrait card in
        that slot made the hero tall enough to push everything beside it
        around.

        Now the frame owns the height and each card is scaled to fit
        inside it with its own proportions kept. A portrait card comes
        out narrow and centred, which is what a tall card genuinely looks
        like next to a wide one, and nothing moves when the frame
        changes.

        The tilt is gone. It read as a flourish on a single landscape
        mockup and as a mistake on a real portrait card.
      */}
      <div className="relative w-full aspect-[3/2]">
        {cards.map((c, i) => (
          <Image
            key={c.src}
            src={c.src}
            alt={c.alt}
            width={c.width}
            height={c.height}
            priority={i === 0}
            sizes="(max-width: 768px) 92vw, 460px"
            // inset-0 with auto margins centres it both ways, and the
            // max/auto pair scales it down to fit without ever enlarging
            // a small card. The shadow then hugs the card itself rather
            // than the empty frame around it.
            className={`absolute inset-0 m-auto max-w-full max-h-full w-auto h-auto rounded-[14px] shadow-[0_28px_60px_rgba(0,0,0,.4)] transition-opacity duration-700 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={i === index ? undefined : true}
          />
        ))}
      </div>

      {cards.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="flex gap-2" role="tablist" aria-label="Mailed cards">
            {cards.map((c, i) => (
              <button
                key={c.src}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={c.caption ?? `Card ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-brand" : "w-1.5 bg-white/25 hover:bg-white/45"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* The caption is what turns a nice photo into evidence: this is a
          real card, it went to a real neighborhood, on a date. */}
      {current.caption && (
        <p className="mt-2.5 text-center text-[12.5px] text-[#67768A]">
          {current.href ? (
            <a href={current.href} className="hover:text-[#93A5B8]">
              {current.caption}
            </a>
          ) : (
            current.caption
          )}
        </p>
      )}
    </div>
  );
}
