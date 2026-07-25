import { MAP_VIEW, ZONE_SHAPES } from "@/lib/map-data";

/**
 * Static (server-rendered) mini map for zone pages: real geography,
 * current zone highlighted in orange, everything else quiet blue.
 */
export function ZoneMiniMap({ highlight }: { highlight: string }) {
  return (
    <svg
      viewBox={`0 0 ${MAP_VIEW.w} ${MAP_VIEW.h}`}
      role="img"
      aria-label="Zone highlighted on the Lowcountry coverage map"
      className="w-full h-auto rounded-[10px]"
    >
      <rect width={MAP_VIEW.w} height={MAP_VIEW.h} fill="#0e1d2e" rx="12" />
      {ZONE_SHAPES.map((s) => {
        const sel = s.slug === highlight;
        return (
          <path
            key={s.slug}
            d={s.d}
            fill={sel ? "rgba(255,140,0,.45)" : "rgba(56,182,255,.16)"}
            stroke={sel ? "#ff8c00" : "rgba(56,182,255,.55)"}
            strokeWidth={sel ? 2 : 0.75}
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}
