import { renderRichText } from "@/lib/rich-text";

/**
 * Renders a business-written description with its line breaks intact.
 *
 * dangerouslySetInnerHTML is the right call here and only here: the
 * string comes from renderRichText, which escapes its input before it
 * introduces a single tag, so the HTML being set is the HTML this file
 * generated rather than anything a user supplied.
 *
 * Spacing lives in the component rather than in the generated markup so
 * the same text can be tight in a card and roomy on a detail page
 * without the renderer knowing where it is being used.
 */
export function RichText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const html = renderRichText(text);
  if (!html) return null;
  return (
    <div
      className={`[&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:mb-3 [&>ul:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:mb-1 [&_strong]:font-semibold ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
