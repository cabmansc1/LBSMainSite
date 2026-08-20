import { ImageResponse } from "next/og";
import { getCardImageBytes, getPastCard } from "@/lib/past-cards";
import { SITE_NAME } from "@/lib/seo";

/**
 * The share image for one mailed card.
 *
 * The archive already held the good picture: lbs_card_images has a scan
 * of the real 9x12, and /api/card-image serves it publicly. Pointing
 * og:image straight at that scan is the obvious move and the wrong one.
 * A card is 3:4 and Facebook's link preview crops to about 1.91:1, so
 * the reader would get a horizontal band out of the middle of the card
 * with the headline and the offers sliced off. Compositing into 1200x630
 * ourselves means we choose what survives the crop, because nothing is
 * cropped.
 *
 * Every card page in the archive gets one of these without anybody
 * making it, which is the point: the fix is retroactive across years of
 * mailings rather than something that starts from the next card.
 */

export const alt = `A Spotlight Postcard mailed across the Charleston Lowcountry`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0e1d2e";
const BRAND = "#38b6ff";

/**
 * The space the scan occupies in the composite, and therefore the most
 * of it worth decoding. A landscape card fills the wider box, a portrait
 * one the taller; sizing to the larger of each dimension covers both
 * without branching before the image has been read.
 */
const SCAN_BOX = { wide: 470, tall: 514 };

/** Roughly four times the size the box needs, as a backstop. */
const MAX_SCAN_BYTES = 400_000;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await getPastCard(slug);

  if (!card || !card.published) return brandOnly();

  const name = card.cardName ?? card.zoneName;
  const hero =
    card.images.find((i) => i.side === "front") ?? card.images[0] ?? undefined;

  /**
   * Satori renders png, jpeg and svg. The scans are webp, because that
   * is what the upload route encodes, so handing one over unconverted
   * produces a card with a hole where the postcard should be.
   *
   * The first version of this resized to 900px and returned 502 for
   * every card in production while working locally. Nothing here throws:
   * sharp is fine, and Next's own optimizer proves it by converting the
   * same webp on the same host. What broke was memory. A 1800px scan
   * decodes to about ten megabytes, the 900px JPEG reaches Satori as a
   * quarter-megabyte base64 string, and the 1200x630 raster is three
   * more, all on top of a running Next server. The container was killed
   * rather than the request failing, which is why the connection dropped
   * instead of returning a 500, and why the catch below never ran.
   *
   * So the work is bounded to what the design actually draws. The scan
   * occupies at most 470x514 in the composite, so anything larger was
   * decoded, encoded and parsed to be thrown away.
   */
  let scan: string | undefined;
  let portrait = true;
  if (hero) {
    try {
      const stored = await getCardImageBytes(hero.id);
      if (stored) {
        // Imported here rather than at the top so a failure to load it
        // is caught. A static import would take the route down before
        // this try block exists, which is the difference between a
        // wordmark and a 502.
        const sharp = (await import("sharp")).default;
        // libvips keeps decoded tiles around to make repeat work fast.
        // There is no repeat work here, and the cache is memory this
        // process cannot spare.
        sharp.cache(false);
        sharp.concurrency(1);

        const jpeg = await sharp(stored.bytes)
          .resize({ width: SCAN_BOX.wide, height: SCAN_BOX.tall, fit: "inside" })
          .jpeg({ quality: 72, mozjpeg: true })
          .toBuffer();

        // A scan far larger than the box implies something unexpected
        // about the source. The wordmark is a fine answer; another OOM
        // is not.
        if (jpeg.length <= MAX_SCAN_BYTES) {
          scan = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
          if (hero.width && hero.height) portrait = hero.height >= hero.width;
        }
      }
    } catch {
      scan = undefined;
    }
  }

  return new ImageResponse(
    (
      <div style={shell}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            paddingRight: 44,
          }}
        >
          <Wordmark />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 17,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: BRAND,
              }}
            >
              Mailed {card.mailMonth}
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: name.length > 26 ? 46 : 56,
                fontWeight: 700,
                letterSpacing: "-0.032em",
                lineHeight: 1.04,
                color: "#ffffff",
              }}
            >
              {name}
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 25,
                color: "#a8c2d8",
                letterSpacing: "-0.01em",
              }}
            >
              Spotlight Postcard
            </div>
          </div>

          {card.cardName && card.cardName !== card.zoneName ? (
            <div style={{ display: "flex", fontSize: 19, color: "#7e9bb4" }}>
              {card.zoneName}
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 19, color: "#7e9bb4" }}>
              Every home in the zone
            </div>
          )}
        </div>

        {scan ? (
          <div
            style={{
              display: "flex",
              width: portrait ? 392 : 470,
              height: 514,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* A plain img, not next/image: this tree is rendered by
                Satori into a PNG, never into a DOM, so there is no
                loader to optimise through. */}
            <img
              src={scan}
              alt=""
              width={portrait ? 392 : 470}
              height={514}
              style={{
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
              }}
            />
          </div>
        ) : null}
      </div>
    ),
    size,
  );
}

function brandOnly() {
  return new ImageResponse(
    (
      <div style={{ ...shell, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Wordmark />
          <div
            style={{
              marginTop: 22,
              fontSize: 50,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            Spotlight Postcards
          </div>
        </div>
      </div>
    ),
    size,
  );
}

function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          width: 40,
          height: 40,
          borderRadius: 9,
          backgroundColor: BRAND,
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 700,
          color: "#0a1622",
        }}
      >
        L
      </div>
      <div
        style={{
          marginLeft: 14,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "#ffffff",
        }}
      >
        {SITE_NAME}
      </div>
    </div>
  );
}

const shell: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  padding: "58px 62px",
  backgroundColor: NAVY,
  backgroundImage:
    "radial-gradient(1000px 620px at 84% 4%, rgba(56,182,255,0.28) 0%, rgba(56,182,255,0) 62%)",
  color: "#ffffff",
};
