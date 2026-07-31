import { MAP_IMG, mapPositionsFrom } from "@/lib/map-positions";
import { ZONES, mailingAreasFrom, type Zone } from "@/lib/zones";

/**
 * Static (server-rendered) mini map for zone pages: the Tri-County
 * base map with the current zone's bubble highlighted in orange.
 *
 * Takes its zones from the page, which has already read the live ones,
 * rather than reading them again.
 */
export function ZoneMiniMap({
  highlight,
  zones = ZONES,
}: {
  highlight: string;
  zones?: Zone[];
}) {
  const areas = mailingAreasFrom(zones);
  const positions = mapPositionsFrom(zones, areas);
  // Bubbles are drawn per card, so a zone that shares one highlights
  // its partner's bubble. Matching on the zone slug alone left the
  // Sullivan's Island page with nothing lit up at all.
  const lit =
    areas.find((a) => a.zoneSlugs.includes(highlight))?.slug ?? highlight;
  return (
    <svg
      viewBox={`0 0 ${MAP_IMG.w} ${MAP_IMG.h}`}
      role="img"
      aria-label="Zone highlighted on the Lowcountry coverage map"
      className="w-full h-auto rounded-[10px] border border-line"
    >
      <image href={MAP_IMG.src} width={MAP_IMG.w} height={MAP_IMG.h} />
      {positions.flatMap((b) => {
        const sel = b.slug === lit;
        // Both islands light up on either island's page, because the
        // card the page is selling covers both.
        return [{ x: b.x, y: b.y, r: b.r }, ...(b.also ?? [])].map((c) => (
          <circle
            key={`${b.slug}-${c.x}`}
            cx={c.x}
            cy={c.y}
            r={sel ? c.r + 6 : c.r * 0.6}
            fill={sel ? "rgba(255,140,0,.45)" : "rgba(56,182,255,.25)"}
            stroke={sel ? "#E67C00" : "rgba(18,135,216,.55)"}
            strokeWidth={sel ? 4 : 1.5}
          />
        ));
      })}
    </svg>
  );
}
