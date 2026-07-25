import { MAP_IMG, MAP_POSITIONS } from "@/lib/map-positions";

/**
 * Static (server-rendered) mini map for zone pages: the Tri-County
 * base map with the current zone's bubble highlighted in orange.
 */
export function ZoneMiniMap({ highlight }: { highlight: string }) {
  return (
    <svg
      viewBox={`0 0 ${MAP_IMG.w} ${MAP_IMG.h}`}
      role="img"
      aria-label="Zone highlighted on the Lowcountry coverage map"
      className="w-full h-auto rounded-[10px] border border-line"
    >
      <image href={MAP_IMG.src} width={MAP_IMG.w} height={MAP_IMG.h} />
      {MAP_POSITIONS.map((b) => {
        const sel = b.slug === highlight;
        return (
          <circle
            key={b.slug}
            cx={b.x}
            cy={b.y}
            r={sel ? b.r + 6 : b.r * 0.6}
            fill={sel ? "rgba(255,140,0,.45)" : "rgba(56,182,255,.25)"}
            stroke={sel ? "#E67C00" : "rgba(18,135,216,.55)"}
            strokeWidth={sel ? 4 : 1.5}
          />
        );
      })}
    </svg>
  );
}
