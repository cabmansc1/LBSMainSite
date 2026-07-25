import { MAP_VIEW, ZONE_SHAPES, COUNTIES, LAKES_D } from "@/lib/map-data";

/**
 * Static (server-rendered) mini map for zone pages: light reference-map
 * style with real geography, current zone highlighted in orange.
 */
export function ZoneMiniMap({ highlight }: { highlight: string }) {
  return (
    <svg
      viewBox={`0 0 ${MAP_VIEW.w} ${MAP_VIEW.h}`}
      role="img"
      aria-label="Zone highlighted on the Lowcountry coverage map"
      className="w-full h-auto rounded-[10px] border border-line"
    >
      <rect width={MAP_VIEW.w} height={MAP_VIEW.h} fill="#ACD9EF" />
      {COUNTIES.map((c) => (
        <path
          key={c.name}
          d={c.d}
          fill="#FBFDFE"
          fillRule="evenodd"
          stroke="#9FB8C9"
          strokeWidth="1"
          strokeDasharray="3 4"
          strokeLinejoin="round"
        />
      ))}
      <path d={LAKES_D} fill="#ACD9EF" stroke="#8FC3DE" strokeWidth="0.75" strokeLinejoin="round" />
      {ZONE_SHAPES.map((s) => {
        const sel = s.slug === highlight;
        return (
          <path
            key={s.slug}
            d={s.d}
            fill={sel ? "rgba(255,140,0,.55)" : "rgba(56,182,255,.22)"}
            stroke={sel ? "#E67C00" : "rgba(18,135,216,.6)"}
            strokeWidth={sel ? 2 : 0.75}
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}
