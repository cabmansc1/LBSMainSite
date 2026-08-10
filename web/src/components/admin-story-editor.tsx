"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RichEditor } from "@/components/rich-editor";
import {
  STORY_KINDS,
  slugifyStory,
  readMinutes,
  type Story,
  type StoryBusiness,
  type StoryKind,
  type StoryStatus,
} from "@/lib/stories-types";

type PickList = { value: string; label: string }[];

/**
 * Writing and filing one story.
 *
 * Two halves. The left is the writing: headline, standfirst, body. The
 * right is the filing: what kind it is, where it belongs, who it is
 * about, and whether it is paid.
 *
 * The filing is not an afterthought. Joining a story to a place and a
 * business is what makes it appear on the market page, on that
 * business's listing and in the newsletter without anybody linking it
 * four times, so the form treats those as part of writing rather than
 * as metadata to fill in later.
 */
export function AdminStoryEditor({
  story,
  places,
  businesses,
}: {
  story: Story | null;
  places: PickList;
  businesses: PickList;
}) {
  const router = useRouter();
  const heroRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: story?.title ?? "",
    kind: (story?.kind ?? "spotlight") as StoryKind,
    dek: story?.dek ?? "",
    bodyHtml: story?.bodyHtml ?? "",
    heroMediaId: story?.heroMediaId ?? null,
    status: (story?.status ?? "draft") as StoryStatus,
    publishedAt: story?.publishedAt ? story.publishedAt.slice(0, 16) : "",
    featuredRank: story?.featuredRank,
    sponsored: story?.sponsored ?? false,
    sponsorBusinessId: story?.sponsorBusinessId ?? null,
    metaTitle: story?.metaTitle ?? "",
    metaDescription: story?.metaDescription ?? "",
  });
  const [placeSlugs, setPlaceSlugs] = useState<string[]>(story?.places ?? []);
  const [biz, setBiz] = useState<StoryBusiness[]>(story?.businesses ?? []);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const field =
    "w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";
  const label = "text-[11px] uppercase tracking-wider text-muted font-semibold";

  const slugPreview = story?.status && story.status !== "draft"
    ? story.slug
    : slugifyStory(form.title);

  async function send(extra: Record<string, unknown>, tag: string) {
    setBusy(tag);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/admin/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: story?.id,
          slug: story?.slug,
          ...form,
          featuredRank: form.featuredRank ?? "",
          places: placeSlugs,
          businesses: biz,
          ...extra,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      if (extra.action === "delete") {
        router.push("/admin/stories");
        return;
      }
      setNote("Saved.");
      // A brand new story has no id in the URL, so the editor has to
      // move to its own page or the next save would create a second one.
      if (!story && j.id) router.replace(`/admin/stories/${j.id}`);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy("");
    }
  }

  async function uploadHero(file: File) {
    setBusy("hero");
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not upload.");
      setForm((f) => ({ ...f, heroMediaId: Number(j.id) }));
      setNote("Picture added. Give it alt text under Pictures.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not upload.");
    } finally {
      setBusy("");
      if (heroRef.current) heroRef.current.value = "";
    }
  }

  const togglePlace = (slug: string) =>
    setPlaceSlugs((cur) =>
      cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug],
    );

  const addBusiness = (id: number) => {
    if (!id || biz.some((b) => b.businessId === id)) return;
    setBiz((cur) => [...cur, { businessId: id, role: "subject" }]);
  };

  const nameOf = (id: number) =>
    businesses.find((b) => Number(b.value) === id)?.label ?? `#${id}`;

  return (
    <div className="grid gap-5">
      {error && (
        <p className="text-[13px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}
      {note && (
        <p className="text-[13px] text-brand-deep bg-brand-tint border border-line rounded-lg px-4 py-2.5">
          {note}
        </p>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        {/* -------- writing -------- */}
        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className={label}>Headline</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Meet the family behind Cane Bay Roofing"
              className={`${field} text-[16px] font-semibold`}
            />
            {slugPreview && (
              <span className="text-[12px] text-muted num">
                /stories/{slugPreview}
                {story && story.status !== "draft" && " (fixed, it is published)"}
              </span>
            )}
          </label>

          <label className="grid gap-1.5">
            <span className={label}>Standfirst</span>
            <textarea
              value={form.dek}
              rows={2}
              onChange={(e) => setForm({ ...form, dek: e.target.value })}
              placeholder="One or two sentences under the headline."
              className={field}
            />
          </label>

          <div className="grid gap-1.5">
            <span className={label}>Story</span>
            <RichEditor
              value={form.bodyHtml}
              onChange={(html) => setForm((f) => ({ ...f, bodyHtml: html }))}
            />
            <span className="text-[12px] text-muted num">
              About {readMinutes(form.bodyHtml)} min to read
            </span>
          </div>
        </div>

        {/* -------- filing -------- */}
        <div className="grid gap-4 lg:sticky lg:top-6">
          <div className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-3">
            <b className="text-[14.5px]">What it is</b>
            <label className="grid gap-1.5">
              <span className={label}>Kind</span>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm({ ...form, kind: e.target.value as StoryKind })
                }
                className={field}
              >
                {STORY_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
              <span className="text-[12px] text-muted">
                {STORY_KINDS.find((k) => k.value === form.kind)?.hint}
              </span>
            </label>

            <label className="grid gap-1.5">
              <span className={label}>Lead picture</span>
              <input
                ref={heroRef}
                type="file"
                accept="image/*"
                aria-label="Lead picture"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadHero(f);
                }}
                className="text-[12.5px]"
              />
              {form.heroMediaId && (
                <span className="grid gap-1.5">
                  <span className="relative block w-full aspect-[16/9] bg-surface rounded-[8px] overflow-hidden border border-line">
                    <Image
                      src={`/api/media/${form.heroMediaId}`}
                      alt="Lead picture for this story"
                      fill
                      sizes="320px"
                      className="object-cover"
                    />
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, heroMediaId: null })}
                    className="justify-self-start text-[12.5px] text-muted"
                  >
                    Remove picture
                  </button>
                </span>
              )}
            </label>
          </div>

          <div className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-3">
            <div>
              <b className="text-[14.5px]">Where it belongs</b>
              <p className="text-[12px] text-muted mt-0.5">
                Puts it on those pages automatically.
              </p>
            </div>
            <div className="grid gap-1 max-h-[220px] overflow-y-auto pr-1">
              {places.map((p) => (
                <label
                  key={p.value}
                  className="flex items-center gap-2 text-[13px]"
                >
                  <input
                    type="checkbox"
                    checked={placeSlugs.includes(p.value)}
                    onChange={() => togglePlace(p.value)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-3">
            <div>
              <b className="text-[14.5px]">Who it is about</b>
              <p className="text-[12px] text-muted mt-0.5">
                Shows on their listing and their category page.
              </p>
            </div>
            <select
              value=""
              onChange={(e) => addBusiness(Number(e.target.value))}
              className={field}
            >
              <option value="">Add a business</option>
              {businesses
                .filter((b) => !biz.some((x) => x.businessId === Number(b.value)))
                .map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
            </select>
            {biz.length > 0 && (
              <div className="grid gap-1.5">
                {biz.map((b) => (
                  <span
                    key={b.businessId}
                    className="flex items-center gap-2 text-[13px] border border-line rounded-[8px] px-2.5 py-1.5"
                  >
                    <span className="truncate">{nameOf(b.businessId)}</span>
                    <select
                      value={b.role}
                      onChange={(e) =>
                        setBiz((cur) =>
                          cur.map((x) =>
                            x.businessId === b.businessId
                              ? {
                                  ...x,
                                  role:
                                    e.target.value === "mentioned"
                                      ? "mentioned"
                                      : "subject",
                                }
                              : x,
                          ),
                        )
                      }
                      className="ml-auto text-[12px] border border-line-strong rounded-[7px] px-1.5 py-1 bg-white"
                    >
                      <option value="subject">The subject</option>
                      <option value="mentioned">Mentioned</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setBiz((cur) =>
                          cur.filter((x) => x.businessId !== b.businessId),
                        )
                      }
                      aria-label={`Remove ${nameOf(b.businessId)}`}
                      className="text-muted"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-3">
            <b className="text-[14.5px]">Paid or not</b>
            <label className="flex items-start gap-2.5 text-[13px]">
              <input
                type="checkbox"
                checked={form.sponsored}
                onChange={(e) =>
                  setForm({ ...form, sponsored: e.target.checked })
                }
                className="mt-1"
              />
              <span>
                Somebody paid for this
                <span className="block text-[12px] text-muted">
                  Labeled Sponsored on the page. Saying so is what makes the
                  free coverage worth anything.
                </span>
              </span>
            </label>
          </div>

          <div className="border border-line rounded-(--radius-card) bg-white p-4 grid gap-3">
            <b className="text-[14.5px]">Publishing</b>
            <label className="grid gap-1.5">
              <span className={label}>Status</span>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as StoryStatus })
                }
                className={field}
              >
                <option value="draft">Draft, nobody can see it</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived, taken down</option>
              </select>
            </label>
            {(form.status === "scheduled" || form.status === "published") && (
              <label className="grid gap-1.5">
                <span className={label}>
                  {form.status === "scheduled" ? "Goes live" : "Published"}
                </span>
                <input
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(e) =>
                    setForm({ ...form, publishedAt: e.target.value })
                  }
                  className={field}
                />
                <span className="text-[12px] text-muted">
                  Leave empty to use now.
                </span>
              </label>
            )}
            <label className="grid gap-1.5">
              <span className={label}>Homepage position</span>
              <input
                type="number"
                min={0}
                value={form.featuredRank ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    featuredRank:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="Leave empty to keep it off"
                className={field}
              />
              <span className="text-[12px] text-muted">
                Lower comes first. 1 is the lead story.
              </span>
            </label>
          </div>

          <details className="border border-line rounded-(--radius-card) bg-white p-4">
            <summary className="text-[14.5px] font-semibold cursor-pointer">
              Search listing
            </summary>
            <div className="grid gap-3 mt-3">
              <label className="grid gap-1.5">
                <span className={label}>Title in Google</span>
                <input
                  value={form.metaTitle}
                  onChange={(e) =>
                    setForm({ ...form, metaTitle: e.target.value })
                  }
                  placeholder={form.title}
                  className={field}
                />
              </label>
              <label className="grid gap-1.5">
                <span className={label}>Description</span>
                <textarea
                  value={form.metaDescription}
                  rows={3}
                  onChange={(e) =>
                    setForm({ ...form, metaDescription: e.target.value })
                  }
                  placeholder={form.dek}
                  className={field}
                />
              </label>
              <span className="text-[12px] text-muted">
                Both fall back to the headline and standfirst.
              </span>
            </div>
          </details>
        </div>
      </div>

      <div className="flex gap-2.5 flex-wrap items-center border-t border-line pt-4">
        <button
          type="button"
          disabled={busy !== ""}
          onClick={() => send({ action: "save" }, "save")}
          className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-navy-950 text-white disabled:opacity-50"
        >
          {busy === "save" ? "Saving" : "Save"}
        </button>

        {story && form.status !== "published" && (
          <button
            type="button"
            disabled={busy !== ""}
            onClick={() =>
              send({ action: "save", status: "published" }, "publish")
            }
            className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-cta text-white disabled:opacity-50"
          >
            {busy === "publish" ? "Publishing" : "Publish now"}
          </button>
        )}

        {story && story.status !== "draft" && (
          <a
            href={`/stories/${story.slug}`}
            target="_blank"
            rel="noopener"
            className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-line-strong bg-white"
          >
            View it
          </a>
        )}

        {story && (
          <span className="ml-auto flex items-center gap-2.5">
            {confirmDelete ? (
              <>
                <span className="text-[13px] font-semibold">Delete it?</span>
                <button
                  type="button"
                  disabled={busy !== ""}
                  onClick={() => send({ action: "delete" }, "delete")}
                  className="text-[13px] font-semibold px-3.5 py-2.5 rounded-[9px] bg-danger text-white disabled:opacity-50"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[13px] px-3 py-2.5 rounded-[9px] text-muted"
                >
                  Keep it
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-danger text-danger bg-white"
              >
                Delete
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
