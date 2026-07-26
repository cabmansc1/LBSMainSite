"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminBusiness } from "@/lib/admin-data";

const PLANS = ["basic", "featured", "elite"];

function Row({ b, onEdit }: { b: AdminBusiness; onEdit: (b: AdminBusiness) => void }) {
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState(b);

  async function toggle(field: "isFeatured" | "isVerified" | "isHidden") {
    setBusy(true);
    const next = { ...local, [field]: !local[field] };
    setLocal(next);
    try {
      await fetch("/api/admin/business", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: b.id, [field]: next[field] }),
      });
    } finally {
      setBusy(false);
    }
  }

  const Toggle = ({
    field,
    label,
  }: {
    field: "isFeatured" | "isVerified" | "isHidden";
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => toggle(field)}
      disabled={busy}
      className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border transition-colors disabled:opacity-50 ${
        local[field]
          ? field === "isHidden"
            ? "bg-[#fde8e8] border-[#f5c2c2] text-[#a33]"
            : "bg-cta-tint border-[#f3ddbb] text-[#a05e00]"
          : "bg-surface border-line text-muted hover:border-faint"
      }`}
    >
      {label}
    </button>
  );

  return (
    <tr className="hover:bg-surface align-top">
      <td className="px-4 py-3 border-b border-line">
        <b className="font-semibold">{local.name}</b>
        <div className="text-[12px] text-muted mt-0.5">
          <Link href={`/business/${local.slug}`} className="text-brand-deep hover:underline">
            /{local.slug}
          </Link>
        </div>
      </td>
      <td className="px-4 py-3 border-b border-line text-[12.5px] text-muted">
        {local.category ?? "-"}
        <div>{local.locationArea ?? local.city ?? ""}</div>
      </td>
      <td className="px-4 py-3 border-b border-line text-[12.5px]">
        {local.phone ?? "-"}
        <div className="text-muted">{local.email ?? ""}</div>
      </td>
      <td className="px-4 py-3 border-b border-line text-[12.5px] capitalize">
        {local.planType ?? "basic"}
      </td>
      <td className="px-4 py-3 border-b border-line">
        <div className="flex gap-1.5 flex-wrap">
          <Toggle field="isFeatured" label="Featured" />
          <Toggle field="isVerified" label="Verified" />
          <Toggle field="isHidden" label="Hidden" />
        </div>
      </td>
      <td className="px-4 py-3 border-b border-line">
        <button
          type="button"
          onClick={() => onEdit(local)}
          className="text-[13px] font-semibold text-brand-deep hover:underline"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}

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

export function AdminDirectory({ businesses }: { businesses: AdminBusiness[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminBusiness | null>(null);

  const visible = query.trim()
    ? businesses.filter((b) =>
        [b.name, b.slug, b.category, b.locationArea, b.email]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : businesses;

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search listings"
          className="w-full max-w-[360px] text-sm px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
        />
        <span className="text-[13px] text-muted num">{visible.length} listings</span>
      </div>

      <div className="overflow-x-auto border border-line rounded-(--radius-card) bg-white">
        <table className="w-full border-collapse text-[13.5px] min-w-[860px]">
          <thead>
            <tr>
              {["Business", "Category / area", "Contact", "Plan", "Flags", ""].map((h) => (
                <th
                  key={h}
                  className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-4 py-3 border-b border-line bg-surface"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((b) => (
              <Row key={b.id} b={b} onEdit={setEditing} />
            ))}
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
