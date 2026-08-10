"use client";

import { useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { PROSE_CLASS } from "@/lib/prose";
import { MediaPicker } from "@/components/media-picker";

/**
 * Writing a story.
 *
 * Replaces a plain textarea that expected hand-written HTML and had no
 * way to place a picture inside an article. That was survivable for a
 * handful of posts a year and fatal for one a week, which is the whole
 * point of this phase.
 *
 * The toolbar is deliberately short. Two heading levels, bold, italic,
 * link, two kinds of list, a quote and a picture. No colours, no fonts,
 * no sizes, no alignment. A narrow toolbar is what keeps a publication
 * looking like one: every extra control is a way for one article to end
 * up looking unlike the rest, and none of them make the writing better.
 *
 * Emits plain HTML, which is what the existing migrated posts are
 * already stored as, so nothing needs converting either way.
 */
/** What a picture can be set to. Short on purpose. */
const SIZES = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "full", label: "Full" },
];

const ALIGNS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
];

/**
 * One toolbar button.
 *
 * Out here rather than inside RichEditor because a component created
 * during another component's render is a different component every
 * render. React would tear down and rebuild all ten of these on every
 * keystroke, which is both wasteful and a way to lose focus.
 */
function Btn({
  on,
  label,
  onClick,
  wide = false,
  disabled = false,
}: {
  on?: boolean;
  label: string;
  onClick: () => void;
  wide?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={on ?? false}
      onClick={onClick}
      className={`text-[12.5px] font-semibold rounded-[7px] border disabled:opacity-40 ${
        wide ? "px-2.5" : "px-2"
      } py-1.5 ${
        on
          ? "bg-navy-950 text-white border-navy-950"
          : "bg-white border-line-strong text-body hover:border-navy-950"
      }`}
    >
      {label}
    </button>
  );
}

