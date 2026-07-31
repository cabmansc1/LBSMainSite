"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminPost } from "@/lib/admin-data";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function AdminPostEditor({ post }: { post: AdminPost | null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    metaDescription: post?.metaDescription ?? "",
    featuredImage: post?.featuredImage ?? "",
    status: post?.status ?? "draft",
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  // The preview is a resolved URL, the form field is the stored value.
  // They are the same string for an uploaded image and different for a
  // legacy filename, which is why the preview cannot just read the form.
  const [preview, setPreview] = useState<string | null>(
    post?.featuredImageUrl ?? null,
  );
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState("");

  const input =
    "w-full text-sm px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";

  async function uploadImage(file: File) {
    setImageBusy(true);
    setImageError("");
    try {
      const body = new FormData();
      body.append("file", file);
      // No content-type header: the browser has to set the multipart
      // boundary itself, and setting it by hand breaks the parse.
      const res = await fetch("/api/admin/blog-image", { method: "POST", body });
      const j = await res.json().catch(() => ({}));
      // requireAdmin redirects rather than returning 401, and fetch
      // follows it, so a signed-out admin gets a 200 full of HTML.
      // ok: true is the only proof the upload actually happened.
      if (!res.ok || j.ok !== true) {
        throw new Error(j.error ?? "That upload failed. Sign in again and retry.");
      }
      setForm((f) => ({ ...f, featuredImage: j.url }));
      setPreview(j.url);
    } catch (e) {
      setImageError(String(e instanceof Error ? e.message : e));
    } finally {
      setImageBusy(false);
    }
  }

  // Nothing is deleted. The bytes are immutable and cached forever, and
  // the post is what points at them, so clearing the field here and
  // saving is the whole removal.
  function removeImage() {
    setImageError("");
    setForm((f) => ({ ...f, featuredImage: "" }));
    setPreview(null);
  }

  async function save(status?: string) {
    setState("saving");
    setMessage("");
    const payload = { ...form, status: status ?? form.status };
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "post", id: post?.id, post: payload }),
      });
      const j = await res.json().catch(() => ({}));
      // Same reason as the upload: a redirect to the login page arrives
      // as a 200, so res.ok alone would report a save that never ran.
      if (res.ok && j.ok === true) {
        setForm(payload);
        setState("saved");
        setMessage(
          payload.status === "published" ? "Published and live" : "Saved as draft",
        );
        router.refresh();
      } else {
        setState("error");
        setMessage(j.error ?? "Save failed. Sign in again and retry.");
      }
    } catch {
      setState("error");
      setMessage("Save failed");
    }
  }

  return (
    <div className="grid lg:grid-cols-[1.5fr_.75fr] gap-5 items-start">
      <div className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Title
          </span>
          <input
            className={input}
            value={form.title}
            onChange={(e) => {
              const title = e.target.value;
              setForm((f) => ({
                ...f,
                title,
                slug: f.slug || slugify(title),
              }));
            }}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Slug
          </span>
          <input
            className={input}
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
          />
          <span className="text-[12px] text-muted">/blog/{form.slug || "..."}</span>
        </label>

        <label className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Excerpt
          </span>
          <textarea
            rows={2}
            className={input}
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Content (HTML)
          </span>
          <textarea
            rows={20}
            className={`${input} font-mono text-[12.5px] leading-relaxed`}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <span className="text-[12px] text-muted">
            Same HTML the legacy editor saved, so existing posts keep rendering.
          </span>
        </label>
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-4">
        <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Publish
          </span>
          <p className="text-[13px] text-body">
            Status:{" "}
            <b className="capitalize">{form.status}</b>
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => save("draft")}
              disabled={state === "saving"}
              className="text-[13.5px] font-semibold px-4 py-2 rounded-(--radius-btn) bg-white border border-line-strong hover:border-faint disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => save("published")}
              disabled={state === "saving"}
              className="text-[13.5px] font-bold px-4 py-2 rounded-(--radius-btn) bg-cta text-navy-950 hover:bg-[#FFA033] disabled:opacity-60"
            >
              {state === "saving" ? "Saving..." : "Publish"}
            </button>
          </div>
          {message && (
            <p
              className={`text-[13px] font-semibold ${
                state === "error" ? "text-[#a33]" : "text-ok"
              }`}
            >
              {message}
            </p>
          )}
        </div>

        <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            SEO
          </span>
          <label className="grid gap-1.5">
            <span className="text-[12.5px] font-medium">Meta description</span>
            <textarea
              rows={3}
              className={input}
              value={form.metaDescription}
              onChange={(e) =>
                setForm({ ...form, metaDescription: e.target.value })
              }
            />
            <span className="text-[12px] text-muted num">
              {form.metaDescription.length}/160
            </span>
          </label>
          <div className="grid gap-2">
            <span className="text-[12.5px] font-medium">Featured image</span>
            {/* 16/9, because that is the crop the blog index card uses.
                Showing it any other shape would promise a framing the
                published page does not keep. */}
            <span className="w-full aspect-[16/9] rounded-[10px] border border-line bg-surface overflow-hidden grid place-items-center">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[11px] text-faint">No image</span>
              )}
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={imageBusy}
              aria-label="Featured image file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
                // Cleared so choosing the same file twice still fires.
                e.target.value = "";
              }}
              className="text-[13px] file:mr-3 file:px-3 file:py-1.5 file:rounded-[8px] file:border file:border-line-strong file:bg-white file:text-[12.5px] file:font-semibold file:cursor-pointer"
            />
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[12px] text-muted">
                {imageBusy
                  ? "Uploading..."
                  : preview
                    ? "Choose another file to replace it."
                    : "Resized to 1600px and converted to WebP automatically."}
              </span>
              {preview && !imageBusy && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="text-[12.5px] font-semibold text-danger hover:underline ml-auto"
                >
                  Remove
                </button>
              )}
            </div>
            {imageError && (
              <p className="text-[12.5px] text-danger">{imageError}</p>
            )}
            <span className="text-[12px] text-muted">
              Saved with the post. Publish or save the draft to apply it.
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
