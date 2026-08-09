/**
 * How story and post bodies are typeset.
 *
 * One string, imported by both the editor and the page that publishes
 * what it wrote. They were always going to be styled the same way, and
 * keeping two copies of a long list of arbitrary variants is how a
 * heading ends up one size while you are writing it and another once it
 * is live.
 *
 * No "server-only" here: the editor is a client component.
 *
 * Lifted from the blog post template, which had it inline, so migrated
 * posts and new stories keep rendering identically.
 */
export const PROSE_CLASS =
  "prose-lbs text-[16px] leading-relaxed text-body " +
  "[&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-ink [&_h2]:mt-8 [&_h2]:mb-3 " +
  "[&_h3]:text-[18px] [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mt-6 [&_h3]:mb-2 " +
  "[&_p]:mb-4 " +
  "[&_a]:text-brand-deep [&_a]:font-semibold " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 " +
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 " +
  "[&_li]:mb-1 " +
  "[&_img]:rounded-xl [&_img]:my-6 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-brand [&_blockquote]:pl-4 [&_blockquote]:text-muted [&_blockquote]:my-5 " +
  "[&_strong]:text-ink [&_strong]:font-semibold";
