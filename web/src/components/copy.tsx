import { highlightSegments } from "@/lib/blocks";

/**
 * Renders editable copy that may carry one emphasised run.
 *
 * The headlines this replaces had their coloured phrase written into the
 * JSX. Once the words come from a textarea in the admin, the emphasis
 * has to travel with them, and asking anyone to type a span into a
 * headline field is how you end up with markup on the homepage.
 *
 * So *asterisks* mark the run and this turns them into an element. It
 * never sets HTML: the segments are text nodes either way, which means
 * nothing typed into the admin can introduce a tag.
 */
export function Copy({
  text,
  markClass = "",
}: {
  text: string;
  markClass?: string;
}) {
  const segments = highlightSegments(text);
  return (
    <>
      {segments.map((seg, i) =>
        seg.mark ? (
          <em key={i} className={`not-italic ${markClass}`}>
            {seg.text}
          </em>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
