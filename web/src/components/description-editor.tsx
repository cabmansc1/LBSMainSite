"use client";

import { useRef, useState } from "react";
import { renderRichText } from "@/lib/rich-text";

/**
 * A description box that says what formatting it accepts, and shows it.
 *
 * A plain textarea gives no hint that a blank line makes a paragraph or
 * that "- " makes a list, so nobody uses either and descriptions arrive
 * as one long run-on. The buttons wrap the selection rather than opening
 * a rich editor: the stored value stays plain text, which is what keeps
 * it safe to render on a public page and what lets the legacy PHP admin
 * keep editing the same field without knowing anything changed.
 */
export function DescriptionEditor({
  value,
  onChange,
  rows = 6,
  className = "",
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  /** Wraps the selection, or drops in an example when nothing is selected. */
  const wrap = (mark: string, example: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const selected = value.slice(a, b) || example;
    const next = `${value.slice(0, a)}${mark}${selected}${mark}${value.slice(b)}`;
    onChange(next);
    // Put the caret back around what was just wrapped, so typing
    // continues where the writer was looking.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + mark.length, a + mark.length + selected.length);
    });
  };

  /** Prefixes every selected line, which is what a list actually is. */
  const bullet = () => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const start = value.lastIndexOf("\n", a - 1) + 1;
    const end = value.indexOf("\n", b) === -1 ? value.length : value.indexOf("\n", b);
    const block = value.slice(start, end) || "Something you offer";
    const marked = block
      .split("\n")
      .map((l) => (/^\s*[-*•]\s+/.test(l) ? l : `- ${l}`))
      .join("\n");
    onChange(value.slice(0, start) + marked + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start + marked.length);
    });
  };

  const btn =
    "text-[12px] font-semibold px-2 py-1 rounded border border-line-strong bg-white hover:border-faint";

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button type="button" onClick={() => wrap("**", "bold text")} className={`${btn} font-bold`}>
          B
        </button>
        <button type="button" onClick={() => wrap("*", "italic text")} className={`${btn} italic`}>
          I
        </button>
        <button type="button" onClick={bullet} className={btn}>
          List
        </button>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className={`${btn} ml-auto`}
        >
          {preview ? "Edit" : "Preview"}
        </button>
      </div>

      {preview ? (
        <div
          className="min-h-[112px] text-[14px] text-body leading-relaxed border border-line-strong rounded-lg bg-white px-3.5 py-2.5 [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:mb-3 [&>ul:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&_strong]:font-semibold"
          // Same renderer the public page uses, so the preview cannot
          // flatter the text. It escapes before it adds any tag.
          dangerouslySetInnerHTML={{
            __html:
              renderRichText(value) ||
              '<p class="opacity-60">Nothing to preview yet.</p>',
          }}
        />
      ) : (
        <textarea
          ref={ref}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}

      <p className="text-[11.5px] text-muted">
        Blank line starts a new paragraph, a single return is a line break,
        and lines beginning with a dash become bullets. Links are not
        clickable here; the website field handles that.
      </p>
    </div>
  );
}
