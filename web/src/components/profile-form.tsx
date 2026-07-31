"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileDetails } from "@/lib/profile";
import type { AdvertiserBusiness } from "@/lib/advertiser-business";

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

export function ProfileForm({
  profile,
  business,
  businessSaved,
}: {
  profile: ProfileDetails;
  business: AdvertiserBusiness;
  /** False when the fields are our guess rather than their answer. */
  businessSaved: boolean;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [password, setPassword] = useState("");
  const [biz, setBiz] = useState<AdvertiserBusiness>(business);

  const name = useSection();
  const contact = useSection();
  const pass = useSection();
  const bus = useSection();

  const setField = (k: keyof AdvertiserBusiness) => (v: string) =>
    setBiz((b) => ({ ...b, [k]: v }));

  return (
    <div className="grid gap-4">
      <section className="bg-white border border-line rounded-(--radius-card) p-6 grid gap-3.5">
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight">Your business</h2>
          <p className="text-[12.5px] text-muted mt-1">
            {/* Said plainly, because an address on a form with no
                explanation reads as one that is about to be published. */}
            For our records, your receipts and anything we post to you.
            None of it appears on the public directory unless you add a
            listing yourself.
          </p>
        </div>

        {!businessSaved && (
          <p className="text-[12.5px] text-body bg-brand-tint border border-[#c2e4fb] rounded-lg px-3.5 py-2.5">
            We have filled these in from your order and listing. Check them
            and save.
          </p>
        )}

        <div>
          <label htmlFor="pf-biz" className="text-[12.5px] font-semibold text-body block mb-1.5">
            Business name
          </label>
          <input
            id="pf-biz"
            value={biz.businessName}
            onChange={(e) => setField("businessName")(e.target.value)}
            autoComplete="organization"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="pf-bizphone" className="text-[12.5px] font-semibold text-body block mb-1.5">
            Business phone
          </label>
          <input
            id="pf-bizphone"
            type="tel"
            inputMode="tel"
            value={biz.businessPhone}
            onChange={(e) => setField("businessPhone")(e.target.value)}
            placeholder="(843) 555-0142"
            className={field}
          />
          <p className="text-[12px] text-muted mt-1.5">
            Your published business line, if it is different from your
            mobile above.
          </p>
        </div>

        <div>
          <label htmlFor="pf-addr" className="text-[12.5px] font-semibold text-body block mb-1.5">
            Business address
          </label>
          <input
            id="pf-addr"
            value={biz.address}
            onChange={(e) => setField("address")(e.target.value)}
            placeholder="123 Main St"
            autoComplete="street-address"
            className={field}
          />
        </div>

        <div className="grid sm:grid-cols-[1.4fr_.6fr_.8fr] gap-3.5">
          <div>
            <label htmlFor="pf-city" className="text-[12.5px] font-semibold text-body block mb-1.5">
              City
            </label>
            <input
              id="pf-city"
              value={biz.city}
              onChange={(e) => setField("city")(e.target.value)}
              autoComplete="address-level2"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="pf-state" className="text-[12.5px] font-semibold text-body block mb-1.5">
              State
            </label>
            <input
              id="pf-state"
              value={biz.state}
              onChange={(e) => setField("state")(e.target.value)}
              placeholder="SC"
              autoComplete="address-level1"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="pf-zip" className="text-[12.5px] font-semibold text-body block mb-1.5">
              ZIP
            </label>
            <input
              id="pf-zip"
              value={biz.zipCode}
              onChange={(e) => setField("zipCode")(e.target.value)}
              inputMode="numeric"
              autoComplete="postal-code"
              className={`${field} num`}
            />
          </div>
        </div>

        <Note msg={bus.msg} err={bus.err} />
        <div>
          <button
            disabled={bus.busy}
            onClick={() => bus.run({ action: "business", ...biz }, () => router.refresh())}
            className={button}
          >
            {bus.busy ? "Saving..." : "Save business details"}
          </button>
        </div>
      </section>

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
