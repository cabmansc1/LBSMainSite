"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountListing, PendingEdit } from "@/lib/listing-edits";
import type { DayHours } from "@/lib/business-hours";

/**
 * The advertiser's own edit form.
 *
 * Laid out as two sections because the listing genuinely behaves in two
 * ways, and hiding that would be worse than explaining it: most fields
 * are live the moment they save, while the three that decide where the
 * listing appears go to us first. Each section says which it is at the
 * top, so nobody has to save something to find out.
 */

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const field =
  "w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950";
const button =
  "text-[14px] font-semibold px-4 py-2.5 rounded-(--radius-btn) bg-navy-950 text-white hover:bg-navy-800 disabled:opacity-60";
const label = "text-[12.5px] font-semibold text-body block mb-1.5";

type Option = { name: string; slug: string };

type FormState = {
  name: string;
  category: string;
  locationArea: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  showHours: boolean;
};

function Field({
  id,
  title,
  hint,
  error,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {title}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-[#b42318] mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-muted mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

/** What we are still holding for this field, if anything. */
function PendingNote({ edit }: { edit?: PendingEdit }) {
  if (!edit) return null;
  return (
    <p className="text-[12px] text-[#8a5a00] bg-[#fff8e6] border border-[#f2dfae] rounded-md px-2.5 py-1.5 mt-1.5">
      Waiting on us: <b className="font-semibold">{edit.newValue || "(empty)"}</b>
      . Your page still shows the value above until we approve it.
    </p>
  );
}

export function ListingEditor({
  listing,
  categories,
  locations,
  hours,
  pending,
  readOnly = false,
}: {
  listing: AccountListing;
  categories: Option[];
  locations: Option[];
  hours: DayHours[];
  pending: PendingEdit[];
  /** This environment shares the live database and must not write to it. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormState>({
    name: listing.name,
    category: listing.category,
    locationArea: listing.locationArea,
    phone: listing.phone,
    email: listing.email,
    website: listing.website,
    description: listing.description,
    facebookUrl: listing.facebookUrl,
    instagramUrl: listing.instagramUrl,
    tiktokUrl: listing.tiktokUrl,
    youtubeUrl: listing.youtubeUrl,
    linkedinUrl: listing.linkedinUrl,
    showHours: listing.showHours,
  });
  const [week, setWeek] = useState<DayHours[]>(hours);

  const pendingFor = (name: string) => pending.find((p) => p.field === name);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setDay = (day: number, patch: Partial<DayHours>) =>
    setWeek((w) => w.map((d) => (d.day === day ? { ...d, ...patch } : d)));

  const claim = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/account/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", id: listing.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "We could not claim that.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "We could not claim that.");
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg("");
    setErr("");
    setFieldErrors({});
    try {
      const res = await fetch("/api/account/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: listing.id, fields: form, hours: week }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (j.fields) setFieldErrors(j.fields);
        throw new Error(j.error ?? "That did not save.");
      }

      // Say exactly what happened to what. "Saved" alone would leave
      // somebody who renamed their business believing the new name is
      // on the public page.
      const parts: string[] = [];
      const live = [...(j.published ?? [])];
      if (j.hoursSaved) live.push("Hours");
      if (live.length > 0) parts.push(`${live.join(", ")} updated on your public page.`);
      if (j.queued?.length > 0) {
        parts.push(
          `${j.queued.join(", ")} sent to us for review. We will email you when it is live.`,
        );
      }
      setMsg(parts.length > 0 ? parts.join(" ") : "Nothing had changed.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  };

  // Said before the form rather than after a failed save. A staging
  // environment that looks fully editable and refuses on submit teaches
  // people the portal is broken.
  if (readOnly) {
    return (
      <div className="border-t border-line pt-4 mt-1">
        <p className="text-[13px] text-body max-w-[62ch]">
          Editing is switched off in this environment, because it shares the
          live database and a change here would go straight to the real
          directory. Everything else on this page is real data.
        </p>
      </div>
    );
  }

  if (!listing.owned) {
    return (
      <div className="border-t border-line pt-4 mt-1 grid gap-2.5">
        <p className="text-[13px] text-body max-w-[62ch]">
          This listing matches your email address but is not linked to this
          login yet. Claim it and you can edit it from here.
        </p>
        {err && <p className="text-[12.5px] text-[#b42318]">{err}</p>}
        <div>
          <button onClick={claim} disabled={busy} className={button}>
            {busy ? "Claiming..." : "Claim this listing"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-line pt-4 mt-1 grid gap-5">
      <section className="grid gap-3.5">
        <div>
          <h4 className="text-[13.5px] font-bold tracking-tight">
            Your details
          </h4>
          <p className="text-[12.5px] text-muted mt-0.5">
            These go live on your public page as soon as you save.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field id={`phone-${listing.id}`} title="Phone" error={fieldErrors.phone}>
            <input
              id={`phone-${listing.id}`}
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(843) 555-0142"
              className={field}
            />
          </Field>
          <Field
            id={`email-${listing.id}`}
            title="Listing email"
            hint="Shown to customers. Your sign-in email does not change."
            error={fieldErrors.email}
          >
            <input
              id={`email-${listing.id}`}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={field}
            />
          </Field>
        </div>

        <Field
          id={`website-${listing.id}`}
          title="Website"
          hint="We will add https:// for you."
          error={fieldErrors.website}
        >
          <input
            id={`website-${listing.id}`}
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="yourbusiness.com"
            className={field}
          />
        </Field>

        <Field
          id={`description-${listing.id}`}
          title="Description"
          hint="What you do and who you do it for. This is the part people read before they call."
          error={fieldErrors.description}
        >
          <textarea
            id={`description-${listing.id}`}
            rows={6}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={`${field} leading-relaxed`}
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-3.5">
          {(
            [
              ["facebookUrl", "Facebook"],
              ["instagramUrl", "Instagram"],
              ["tiktokUrl", "TikTok"],
              ["youtubeUrl", "YouTube"],
              ["linkedinUrl", "LinkedIn"],
            ] as const
          ).map(([key, title]) => (
            <Field
              key={key}
              id={`${key}-${listing.id}`}
              title={title}
              error={fieldErrors[key]}
            >
              <input
                id={`${key}-${listing.id}`}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder="Optional"
                className={field}
              />
            </Field>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h4 className="text-[13.5px] font-bold tracking-tight">Opening hours</h4>
          <label className="text-[12.5px] text-body inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.showHours}
              onChange={(e) => set("showHours", e.target.checked)}
            />
            Show these on my page
          </label>
        </div>

        {/* The toggle above is one checkbox at the end of a heading, and
            it decides whether any of this appears at all. Somebody who
            has filled in a week and cannot see it on their page needs
            telling why, in the place they are looking. */}
        {!form.showHours && week.some((d) => !d.closed) && (
          <p className="text-[12.5px] text-[#8a5a00] bg-[#fff8e6] border border-[#f2dfae] rounded-md px-3 py-2">
            These hours are saved but <b className="font-semibold">not shown</b>{" "}
            on your public page. Tick &ldquo;Show these on my page&rdquo; above
            and save to publish them.
          </p>
        )}

        <div className="grid gap-1.5">
          {week.map((d) => (
            <div
              key={d.day}
              className="flex items-center gap-2.5 flex-wrap text-[13px]"
            >
              <span className="w-[86px] font-semibold shrink-0">
                {DAY_NAMES[d.day]}
              </span>
              <input
                type="time"
                aria-label={`${DAY_NAMES[d.day]} opening time`}
                value={d.open}
                disabled={d.closed}
                onChange={(e) => setDay(d.day, { open: e.target.value })}
                className="text-[13px] px-2 py-1.5 border border-line-strong rounded-md bg-white disabled:bg-surface disabled:text-faint"
              />
              <span className="text-muted">to</span>
              <input
                type="time"
                aria-label={`${DAY_NAMES[d.day]} closing time`}
                value={d.close}
                disabled={d.closed}
                onChange={(e) => setDay(d.day, { close: e.target.value })}
                className="text-[13px] px-2 py-1.5 border border-line-strong rounded-md bg-white disabled:bg-surface disabled:text-faint"
              />
              <label className="inline-flex items-center gap-1.5 text-muted">
                <input
                  type="checkbox"
                  checked={d.closed}
                  onChange={(e) => setDay(d.day, { closed: e.target.checked })}
                />
                Closed
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3.5">
        <div>
          <h4 className="text-[13.5px] font-bold tracking-tight">
            Name, category and area
          </h4>
          <p className="text-[12.5px] text-muted mt-0.5 max-w-[62ch]">
            These decide where your listing shows up and which business we
            match your ads to, so they come to us first. Your page keeps its
            current details until we approve the change.
          </p>
        </div>

        <Field
          id={`name-${listing.id}`}
          title="Business name"
          error={fieldErrors.name}
        >
          <input
            id={`name-${listing.id}`}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={field}
          />
          <PendingNote edit={pendingFor("name")} />
        </Field>

        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field
            id={`category-${listing.id}`}
            title="Category"
            error={fieldErrors.category}
          >
            <select
              id={`category-${listing.id}`}
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={field}
            >
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <PendingNote edit={pendingFor("category")} />
          </Field>

          <Field
            id={`location-${listing.id}`}
            title="Location area"
            error={fieldErrors.locationArea}
          >
            <select
              id={`location-${listing.id}`}
              value={form.locationArea}
              onChange={(e) => set("locationArea", e.target.value)}
              className={field}
            >
              <option value="">Choose an area</option>
              {locations.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.name}
                </option>
              ))}
            </select>
            <PendingNote edit={pendingFor("locationArea")} />
          </Field>
        </div>
      </section>

      {err && <p className="text-[12.5px] text-[#b42318]">{err}</p>}
      {msg && <p className="text-[12.5px] text-ok">{msg}</p>}

      <div>
        <button onClick={save} disabled={busy} className={button}>
          {busy ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
