import { MAP_IMG, mapPositionsFrom } from "@/lib/map-positions";
import { ZONES, mailingAreasFrom, type Zone } from "@/lib/zones";

/**
 * Static (server-rendered) mini map for zone pages: the coverage base
 * map with the current zone's marker highlighted in orange.
 *
 * No availability colours here, unlike the full map. This is a server
 * component with no card data, and it answers "where is this place",
 * not "can I still get on it". Inventing a status it cannot check would
 * be worse than showing none.
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
  const positions = mapPositionsFrom(areas);
  // Bubbles are drawn per card, so a zone that shares one highlights
  // its partner's bubble. Matching on the zone slug alone left the
  // Sullivan's Island page with nothing lit up at all.
  const lit =
    areas.find((a) => a.zoneSlugs.includes(highlight))?.slug ?? highlight;
  return (
    <svg
      viewBox={`${MAP_IMG.view.x} ${MAP_IMG.view.y} ${MAP_IMG.view.w} ${MAP_IMG.view.h}`}
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
            r={sel ? c.r + 3 : c.r - 2}
            fill={sel ? "#FF8C00" : "#38B6FF"}
            fillOpacity={sel ? 1 : 0.75}
            stroke="#fff"
            strokeWidth={sel ? 4 : 2.5}
          />
        ));
      })}
    </svg>
  );
}