export function RichEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Start writing.",
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [error, setError] = useState("");

  const editor = useEditor({
    /*
     * Rendering on the server would hydrate against markup React did not
     * produce, so Tiptap asks to be told explicitly. This is the
     * documented setting for SSR; without it the first paint mismatches
     * and React throws it away.
     */
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Two levels only. The page supplies the h1, and an article that
        // reaches h4 has a structure problem no editor can fix.
        link: {
          openOnClick: false,
          autolink: true,
          // Anything typed or pasted in gets these, so a link out of a
          // story cannot pass authority on or open us to tab-nabbing.
          HTMLAttributes: {
            rel: "noopener noreferrer",
            target: "_blank",
          },
        },
        codeBlock: false,
        horizontalRule: false,
      }),
      /*
       * Pictures carry how big they are and where they sit.
       *
       * Tiptap's Image node knows about src and alt and nothing else,
       * so the two attributes are added here. Stored as data-size and
       * data-align rather than as inline styles: the HTML stays
       * readable, the sanitiser has no reason to touch it, and how a
       * "medium" picture actually looks stays a decision the stylesheet
       * makes rather than one baked into every article ever written.
       */
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            size: {
              default: "full",
              parseHTML: (el) => el.getAttribute("data-size") ?? "full",
              renderHTML: (attrs) => ({ "data-size": attrs.size }),
            },
            align: {
              default: "center",
              parseHTML: (el) => el.getAttribute("data-align") ?? "center",
              renderHTML: (attrs) => ({ "data-align": attrs.align }),
            },
          };
        },
      }).configure({
        HTMLAttributes: { class: "rounded-(--radius-card) border border-line" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        // The same typesetting the published page uses, so what is
        // written looks like what goes out rather than approximately
        // like it.
        class: `${PROSE_CLASS} min-h-[320px] px-4 py-3.5 focus:outline-none`,
      },
    },
  });

  /**
   * Pictures go through the media library rather than being pasted in as
   * data, so every one of them gets an id, gets resized once, and has
   * somewhere for its alt text to live.
   */
  /**
   * Pictures go through the picker now.
   *
   * The old path uploaded straight from a file input and inserted the
   * result with `alt=""`, so every picture in every article was
   * undescribed and nothing ever asked. The picker returns the
   * description with the id, and it is set on the node here.
   */
  const [picking, setPicking] = useState(false);

  // Read every render rather than tracked in state: the editor already
  // re-renders on selection change, and a second copy of "what is
  // selected" is a second thing that can be wrong.
  const imageSelected = editor?.isActive("image") ?? false;
  const imageAttrs = editor?.getAttributes("image") ?? {};

  const setLink = useCallback(() => {
    if (!editor) return;
    const current = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address", current ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="border border-line-strong rounded-[10px] bg-white min-h-[380px]" />
    );
  }

  return (
    <div className="grid gap-0">
      {/*
        Size and placement, shown only with a picture selected.

        A second row rather than more buttons on the first: they apply
        to one kind of thing, they are meaningless the rest of the time,
        and a toolbar that grows for every case is how a short one stops
        being short. Click the picture and the row appears.
      */}
      {imageSelected && (
        <div className="flex flex-wrap items-center gap-1.5 border border-line-strong border-b-0 rounded-t-[10px] bg-brand-tint px-3 py-2">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-brand-deep mr-1">
            Picture
          </span>
          {SIZES.map((o) => (
            <Btn
              key={o.value}
              disabled={disabled}
              wide
              label={o.label}
              on={imageAttrs.size === o.value}
              onClick={() =>
                editor.chain().focus().updateAttributes("image", { size: o.value }).run()
              }
            />
          ))}
          <span className="w-px h-5 bg-line mx-0.5" />
          {ALIGNS.map((o) => (
            <Btn
              key={o.value}
              disabled={disabled}
              wide
              label={o.label}
              on={imageAttrs.align === o.value}
              onClick={() =>
                editor.chain().focus().updateAttributes("image", { align: o.value }).run()
              }
            />
          ))}
          <span className="ml-auto text-[11.5px] text-muted">
            Full width on a phone whatever you pick.
          </span>
        </div>
      )}

      <div className={`flex flex-wrap items-center gap-1.5 border border-line-strong border-b-0 bg-surface px-3 py-2 ${
        imageSelected ? "" : "rounded-t-[10px]"
      }`}>
        <Btn
          disabled={disabled}
          label="H2"
          on={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <Btn
          disabled={disabled}
          label="H3"
          on={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        />
        <span className="w-px h-5 bg-line mx-0.5" />
        <Btn
          disabled={disabled}
          label="B"
          on={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <Btn
          disabled={disabled}
          label="i"
          on={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <Btn
          disabled={disabled}
          wide
          label="Link"
          on={editor.isActive("link")}
          onClick={setLink}
        />
        <span className="w-px h-5 bg-line mx-0.5" />
        <Btn
          disabled={disabled}
          wide
          label="List"
          on={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <Btn
          disabled={disabled}
          wide
          label="1. List"
          on={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <Btn
          disabled={disabled}
          wide
          label="Quote"
          on={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <span className="w-px h-5 bg-line mx-0.5" />
        <Btn
          disabled={disabled}
          wide
          label="Picture"
          onClick={() => setPicking(true)}
        />

        <span className="ml-auto flex items-center gap-1.5">
          <Btn
            disabled={disabled}
            label="Undo"
            wide
            onClick={() => editor.chain().focus().undo().run()}
          />
          <Btn
            disabled={disabled}
            label="Redo"
            wide
            onClick={() => editor.chain().focus().redo().run()}
          />
        </span>
      </div>

      <div className="border border-line-strong rounded-b-[10px] bg-white">
        <EditorContent editor={editor} />
      </div>

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        heading="Add a picture to this piece"
        onPick={({ id, alt }) => {
          setError("");
          editor
            .chain()
            .focus()
            .setImage({ src: `/api/media/${id}`, alt })
            .run();
        }}
      />

      {error && (
        <p className="text-[13px] text-danger mt-2">{error}</p>
      )}
    </div>
  );
}
