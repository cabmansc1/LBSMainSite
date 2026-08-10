"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActivityKind } from "@/lib/admin-activity";
import type { AlertChannel, AlertRecipient } from "@/lib/alert-routing";

/**
 * Who gets told what.
 *
 * A grid rather than a form per channel, because the question people
 * actually ask is "does Andrew get texts about refunds", and a grid is
 * the shape of that question. Rows are kinds, columns are channels.
 *
 * Saving is per person and explicit. Auto-saving a checkbox that decides
 * whether a phone rings at midnight is a way to change something by
 * brushing against it.
 */

type Props = {
  recipients: AlertRecipient[];
  kinds: { value: ActivityKind; label: string }[];
  channels: { value: AlertChannel; label: string }[];
  /** Kinds deliberately sent to nobody. */
  muted: ActivityKind[];
  /** Where alerts go when nobody here is set up. */
  fallbackEmail: string;
};

const blank = (): AlertRecipient => ({
  id: 0,
  name: "",
  email: "",
  phone: "",
  // Left empty here on purpose. The server stamps the real list of
  // kinds on save — it is the only side that knows them, and importing
  // the list would pull "server-only" across into this component and
  // fail the build.
  seenKinds: [],
  active: true,
  prefs: { email: [], sms: [], push: [] },
});

