import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

/**
 * The sitewide share image.
 *
 * Every page had og:title and og:description but no og:image, so a
 * shared link left Facebook to scrape the page and pick whatever it
 * found over 200x200: a header logo on one page, an advertiser's ad on
 * another, nothing at all on a third. The image was the only missing
 * field, and it is the one that decides whether a share looks like a
 * business or a broken link.
 *
 * This sits at the app root, so it covers every route that does not
 * name its own. /cards/[slug] does, because a specific postcard beats a
 * generic wordmark.
 *
 * No custom font is loaded. next/font/google resolves Geist into the
 * build output rather than a file we can read at request time, and a
 * font that fails to load renders an image with no text on it at all.
 * ImageResponse's bundled face is the safer trade for a fallback whose
 * whole job is to never be the broken one.
 */

export const alt = `${SITE_NAME} — direct mail advertising across the Charleston Lowcountry`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 76px",
          backgroundColor: "#0e1d2e",
          backgroundImage:
            "radial-gradient(1000px 620px at 86% 6%, rgba(56,182,255,0.30) 0%, rgba(56,182,255,0) 62%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: "#38b6ff",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
              color: "#0a1622",
            }}
          >
            L
          </div>
          <div
            style={{
              marginLeft: 16,
              fontSize: 25,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {SITE_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 17,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#93b8d4",
            }}
          >
            Charleston Lowcountry
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 63,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              lineHeight: 1.04,
              maxWidth: 900,
            }}
          >
            Shared mail that reaches every home in the neighborhood
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <Stat value="9x12" label="Oversized card" />
          <Divider />
          <Stat value="10,000" label="Mailboxes a zone" />
          <Divider />
          <Stat value="19" label="Cards a year" />
        </div>
      </div>
    ),
    size,
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 15,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: "#7e9bb4",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        display: "flex",
        width: 1,
        height: 46,
        margin: "0 34px",
        backgroundColor: "rgba(255,255,255,0.16)",
      }}
    />
  );
}
