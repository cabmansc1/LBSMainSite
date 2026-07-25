/**
 * Generates src/lib/map-data.ts from Census ZCTA boundaries.
 *
 * Emits two layers, both in one projection:
 *  - CONTEXT_D: light land silhouette of the wider Lowcountry (every
 *    ZCTA in the expanded frame), so the map reads like a real
 *    reference map: coastline, harbor, sea islands, and lakes appear
 *    as water because ZCTAs exclude them.
 *  - ZONE_SHAPES: the 11 service zones with label anchors.
 *
 * Input: /tmp/sc-zips.json (SC ZCTA GeoJSON, not committed)
 * Re-run when zones/ZIPs change:  node scripts/build-map.mjs
 */
import { readFileSync, writeFileSync } from "fs";

const VIEW_W = 760;
const VIEW_H = 640;
const PAD = 8;
const FRAME = 0.30; // expand zone bbox by 30% per side for context
const ZONE_TOL = 1.0;
const CTX_TOL = 1.2;
const MIN_RING_AREA = 140;
const CTX_MIN_AREA = 40;

const ZONE_ZIPS = {
  summerville: ["29483", "29485", "29486"],
  "mount-pleasant": ["29464", "29466"],
  "daniel-island": ["29492"],
  "north-charleston": ["29405", "29406", "29418", "29420"],
  "moncks-corner": ["29461"],
  charleston: ["29401", "29403", "29407", "29414", "29439"],
  "goose-creek": ["29445"],
  "sullivans-island": ["29482"],
  "isle-of-palms": ["29451"],
  "james-island": ["29412"],
  "johns-island": ["29455"],
};

const zipToZone = {};
for (const [zone, zips] of Object.entries(ZONE_ZIPS))
  for (const z of zips) zipToZone[z] = zone;

const geo = JSON.parse(readFileSync("/tmp/sc-zips.json", "utf8"));

const ringsOf = (f) =>
  f.geometry.type === "Polygon"
    ? f.geometry.coordinates.map((r) => r)
    : f.geometry.coordinates.flatMap((poly) => poly);
const outerRingsOf = (f) =>
  f.geometry.type === "Polygon"
    ? [f.geometry.coordinates[0]]
    : f.geometry.coordinates.map((poly) => poly[0]);

// Zone bbox drives the frame
let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
for (const f of geo.features) {
  if (!zipToZone[f.properties.ZCTA5CE10]) continue;
  for (const ring of outerRingsOf(f))
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
}
const lonPad = (maxLon - minLon) * FRAME;
const latPad = (maxLat - minLat) * FRAME;
const fMinLon = minLon - lonPad, fMaxLon = maxLon + lonPad;
const fMinLat = minLat - latPad, fMaxLat = maxLat + latPad;

const midLat = ((fMinLat + fMaxLat) / 2) * (Math.PI / 180);
const kx = Math.cos(midLat);
const spanX = (fMaxLon - fMinLon) * kx;
const spanY = fMaxLat - fMinLat;
const scale = Math.min((VIEW_W - PAD * 2) / spanX, (VIEW_H - PAD * 2) / spanY);
const offX = (VIEW_W - spanX * scale) / 2;
const offY = (VIEW_H - spanY * scale) / 2;
const project = ([lon, lat]) => [
  offX + (lon - fMinLon) * kx * scale,
  offY + (fMaxLat - lat) * scale,
];

function simplify(points, tol) {
  if (points.length <= 4) return points;
  const sqTol = tol * tol;
  const sqSegDist = (p, a, b) => {
    let [x, y] = a;
    let dx = b[0] - x, dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b[0]; y = b[1]; }
      else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p[0] - x; dy = p[1] - y;
    return dx * dx + dy * dy;
  };
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0, index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(points[i], points[first], points[last]);
      if (d > maxDist) { maxDist = d; index = i; }
    }
    if (maxDist > sqTol && index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const ringArea = (ring) => {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++)
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(area / 2);
};

const r1 = (n) => Math.round(n * 10) / 10;
const toPath = (ring) =>
  "M" + ring.map(([x, y]) => `${r1(x)} ${r1(y)}`).join("L") + "Z";
