"use client";

import { useState } from "react";
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
        <table className="w-full border-collapse text-[13.5px] min-w-[1040px]">
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
                    className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface"
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
                <tr key={b.id} className="hover:bg-surface align-top">
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
                    <span className="block">{b.category ?? "-"}</span>
                    <span className="text-[12px] text-muted">
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
                  <td className="px-4 py-3.5 border-b border-line">
                    <div className="flex gap-1.5 flex-wrap">
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
                      <button
                        type="button"
                        disabled={busyRow === b.id}
                        onClick={() => runRow(b.id, "toggle_active")}
                        className="text-[12px] font-semibold px-2.5 py-1.5 rounded-[8px] border border-line-strong disabled:opacity-40"
                      >
                        {b.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        disabled={busyRow === b.id}
                        onClick={() => runRow(b.id, "toggle_hidden")}
                        className="text-[12px] font-semibold px-2.5 py-1.5 rounded-[8px] border border-line-strong disabled:opacity-40"
                      >
                        {b.isHidden ? "Unhide" : "Hide"}
                      </button>
                      <button
                        type="button"
                        disabled={busyRow === b.id}
                        onClick={() => runRow(b.id, "toggle_featured")}
                        className="text-[12px] font-semibold px-2.5 py-1.5 rounded-[8px] border border-line-strong disabled:opacity-40"
                      >
                        {b.isFeatured ? "Unfeature" : "Feature"}
                      </button>
                      <button
                        type="button"
                        disabled={busyRow === b.id}
                        onClick={() =>
                          runRow(b.id, "delete", `Delete ${b.name}? This cannot be undone.`)
                        }
                        className="text-[12px] font-semibold px-2.5 py-1.5 rounded-[8px] border border-line-strong text-danger disabled:opacity-40"
                      >
                        Delete
                      </button>
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
