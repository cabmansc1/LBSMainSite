import "server-only";
import QRCode from "qrcode";

/**
 * Brand-styled QR generator. Renders the module matrix as SVG with
 * rounded navy dots and the LB badge in the center. Error correction
 * level H tolerates the center badge (30% damage allowance); finder
 * patterns stay solid squares for reliable scanning.
 */
export async function brandQrSvg(url: string): Promise<string> {
  const code = QRCode.create(url, { errorCorrectionLevel: "H" });
  const size = code.modules.size;
  const data = code.modules.data;

  const CELL = 10;
  const QUIET = 4; // quiet-zone cells around the code
  const total = (size + QUIET * 2) * CELL;

  // Center badge: clear a hole ~5 modules square
  const holeSpan = Math.floor(size / 5);
  const holeStart = Math.floor((size - holeSpan) / 2);
  const holeEnd = holeStart + holeSpan;

  const inFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
  const inHole = (r: number, c: number) =>
    r >= holeStart && r < holeEnd && c >= holeStart && c < holeEnd;

  let dots = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!data[r * size + c] || inHole(r, c)) continue;
      const x = (c + QUIET) * CELL;
      const y = (r + QUIET) * CELL;
      if (inFinder(r, c)) {
        dots += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="#0a1622"/>`;
      } else {
        dots += `<circle cx="${x + CELL / 2}" cy="${y + CELL / 2}" r="${CELL * 0.38}" fill="#0a1622"/>`;
      }
    }
  }

  const badgeC = total / 2;
  const badgeR = (holeSpan * CELL) / 2 - 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" role="img" aria-label="QR code">
<rect width="${total}" height="${total}" fill="#ffffff"/>
${dots}
<circle cx="${badgeC}" cy="${badgeC}" r="${badgeR}" fill="#38b6ff"/>
<text x="${badgeC}" y="${badgeC + badgeR * 0.28}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="${badgeR * 0.85}" fill="#0a1622">LB</text>
</svg>`;
}

/** Plain high-contrast fallback (no badge), for tiny print sizes. */
export async function plainQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
    color: { dark: "#0a1622", light: "#ffffff" },
  });
}
