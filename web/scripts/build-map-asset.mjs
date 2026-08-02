/**
 * Rebuilds public/map/coverage-base.webp from the artwork.
 *
 * Run from web/:  node scripts/build-map-asset.mjs
 *
 * The served map is not the artwork as delivered, and without this the
 * difference would be a mystery binary nobody could reproduce. It is the
 * PNG with two rectangles painted out and a WebP conversion, taking
 * 1,858KB to about 135KB.
 */
import sharp from "sharp";
const SRC = "public/map/Modern Map Design.png";
const OUT = "public/map/coverage-base.webp";

/**
 * Two things painted out of the artwork, both for the same reason: they
 * are the map's furniture rather than anything a buyer needs.
 *
 * The county key. Cropping it would have left the Summerville label
 * eleven pixels from the frame, since the card ends at x=419 and that
 * pill begins at x=431. Everything it covered is flat Dorchester beige
 * sampled at rgb(225,221,216) on all four sides.
 *
 * "ATLANTIC OCEAN". The cropped viewBox ends at x=1385 and the lettering
 * runs past it, so it was being sliced mid-word. Widening the crop to
 * fit it would spend a chunk of the zoom on open water to keep a label
 * that tells nobody anything.
 *
 * The rectangle is x 1250-1490, y 770-880, read off a gridded crop of
 * the artwork. An earlier attempt used x 1136-1470, from a white-pixel
 * scan that had picked up the "James Island" pill's own lettering as if
 * it were part of the ocean label, and painted over half that pill. The
 * pill ends at x=1175 and the ocean lettering does not start until
 * x=1270; there is 95px of open water between them.
 */
const cover = Buffer.from(
  `<svg width="1536" height="1024" xmlns="http://www.w3.org/2000/svg">
     <rect x="0" y="0" width="428" height="338" fill="rgb(225,221,216)"/>
     <rect x="1250" y="770" width="240" height="110" fill="rgb(2,84,146)"/>
   </svg>`,
);

const info = await sharp(SRC)
  .composite([{ input: cover, top: 0, left: 0 }])
  .webp({ quality: 84 })
  .toFile(OUT);
console.log(`coverage-base.webp  ${(info.size / 1024).toFixed(0)}KB  ${info.width}x${info.height}`);
