"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileDetails } from "@/lib/profile";

const field =
  "w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950";
const button =
  "text-[14px] font-semibold px-4 py-2.5 rounded-(--radius-btn) bg-navy-950 text-white hover:bg-navy-800 disabled:opacity-60";

/** One save state per section, so saving a phone does not blank the name form. */
function useSection() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const run = async (body: unknown, after?: () => void) => {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      setMsg("Saved.");
      after?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, msg, err, run };
}

function Note({ msg, err }: { msg: string; err: string }) {
  if (err) return <p className="text-[12.5px] text-[#b42318]">{err}</p>;
  if (msg) return <p className="text-[12.5px] text-ok">{msg}</p>;
  return null;
}

export function ProfileForm({ profile }: { profile: ProfileDetails }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [password, setPassword] = useState("");

  const name = useSection();
  const contact = useSection();
  const pass = useSection();

  return (
    <div className="grid gap-4">
      <section className="bg-white border border-line rounded-(--radius-card) p-6 grid gap-3.5">
        <h2 className="text-[16px] font-semibold tracking-tight">Your name</h2>
        <div className="grid sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="pf-first" className="text-[12.5px] font-semibold text-body block mb-1.5">
              First name
            </label>
            <input id="pf-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="pf-last" className="text-[12.5px] font-semibold text-body block mb-1.5">
              Last name
            </label>
            <input id="pf-last" value={lastName} onChange={(e) => setLastName(e.target.value)} className={field} />
          </div>
        </div>
        <Note msg={name.msg} err={name.err} />
        <div>
          <button
            disabled={name.busy}
            onClick={() =>
              name.run({ action: "name", firstName, lastName }, () => router.refresh())
            }
            className={button}
          >
            {name.busy ? "Saving..." : "Save name"}
          </button>
        </div>
      </section>

      <section className="bg-white border border-line rounded-(--radius-card) p-6 grid gap-3.5">
        <h2 className="text-[16px] font-semibold tracking-tight">How we reach you</h2>
        <div>
          <label className="text-[12.5px] font-semibold text-body block mb-1.5">Email</label>
          <input value={profile.email} readOnly disabled className={`${field} bg-surface text-muted`} />
          <p className="text-[12px] text-muted mt-1.5">
            This is how you sign in and how we match your orders, so it is
            not editable here. Get in touch if it needs to change.
          </p>
        </div>
        <div>
          <label htmlFor="pf-phone" className="text-[12.5px] font-semibold text-body block mb-1.5">
            Mobile number
          </label>
          <input
            id="pf-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(843) 555-0142"
            className={field}
          />
          <p className="text-[12px] text-muted mt-1.5">
            Only used to text you about your artwork deadline and your proof.
          </p>
        </div>
        <Note msg={contact.msg} err={contact.err} />
        <div>
          <button
            disabled={contact.busy}
            onClick={() => contact.run({ action: "phone", phone })}
            className={button}
          >
            {contact.busy ? "Saving..." : "Save number"}
          </button>
        </div>
      </section>

      <section className="bg-white border border-line rounded-(--radius-card) p-6 grid gap-3.5">
        <h2 className="text-[16px] font-semibold tracking-tight">
          {profile.hasPassword ? "Change your password" : "Set a password"}
        </h2>
        <p className="text-[13px] text-body max-w-[62ch]">
          {profile.hasPassword
            ? "You can sign in with a password or with an emailed code. Both keep working."
            : "You do not need one. Signing in with an emailed code works fine and there is nothing to forget. Set one only if you would rather type a password."}
        </p>
        <div>
          <label htmlFor="pf-pass" className="text-[12.5px] font-semibold text-body block mb-1.5">
            New password
          </label>
          <input
            id="pf-pass"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={`${field} max-w-[320px]`}
          />
        </div>
        <Note msg={pass.msg} err={pass.err} />
        <div>
          <button
            disabled={pass.busy || password.length < 8}
            onClick={() => pass.run({ action: "password", password }, () => setPassword(""))}
            className={button}
          >
            {pass.busy ? "Saving..." : profile.hasPassword ? "Change password" : "Set password"}
          </button>
        </div>
      </section>
    </div>
  );
}
