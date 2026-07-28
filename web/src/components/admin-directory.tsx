"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AdminBusiness } from "@/lib/admin-data";

const PLANS = ["basic", "featured", "elite"];

function EditPanel({
  business,
  onClose,
}: {
  business: AdminBusiness;
  onClose: () => void;
}) {
  const [form, setForm] = useState(business);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [logo, setLogo] = useState<string | null>(business.logoUrl);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState("");

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    setLogoError("");
    try {
      const body = new FormData();
      body.append("businessId", String(business.id));
      body.append("file", file);
      // No content-type header: the browser has to set the multipart
      // boundary itself, and setting it by hand breaks the parse.
      const res = await fetch("/api/admin/business-image", { method: "POST", body });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That upload failed.");
      setLogo(j.url);
    } catch (e) {
      setLogoError(String(e instanceof Error ? e.message : e));
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    setLogoError("");
    try {
      const res = await fetch(
        `/api/admin/business-image?businessId=${business.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Could not remove that image.");
      setLogo(null);
    } catch (e) {
      setLogoError(String(e instanceof Error ? e.message : e));
    } finally {
      setLogoBusy(false);
    }
  }

  const field = (k: keyof AdminBusiness) => ({
    value: (form[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value }),
    className:
      "w-full text-sm px-3 py-2 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950",
  });

  async function save() {
    setState("saving");
    try {
      const res = await fetch("/api/admin/business", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: business.id,
          name: form.name,
          category: form.category,
          locationArea: form.locationArea,
          city: form.city,
          phone: form.phone,
          email: form.email,
          website: form.website,
          description: form.description,
          planType: form.planType,
        }),
      });
      setState(res.ok ? "saved" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="fixed inset-0 bg-navy-950/50 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl border border-line w-full max-w-[620px] my-8">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-line">
          <h2 className="text-[16.5px] font-semibold tracking-tight">
            Edit {business.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-navy-950 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-6 grid gap-3.5">
          <div className="grid gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Logo
            </span>
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="w-16 h-16 rounded-[10px] border border-line bg-surface overflow-hidden grid place-items-center shrink-0">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[11px] text-faint">None</span>
                )}
              </span>
              <div className="grid gap-1.5">
                <input
                  type="file"
                  accept="image/*"
                  disabled={logoBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadLogo(f);
                    e.target.value = "";
                  }}
                  className="text-[13px] file:mr-3 file:px-3 file:py-1.5 file:rounded-[8px] file:border file:border-line-strong file:bg-white file:text-[12.5px] file:font-semibold file:cursor-pointer"
                />
                <span className="text-[12px] text-muted">
                  {logoBusy
                    ? "Uploading..."
                    : "Resized to 600px and converted to WebP automatically."}
                </span>
              </div>
              {logo && (
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={removeLogo}
                  className="text-[12.5px] font-semibold text-danger hover:underline disabled:opacity-40"
                >
                  Remove
                </button>
              )}
            </div>
            {logoError && <p className="text-[12.5px] text-danger">{logoError}</p>}
          </div>

          <label className="grid gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Business name
            </span>
            <input {...field("name")} />
          </label>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Category slug
              </span>
              <input {...field("category")} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Location slug
              </span>
              <input {...field("locationArea")} />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Phone
              </span>
              <input {...field("phone")} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Email
              </span>
              <input {...field("email")} />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Website
            </span>
            <input {...field("website")} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Plan
            </span>
            <select {...field("planType")}>
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Description
            </span>
            <textarea rows={5} {...field("description")} />
          </label>
        </div>
        <div className="flex items-center gap-3 px-6 py-4 border-t border-line">
          <button
            type="button"
            onClick={save}
            disabled={state === "saving"}
            className="bg-cta text-navy-950 text-[14px] font-bold px-5 py-2.5 rounded-(--radius-btn) hover:bg-[#FFA033] disabled:opacity-60"
          >
            {state === "saving" ? "Saving..." : "Save changes"}
          </button>
          {state === "saved" && (
            <span className="text-[13px] font-semibold text-ok">Saved</span>
          )}
          {state === "error" && (
            <span className="text-[13px] font-semibold text-[#a33]">
              Save failed
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-semibold text-muted hover:text-navy-950 ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/** Add a listing for a business that never used the signup form. */
function AddListing({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  async function create() {
    if (!name.trim()) return;
    setState("saving");
    setMessage("");
    try {
      const res = await fetch("/api/admin/business", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          locationArea,
          phone,
          website,
          email,
          description,
          planType: "basic",
          isVerified: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not create the listing");
      setMessage(`Created. It is live at /business/${data.slug}`);
      setName("");
      setCategory("");
      setLocationArea("");
      setPhone("");
      setWebsite("");
      setEmail("");
      setDescription("");
      setState("idle");
      onDone();
    } catch (e) {
      setState("error");
      setMessage(String(e instanceof Error ? e.message : e));
    }
  }

  const field =
    "w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";

  if (!open) {
    return (
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-navy-950 text-white text-[13.5px] font-semibold px-4 py-2.5 rounded-[10px] hover:bg-navy-800"
        >
          Add a listing
        </button>
        {message && (
          <span className="text-[13px] font-semibold text-ok">{message}</span>
        )}
      </div>
    );
  }

  return (
    <div className="mb-5 border border-line rounded-(--radius-card) bg-white p-5 grid gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <b className="text-[15px]">Add a listing</b>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[13px] font-semibold text-muted hover:text-body"
        >
          Cancel
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            Business name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
            placeholder="Alexander Heating & Cooling"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            Category
          </span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={field}
            placeholder="HVAC"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            Area
          </span>
          <input
            value={locationArea}
            onChange={(e) => setLocationArea(e.target.value)}
            className={field}
            placeholder="Mount Pleasant"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            Phone
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={field}
            placeholder="843-555-0100"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            Website
          </span>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className={field}
            placeholder="https://example.com"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            Email
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            placeholder="owner@example.com"
          />
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
          Description
        </span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={field}
          placeholder="What they do, in a sentence or two. This is the listing's About text."
        />
      </label>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={create}
          disabled={!name.trim() || state === "saving"}
          className="bg-cta text-navy-950 text-[14px] font-bold px-5 py-2.5 rounded-(--radius-btn) hover:bg-[#FFA033] disabled:opacity-50"
        >
          {state === "saving" ? "Creating..." : "Create listing"}
        </button>
        {message && (
          <span
            className={`text-[13px] font-semibold ${
              state === "error" ? "text-danger" : "text-ok"
            }`}
          >
            {message}
          </span>
        )}
      </div>
      <p className="text-[12px] text-muted">
        Creates a free Basic listing, marked verified. Everything else is
        editable afterwards from the row.
      </p>
    </div>
  );
}

const statusOf = (b: AdminBusiness) =>
  !b.isVerified ? "pending" : b.isHidden ? "hidden" : b.isActive ? "active" : "inactive";

const STATUS_STYLE: Record<string, string> = {
  pending: "text-[#a05e00] bg-[#fff4e5] border-[#ffd9a3]",
  active: "text-ok bg-[#e5f5ec] border-[#bfe8d2]",
  hidden: "text-muted bg-surface border-line",
  inactive: "text-muted bg-surface border-line",
};

async function act(action: string, ids: number[]) {
  const res = await fetch("/api/admin/business", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ids }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
}

/**
 * The actions that are not Edit.
 *
 * Six buttons in a table cell wrapped into a vertical stack, which made
 * every row about four lines tall and pushed the column off the right
 * edge of the screen. Only one of them is used often, so Edit stays out
 * and the rest live behind a menu.
 *
 * Delete sits at the bottom, separated and in red, because the distance
 * between "Feature" and "Delete this business forever" should not be
 * two pixels.
 */
function RowMenu({
  business,
  busy,
  onAction,
}: {
  business: AdminBusiness;
  busy: boolean;
  onAction: (id: number, action: string, confirmText?: string) => void;
}) {
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const open = at !== null;

  // Rendered into the body rather than in place. The table scrolls
  // horizontally, and overflow-x:auto forces overflow-y to auto too, so
  // a menu positioned inside the cell gets clipped by the wrapper: the
  // first two items show and the rest are simply gone.
  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    setAt({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !menu.current?.contains(t)) setAt(null);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setAt(null);
    // Fixed coordinates go stale the moment anything scrolls, and a menu
    // floating away from its button is worse than one that closed.
    const bail = () => setAt(null);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", bail, true);
    window.addEventListener("resize", bail);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", bail, true);
      window.removeEventListener("resize", bail);
    };
  }, [open]);

  const run = (action: string, confirmText?: string) => {
    setAt(null);
    onAction(business.id, action, confirmText);
  };

  const item =
    "w-full text-left px-4 py-2.5 text-[13px] hover:bg-surface border-b border-line last:border-b-0";

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`More actions for ${business.name}`}
        aria-expanded={open}
        disabled={busy}
        onClick={() => (open ? setAt(null) : place())}
        className="text-[13px] font-bold px-2.5 py-1.5 rounded-[8px] border border-line-strong leading-none disabled:opacity-40"
      >
        ···
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menu}
            style={{ position: "fixed", top: at.top, right: at.right }}
            className="z-50 w-[190px] bg-white border border-line rounded-[10px] shadow-[0_12px_30px_rgba(8,21,39,.2)] overflow-hidden"
          >
            <button type="button" className={item} onClick={() => run("toggle_active")}>
              {business.isActive ? "Deactivate" : "Activate"}
            </button>
            <button type="button" className={item} onClick={() => run("toggle_hidden")}>
              {business.isHidden ? "Unhide" : "Hide"}
            </button>
            <button type="button" className={item} onClick={() => run("toggle_featured")}>
              {business.isFeatured ? "Unfeature" : "Feature"}
            </button>
            <a
              href={`/business/${business.slug}`}
              target="_blank"
              rel="noopener"
              className={`${item} block`}
              onClick={() => setAt(null)}
            >
              View on the site
            </a>
            {/* Last, separated, red. The distance between "Feature" and
                "delete this business forever" should not be two pixels. */}
            <button
              type="button"
              className={`${item} text-danger font-semibold border-t border-line`}
              onClick={() =>
                run("delete", `Delete ${business.name}? This cannot be undone.`)
              }
            >
              Delete
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

export function AdminDirectory({ businesses }: { businesses: AdminBusiness[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [bulk, setBulk] = useState("");
  const [busyRow, setBusyRow] = useState<number | null>(null);
  const [editing, setEditing] = useState<AdminBusiness | null>(null);

  const counts = {
    total: businesses.length,
    pending: businesses.filter((b) => statusOf(b) === "pending").length,
    active: businesses.filter((b) => statusOf(b) === "active").length,
    hidden: businesses.filter((b) => b.isHidden).length,
  };
  const totalViews = businesses.reduce((n, b) => n + b.views, 0);
  const totalInquiries = businesses.reduce((n, b) => n + b.inquiries, 0);
  const topViewed = [...businesses].sort((a, b) => b.views - a.views).slice(0, 10);

  const categories = [...new Set(businesses.map((b) => b.category).filter(Boolean))].sort() as string[];
  const locations = [...new Set(businesses.map((b) => b.locationArea).filter(Boolean))].sort() as string[];

  const [sort, setSort] = useState<"name" | "newest">("name");

  const visible = businesses.filter((b) => {
    if (query.trim()) {
      const hay = [b.name, b.slug, b.category, b.locationArea, b.email]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(query.trim().toLowerCase())) return false;
    }
    if (category && b.category !== category) return false;
    if (location && b.locationArea !== location) return false;
    if (status && statusOf(b) !== status) return false;
    return true;
  });

  if (sort === "newest") {
    visible.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }

  async function runRow(id: number, action: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyRow(id);
    try {
      await act(action, [id]);
      window.location.reload();
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
      setBusyRow(null);
    }
  }

  async function runBulk() {
    if (!bulk || selected.length === 0) return;
    if (
      (bulk === "delete" || bulk === "deny") &&
      !window.confirm(`Remove ${selected.length} listing(s)? This cannot be undone.`)
    ) {
      return;
    }
    try {
      await act(bulk, selected);
      window.location.reload();
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    }
  }

  const allShown = visible.length > 0 && visible.every((b) => selected.includes(b.id));

  return (
    <>
      <AddListing onDone={() => window.location.reload()} />

      <div className="border border-line rounded-(--radius-card) bg-white px-5 py-4 mb-4 flex gap-8 flex-wrap">
        {[
          { n: counts.total, label: "Total businesses", filter: "" },
          { n: counts.pending, label: "Pending review", filter: "pending", warn: true },
          { n: counts.active, label: "Active", filter: "active" },
          { n: counts.hidden, label: "Hidden", filter: "hidden" },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStatus(s.filter)}
            className="text-left"
          >
            <b
              className={`block text-[21px] font-bold tracking-tight num ${
                s.warn && s.n > 0 ? "text-[#a05e00]" : "text-brand-deep"
              }`}
            >
              {s.n}
            </b>
            <span className="text-[12px] text-muted">{s.label}</span>
          </button>
        ))}
        <div className="ml-auto text-right">
          <b className="block text-[21px] font-bold tracking-tight num">
            {totalViews.toLocaleString("en-US")}
          </b>
          <span className="text-[12px] text-muted num">
            total views · {totalInquiries} inquiries
          </span>
        </div>
      </div>

      <details className="border border-line rounded-(--radius-card) bg-white mb-4">
        <summary className="cursor-pointer list-none px-5 py-3.5 text-[14px] font-semibold">
          Directory analytics
        </summary>
        <div className="px-5 pb-5">
          <b className="text-[12px] uppercase tracking-wider text-muted block mb-2">
            Top by views
          </b>
          <ol className="grid gap-1.5">
            {topViewed.map((b, i) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 text-[13.5px] border-b border-line pb-1.5 last:border-b-0"
              >
                <span className="truncate">
                  <span className="text-muted num mr-2">{i + 1}</span>
                  {b.name}
                </span>
                <span className="num text-muted whitespace-nowrap">
                  {b.views.toLocaleString("en-US")} views · {b.inquiries} inq
                </span>
              </li>
            ))}
          </ol>
        </div>
      </details>

      <div className="flex items-center gap-2.5 flex-wrap mb-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search business name..."
          className="w-full max-w-[300px] text-sm px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Category"
          className="text-sm px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          aria-label="Location"
          className="text-sm px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white"
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "name" | "newest")}
          aria-label="Sort"
          className="text-sm px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white"
        >
          <option value="name">A to Z</option>
          <option value="newest">Newest first</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Status"
          className="text-sm px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
          <option value="inactive">Inactive</option>
        </select>
        {(query || category || location || status) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("");
              setLocation("");
              setStatus("");
            }}
            className="text-[13px] font-semibold text-brand-deep hover:underline"
          >
            Clear
          </button>
        )}
        <span className="text-[13px] text-muted num ml-auto">
          {visible.length} of {businesses.length}
        </span>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap mb-3 bg-surface border border-line rounded-[10px] px-4 py-3">
        <span className="text-[13px] font-semibold">Bulk actions</span>
        <select
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          aria-label="Bulk action"
          className="text-sm px-3 py-2 border border-line-strong rounded-[10px] bg-white"
        >
          <option value="">Select an action</option>
          <option value="approve">Approve</option>
          <option value="toggle_active">Toggle active</option>
          <option value="toggle_hidden">Toggle hidden</option>
          <option value="toggle_featured">Toggle featured</option>
          <option value="delete">Delete</option>
        </select>
        <button
          type="button"
          onClick={runBulk}
          disabled={!bulk || selected.length === 0}
          className="bg-navy-950 text-white text-[13px] font-semibold px-4 py-2 rounded-[10px] hover:bg-navy-800 disabled:opacity-40"
        >
          Apply
        </button>
        <span className="text-[13px] text-muted num">{selected.length} selected</span>
      </div>

      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[880px]">
          <thead>
            <tr>
              <th className="px-4 py-3 border-b border-line bg-surface w-8">
                <input
                  type="checkbox"
                  checked={allShown}
                  aria-label="Select all shown"
                  onChange={(e) =>
                    setSelected(e.target.checked ? visible.map((b) => b.id) : [])
                  }
                />
              </th>
              {["Business", "Category / area", "Status", "Views", "Plan", "Added", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className={`text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface ${
                      h === "Actions"
                        ? // Pinned, so the actions are reachable without
                          // hunting for a horizontal scrollbar that gives
                          // no sign it exists.
                          "text-right sticky right-0 z-20 border-l border-line"
                        : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((b) => {
              const st = statusOf(b);
              return (
                <tr key={b.id} className="group hover:bg-surface align-top">
                  <td className="px-4 py-3.5 border-b border-line">
                    <input
                      type="checkbox"
                      checked={selected.includes(b.id)}
                      aria-label={`Select ${b.name}`}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, b.id]
                            : prev.filter((x) => x !== b.id),
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3.5 border-b border-line">
                    <div className="flex items-start gap-2.5">
                      <span className="w-9 h-9 rounded-[6px] border border-line bg-surface overflow-hidden shrink-0 grid place-items-center">
                        {b.logoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={b.logoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                            // Older uploads predate the resizer, so fall
                            // back to the original rather than showing a
                            // broken tile.
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (img.dataset.fallback) return;
                              img.dataset.fallback = "1";
                              img.src = img.src.replace("/medium/", "/");
                            }}
                          />
                        ) : (
                          <span className="text-[11px] font-bold text-faint">
                            {b.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <b className="block font-semibold">{b.name}</b>
                        <a
                          href={`/business/${b.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] text-muted hover:text-brand-deep truncate block"
                        >
                          /business/{b.slug}
                        </a>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 border-b border-line">
                    {/* nowrap: "home-services" was breaking at the hyphen
                        and turning one word into two lines. */}
                    <span className="block whitespace-nowrap capitalize">
                      {b.category ?? "-"}
                    </span>
                    <span className="text-[12px] text-muted whitespace-nowrap capitalize">
                      {b.locationArea ?? b.city ?? "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 border-b border-line">
                    <span
                      className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[st]}`}
                    >
                      {st}
                    </span>
                    {b.isFeatured && (
                      <span className="block text-[11px] font-semibold text-brand-deep mt-1">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line num text-muted">
                    {b.views.toLocaleString("en-US")}
                    <span className="block text-[12px]">{b.inquiries} inq</span>
                  </td>
                  <td className="px-4 py-3.5 border-b border-line capitalize">
                    {b.planType ?? "basic"}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line text-muted whitespace-nowrap num">
                    {b.createdAt
                      ? new Date(b.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-3.5 border-b border-line sticky right-0 z-10 bg-white group-hover:bg-surface border-l border-line">
                    <div className="flex gap-1.5 items-center justify-end">
                      {/* Approve and Deny stay in the open: they are the
                          only actions with a queue behind them, and
                          burying them costs a business their listing. */}
                      {st === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={busyRow === b.id}
                            onClick={() => runRow(b.id, "approve")}
                            className="text-[12px] font-semibold px-2.5 py-1.5 rounded-[8px] bg-ok text-white disabled:opacity-40"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyRow === b.id}
                            onClick={() =>
                              runRow(b.id, "deny", `Deny and remove ${b.name}?`)
                            }
                            className="text-[12px] font-semibold px-2.5 py-1.5 rounded-[8px] border border-line-strong disabled:opacity-40"
                          >
                            Deny
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing(b)}
                        className="text-[12px] font-semibold px-2.5 py-1.5 rounded-[8px] border border-line-strong"
                      >
                        Edit
                      </button>
                      <RowMenu
                        business={b}
                        busy={busyRow === b.id}
                        onAction={runRow}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="text-sm text-muted px-4 py-8 text-center">
            No listings match that search.
          </p>
        )}
      </div>

      {editing && (
        <EditPanel business={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