export function AdminAlertRecipients({
  recipients,
  kinds,
  channels,
  fallbackEmail,
  muted,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<AlertRecipient | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [silent, setSilent] = useState<ActivityKind[]>(muted);
  const [muting, setMuting] = useState<string>("");

  /**
   * Turning a kind off entirely.
   *
   * Separate from the grid because unticking everybody does not mean
   * this: routing falls back to the default address when a kind would
   * otherwise reach nobody, so that a half-filled screen cannot swallow
   * a customer's artwork. Silence has to be asked for.
   */
  async function toggleMute(kind: ActivityKind, next: boolean) {
    setMuting(kind);
    setError("");
    try {
      const res = await fetch("/api/admin/alert-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mute", kind, muted: next }),
      });
      if (!res.ok) throw new Error("That did not save.");
      setSilent((cur) =>
        next ? [...cur, kind] : cur.filter((k) => k !== kind),
      );
      router.refresh();
    } catch {
      setError("That did not save.");
    } finally {
      setMuting("");
    }
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/alert-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: AlertRecipient) {
    if (!window.confirm(`Stop sending alerts to ${r.name || r.email || r.phone}?`)) {
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/admin/alert-recipients?id=${r.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const toggle = (channel: AlertChannel, kind: ActivityKind) => {
    if (!editing) return;
    const have = editing.prefs[channel];
    setEditing({
      ...editing,
      prefs: {
        ...editing.prefs,
        [channel]: have.includes(kind)
          ? have.filter((k) => k !== kind)
          : [...have, kind],
      },
    });
  };

  return (
    <div className="grid gap-4">
      {recipients.length === 0 && (
        <p className="text-[13px] text-[#7a4a00] bg-cta-tint border border-[#f3ddbb] rounded-lg px-4 py-2.5">
          Nobody is set up, so every alert email goes to {fallbackEmail} and
          texts follow the environment variables, exactly as before. Adding
          somebody here takes over completely.
        </p>
      )}

      {recipients.length > 0 && (
        <div className="border border-line rounded-(--radius-card) bg-white overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead>
              <tr className="text-left border-b border-line">
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
                  Person
                </th>
                {channels.map((c) => (
                  <th
                    key={c.value}
                    className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted"
                  >
                    {c.label}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold">
                      {r.name || r.email || r.phone}
                      {!r.active && (
                        <span className="ml-2 text-[11.5px] font-semibold text-muted">
                          paused
                        </span>
                      )}
                    </div>
                    <div className="text-[12.5px] text-muted">
                      {[r.email, r.phone].filter(Boolean).join(" · ")}
                    </div>
                  </td>
                  {channels.map((c) => (
                    <td key={c.value} className="px-4 py-3 text-[12.5px]">
                      {r.prefs[c.value].length === 0 ? (
                        <span className="text-faint">None</span>
                      ) : r.prefs[c.value].length === kinds.length ? (
                        "Everything"
                      ) : (
                        r.prefs[c.value]
                          .map((k) => kinds.find((x) => x.value === k)?.label ?? k)
                          .join(", ")
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      className="text-[12.5px] font-semibold text-brand-deep hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(r)}
                      className="ml-3 text-[12.5px] font-semibold text-danger hover:underline disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!editing && (
        <div>
          <button
            type="button"
            onClick={() => setEditing(blank())}
            className="bg-navy-950 text-white text-[13.5px] font-semibold px-4 py-2.5 rounded-[10px] hover:bg-navy-800"
          >
            Add someone
          </button>
        </div>
      )}

      {editing && (
        <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3.5">
          <b className="text-[15px]">
            {editing.id ? `Edit ${editing.name || editing.email}` : "Add someone"}
          </b>

          <div className="grid sm:grid-cols-3 gap-3">
            <label className="grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                Name
              </span>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                Email
              </span>
              <input
                value={editing.email}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                placeholder="andrew@lowcountrybusinessspotlight.com"
                className="w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                Mobile
              </span>
              <input
                value={editing.phone}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                placeholder="+18549464500"
                className="w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
              />
            </label>
          </div>
          <p className="text-[12px] text-muted -mt-1">
            The mobile needs the country code, as Twilio will not take it
            otherwise. Push goes to browsers signed in as this email address
            and switched on from the Dashboard.
          </p>

          <div className="overflow-x-auto">
            <table className="text-sm border-collapse min-w-[420px]">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Tell them about
                  </th>
                  {channels.map((c) => (
                    <th
                      key={c.value}
                      className="px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted"
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kinds.map((k) => (
                  <tr key={k.value} className="border-t border-line">
                    <td className="px-3 py-2 text-[13.5px]">{k.label}</td>
                    {channels.map((c) => (
                      <td key={c.value} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={editing.prefs[c.value].includes(k.value)}
                          onChange={() => toggle(c.value, k.value)}
                          aria-label={`${k.label} by ${c.label}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="flex items-center gap-2 text-[13.5px]">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
            />
            Sending to this person
          </label>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="bg-cta text-navy-950 text-[14px] font-bold px-5 py-2.5 rounded-(--radius-btn) hover:bg-[#FFA033] disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setError("");
              }}
              className="text-[13px] font-semibold text-muted hover:text-navy-950"
            >
              Cancel
            </button>
            {error && (
              <span className="text-[13px] font-semibold text-danger">{error}</span>
            )}
          </div>
        </div>
      )}

      {/*
        Deliberate silence, stated rather than implied.

        Everything else on this screen answers "who wants this". This
        answers "is this worth telling anybody about", which is why it
        survives the fallback: an unticked box is treated as a gap and
        routed to the default address, and a ticked box here is not.
      */}
      <div className="mt-8 border border-line rounded-(--radius-card) bg-white p-5">
        <b className="text-[14.5px]">Send to nobody</b>
        <p className="text-[13px] text-muted mt-1 max-w-[70ch]">
          Anything ticked here goes nowhere at all &mdash; no email, no text,
          no notification. Everything else falls back to{" "}
          <b className="text-ink">{fallbackEmail}</b> when nobody above is set
          up for it, so an alert can never be lost by accident. This is how you
          lose one on purpose.
        </p>

        <div className="mt-3.5 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
          {kinds.map((k) => {
            const off = silent.includes(k.value);
            return (
              <label
                key={k.value}
                className="flex items-center gap-2.5 text-[13.5px] py-1"
              >
                <input
                  type="checkbox"
                  checked={off}
                  disabled={muting === k.value}
                  onChange={(e) => void toggleMute(k.value, e.target.checked)}
                />
                <span className={off ? "text-muted line-through" : ""}>
                  {k.label}
                </span>
                {muting === k.value && (
                  <span className="text-[11.5px] text-muted">saving</span>
                )}
              </label>
            );
          })}
        </div>

        {silent.length > 0 && (
          <p className="mt-3.5 text-[12.5px] text-[#7a4a00] bg-cta-tint border border-[#f3ddbb] rounded-lg px-3.5 py-2">
            {silent.length === 1
              ? "One kind of alert is going nowhere."
              : `${silent.length} kinds of alert are going nowhere.`}{" "}
            The activity feed on the Dashboard still records them.
          </p>
        )}
      </div>
    </div>
  );
}
