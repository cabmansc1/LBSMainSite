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

  const input =
    "w-full text-sm px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";

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
      if (res.ok) {
        setForm(payload);
        setState("saved");
        setMessage(
          payload.status === "published" ? "Published and live" : "Saved as draft",
        );
        router.refresh();
      } else {
        setState("error");
        setMessage(j.error ?? "Save failed");
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
          <label className="grid gap-1.5">
            <span className="text-[12.5px] font-medium">Featured image</span>
            <input
              className={input}
              placeholder="filename.jpg"
              value={form.featuredImage}
              onChange={(e) =>
                setForm({ ...form, featuredImage: e.target.value })
              }
            />
            <span className="text-[12px] text-muted">
              Filename inside /uploads/blog/
            </span>
          </label>
        </div>
      </aside>
    </div>
  );
}