const inFrame = (ring) =>
  ring.some(
    ([lon, lat]) =>
      lon >= fMinLon && lon <= fMaxLon && lat >= fMinLat && lat <= fMaxLat,
  );

// ---- context: county land silhouettes (like a printed reference map;
// counties include marshland, so the Lowcountry reads as continuous
// land with the real coastline, unlike ZCTAs which skip wetlands) ----
const countiesGeo = JSON.parse(readFileSync("/tmp/us-counties.json", "utf8"));
const counties = [];
for (const f of countiesGeo.features) {
  if (!String(f.id).startsWith("45")) continue; // South Carolina
  // All rings including holes, so lakes (Moultrie, Marion) render as
  // water via fill-rule evenodd in the components.
  const rings = ringsOf(f).filter(inFrame);
  if (rings.length === 0) continue;
  const paths = rings
    .map((ring) => simplify(ring.map(project), CTX_TOL))
    .filter((ring) => ring.length >= 4 && ringArea(ring) >= CTX_MIN_AREA)
    .map(toPath);
  if (paths.length > 0)
    counties.push({ name: f.properties.NAME, d: paths.join("") });
}

// ---- lakes (Natural Earth 10m; the county source has no lake holes) ----
const lakesGeo = JSON.parse(readFileSync("/tmp/ne-lakes.json", "utf8"));
const lakePaths = [];
for (const f of lakesGeo.features) {
  const rings = outerRingsOf(f).filter(inFrame);
  for (const ring of rings) {
    const s = simplify(ring.map(project), CTX_TOL);
    if (s.length >= 4 && ringArea(s) >= CTX_MIN_AREA) {
      lakePaths.push(toPath(s));
      console.log(`lake: ${f.properties.name}`);
    }
  }
}
const lakesD = lakePaths.join("");

// ---- zones ----
const zoneRings = {};
for (const f of geo.features) {
  const zone = zipToZone[f.properties.ZCTA5CE10];
  if (!zone) continue;
  for (const ring of outerRingsOf(f)) (zoneRings[zone] ??= []).push(ring);
}

const shapes = [];
for (const [zone, rings] of Object.entries(zoneRings)) {
  const projected = rings
    .map((ring) => simplify(ring.map(project), ZONE_TOL))
    .filter((ring) => ring.length >= 4 && ringArea(ring) >= MIN_RING_AREA);
  const paths = projected.map(toPath);

  let best = null, bestArea = 0;
  for (const ring of projected) {
    let area = 0, cx = 0, cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const cross = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
      area += cross;
      cx += (ring[i][0] + ring[i + 1][0]) * cross;
      cy += (ring[i][1] + ring[i + 1][1]) * cross;
    }
    area /= 2;
    if (Math.abs(area) > Math.abs(bestArea)) {
      bestArea = area;
      best = [cx / (6 * area), cy / (6 * area)];
    }
  }

  shapes.push({ slug: zone, d: paths.join(""), labelX: r1(best[0]), labelY: r1(best[1]) });
  console.log(`${zone}: ${paths.length} rings, ${paths.join("").length} chars`);
}

const ctxSize = counties.reduce((n, c) => n + c.d.length, 0);
console.log(
  `context: ${counties.length} counties (${counties.map((c) => c.name).join(", ")}), ${Math.round(ctxSize / 1024)}KB`,
);

const out = `/**
 * GENERATED by scripts/build-map.mjs from Census ZCTA and county
 * boundaries. Do not edit by hand; re-run the script to regenerate.
 */
export const MAP_VIEW = { w: ${VIEW_W}, h: ${VIEW_H} };

/** County land silhouettes for the wider Lowcountry (context layer). */
export const COUNTIES: { name: string; d: string }[] = ${JSON.stringify(counties)};

/** Lakes drawn over land (Natural Earth 10m). */
export const LAKES_D = ${JSON.stringify(lakesD)};

export type ZoneShape = {
  slug: string;
  d: string;
  labelX: number;
  labelY: number;
};

export const ZONE_SHAPES: ZoneShape[] = ${JSON.stringify(shapes, null, 2)};
`;

writeFileSync("src/lib/map-data.ts", out);
console.log(`Wrote src/lib/map-data.ts`);
