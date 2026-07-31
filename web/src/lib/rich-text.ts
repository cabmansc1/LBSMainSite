/**
 * Light formatting for text a business wrote about itself.
 *
 * The live PHP renders descriptions through nl2br(htmlspecialchars()),
 * so line breaks have always worked there. This app dropped the text
 * into a <p>, where HTML collapses every run of whitespace, and a
 * description written as four short paragraphs came out as one wall.
 * That is a parity regression, not a missing feature.
 *
 * Escaping happens first and unconditionally, then the markup subset is
 * applied to the escaped string. That order is the whole safety
 * argument: nothing a user typed can become a tag, because by the time
 * tags are introduced their angle brackets are already entities. It
 * holds whether the author is an admin today or the advertiser
 * themselves once portal editing lands, which is why it is worth doing
 * now rather than when the trust boundary moves.
 *
 * URLs are deliberately not turned into links. A public directory that
 * auto-links whatever a listing owner types is a link farm waiting to
 * happen, and every listing already has its own website field that
 * renders as a proper button.
 */

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** `**bold**` and `*italic*`, applied to already-escaped text. */
const inline = (s: string) =>
  s
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");

const isBullet = (line: string) => /^\s*[-*•]\s+/.test(line);
const bulletText = (line: string) => line.replace(/^\s*[-*•]\s+/, "");

/**
 * Returns an HTML string for dangerouslySetInnerHTML.
 *
 * Blank line starts a paragraph, single newline is a line break, and a
 * run of lines starting "-", "*" or "•" becomes a list. That covers what
 * people actually type into a description box without asking them to
 * learn anything.
 */
export function renderRichText(input: string): string {
  const text = (input ?? "").replace(/\r\n?/g, "\n").trim();
  if (!text) return "";

  const out: string[] = [];
  // A blank line is the paragraph separator, matching how the text was
  // typed rather than how it was stored.
  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;

    // Runs, not whole blocks. People write a lead-in and then the list
    // under it with no blank line between, "We handle:" followed by
    // three dashes, and requiring the entire block to be bullets turned
    // that into one paragraph with visible dashes in it.
    let run: string[] = [];
    let runIsList = isBullet(lines[0]);

    const flush = () => {
      if (run.length === 0) return;
      out.push(
        runIsList
          ? `<ul>${run.map((l) => `<li>${inline(escape(bulletText(l)))}</li>`).join("")}</ul>`
          : // Single newlines inside a paragraph stay as breaks, which
            // is what an address or a list of hours needs.
            `<p>${run.map((l) => inline(escape(l.trim()))).join("<br />")}</p>`,
      );
      run = [];
    };

    for (const line of lines) {
      const bullet = isBullet(line);
      if (bullet !== runIsList) {
        flush();
        runIsList = bullet;
      }
      run.push(line);
    }
    flush();
  }
  return out.join("");
}

/**
 * The same text with all markup removed, for meta descriptions, card
 * snippets and search. A meta description containing "**" or a literal
 * <br /> is worse than one that is merely plain.
 */
export function richTextToPlain(input: string): string {
  return (input ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}
