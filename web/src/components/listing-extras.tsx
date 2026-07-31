"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Logo, photos and the offer.
 *
 * Separate from the main editor because these save on their own rather
 * than with the rest of the form: an upload is a file going somewhere
 * the moment you pick it, and pretending it is part of a Save button
 * two screens down would be a lie about when it happened.
 *
 * The gallery and the offer are Premium. A Basic listing sees what it
 * would get rather than a disabled control, because "upgrade to add
 * photos" is a useful sentence and a greyed-out button is not.
 */

const field =
  "w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg bg-white focus:outline-none focus:border-navy-950";
const label = "text-[12.5px] font-semibold text-body block mb-1.5";
const button =
  "text-[13.5px] font-semibold px-3.5 py-2 rounded-(--radius-btn) bg-navy-950 text-white hover:bg-navy-800 disabled:opacity-60";

export type OfferValue = {
  title: string;
  description: string;
  terms: string;
  expiresAt: string;
};

function Upgrade({ what }: { what: string }) {
  return (
    <p className="text-[13px] text-body bg-cta-tint border border-[#f3ddbb] rounded-lg px-3.5 py-3">
      {what} are part of Premium. Your listing is on the free plan.{" "}
      <Link href="/register" className="font-semibold text-brand-deep hover:underline">
        See what Premium includes
      </Link>
      .
    </p>
  );
}

export function ListingExtras({
  businessId,
  premium,
  logoId,
  galleryIds,
  offer,
}: {
  businessId: number;
  premium: boolean;
  logoId?: number;
  galleryIds: number[];
  offer?: OfferValue;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState<OfferValue>(
    offer ?? { title: "", description: "", terms: "", expiresAt: "" },
  );

  const done = (m: string) => {
    setMsg(m);
    setBusy("");
    router.refresh();
  };

  async function upload(file: File, kind: "logo" | "gallery") {
    setBusy(kind);
    setErr("");
    setMsg("");
    try {
      const body = new FormData();
      body.append("businessId", String(businessId));
      body.append("kind", kind);
      body.append("file", file);
      // No content-type header: the browser has to set the multipart
      // boundary itself, and setting it by hand breaks the parse.
      const res = await fetch("/api/account/listing/image", { method: "POST", body });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That upload failed.");
      done(kind === "logo" ? "Logo updated." : "Photo added.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That upload failed.");
      setBusy("");
    }
  }

  async function removeImage(imageId: number) {
    setBusy(`del-${imageId}`);
    setErr("");
    try {
      const res = await fetch("/api/account/listing/image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, imageId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That could not be removed.");
      done("Removed.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That could not be removed.");
      setBusy("");
    }
  }

  async function saveOffer() {
    setBusy("offer");
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/account/listing/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, ...form }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not save.");
      done("Offer is live on your page.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not save.");
      setBusy("");
    }
  }

  async function removeOffer() {
    setBusy("offer");
    setErr("");
    try {
      const res = await fetch("/api/account/listing/offer", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      if (!res.ok) throw new Error("That could not be removed.");
      setForm({ title: "", description: "", terms: "", expiresAt: "" });
      done("Offer taken down.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That could not be removed.");
      setBusy("");
    }
  }

  return (
    <div className="border-t border-line pt-4 mt-1 grid gap-5">
      <section className="grid gap-3">
        <div>
          <h4 className="text-[13.5px] font-bold tracking-tight">Logo</h4>
          <p className="text-[12.5px] text-muted mt-0.5 max-w-[62ch]">
            {/* Numbers taken from what the pages actually do with it, so
                they stay true: stored at 600px, drawn at 56 to 72. */}
            Square works best, around 600 × 600. It is never cropped, so a
            wide logo will just sit smaller. PNG with a transparent
            background if you have one. We resize it for you.
          </p>
        </div>
        <div className="flex items-center gap-3.5 flex-wrap">
          {logoId ? (
            <Image
              src={`/api/business-image/${logoId}`}
              width={64}
              height={64}
              alt="Your logo"
              className="w-16 h-16 rounded-[10px] border border-line bg-white object-contain p-1"
            />
          ) : (
            <div className="w-16 h-16 rounded-[10px] border border-dashed border-line-strong bg-surface flex items-center justify-center text-[11px] text-muted text-center px-1">
              No logo
            </div>
          )}
          <label className={`${button} cursor-pointer inline-block`}>
            {busy === "logo" ? "Uploading..." : logoId ? "Replace" : "Upload a logo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f, "logo");
                e.target.value = "";
              }}
            />
          </label>
          {logoId && (
            <button
              onClick={() => removeImage(logoId)}
              disabled={busy !== ""}
              className="text-[13px] font-semibold text-muted hover:text-[#a33] disabled:opacity-40"
            >
              Remove
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-3">
        <div>
          <h4 className="text-[13.5px] font-bold tracking-tight">Photos</h4>
          <p className="text-[12.5px] text-muted mt-0.5 max-w-[62ch]">
            Up to 8, shown on your listing page. Your work, your premises,
            your team.
          </p>
          <p className="text-[12.5px] text-muted mt-1.5 max-w-[62ch]">
            {/* The grid is aspect-square object-cover, so this is a
                warning rather than a preference: the edges genuinely
                disappear. */}
            <b className="font-semibold text-body">
              These are shown as squares.
            </b>{" "}
            Whatever you upload gets cropped to a square from the middle, so
            keep the important part centred and expect the left and right
            edges of a wide photo to be trimmed. Aim for at least 1200 ×
            1200. Anything up to 12MB is fine; we resize it.
          </p>
        </div>

        {!premium ? (
          <Upgrade what="Photos" />
        ) : (
          <>
            <div className="flex gap-2.5 flex-wrap">
              {galleryIds.map((id) => (
                <div key={id} className="relative">
                  <Image
                    src={`/api/business-image/${id}`}
                    width={96}
                    height={96}
                    alt=""
                    className="w-24 h-24 rounded-[10px] border border-line object-cover bg-white"
                  />
                  <button
                    onClick={() => removeImage(id)}
                    disabled={busy !== ""}
                    aria-label="Remove photo"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-line-strong text-[13px] leading-none text-muted hover:text-[#a33] disabled:opacity-40"
                  >
                    ×
                  </button>
                </div>
              ))}
              {galleryIds.length < 8 && (
                <label className="w-24 h-24 rounded-[10px] border border-dashed border-line-strong bg-surface flex items-center justify-center text-[12px] text-muted cursor-pointer hover:border-navy-950">
                  {busy === "gallery" ? "..." : "+ Add"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(f, "gallery");
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {galleryIds.length >= 8 && (
              <p className="text-[12px] text-muted">
                That is the maximum. Remove one to add another.
              </p>
            )}
          </>
        )}
      </section>

      <section className="grid gap-3.5">
        <div>
          <h4 className="text-[13.5px] font-bold tracking-tight">Special offer</h4>
          <p className="text-[12.5px] text-muted mt-0.5">
            Shown on your listing and on your card in the directory.
          </p>
        </div>

        {!premium ? (
          <Upgrade what="Offers" />
        ) : (
          <>
            <div>
              <label htmlFor={`offer-title-${businessId}`} className={label}>
                Offer
              </label>
              <input
                id={`offer-title-${businessId}`}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="$50 off your first service"
                maxLength={120}
                className={field}
              />
            </div>
            <div>
              <label htmlFor={`offer-desc-${businessId}`} className={label}>
                Details
              </label>
              <textarea
                id={`offer-desc-${businessId}`}
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={600}
                className={field}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor={`offer-terms-${businessId}`} className={label}>
                  Small print
                </label>
                <input
                  id={`offer-terms-${businessId}`}
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  placeholder="New customers only"
                  maxLength={600}
                  className={field}
                />
              </div>
              <div>
                <label htmlFor={`offer-until-${businessId}`} className={label}>
                  Runs until
                </label>
                <input
                  id={`offer-until-${businessId}`}
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className={field}
                />
                <p className="text-[12px] text-muted mt-1.5">
                  {/* Said plainly, because an offer vanishing on its own
                      is the kind of thing people ring up about. */}
                  Leave empty and it runs until you take it down. Otherwise it
                  stops showing after this date.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveOffer}
                disabled={busy !== "" || form.title.trim().length < 3}
                className={button}
              >
                {busy === "offer" ? "Saving..." : offer ? "Update offer" : "Publish offer"}
              </button>
              {offer && (
                <button
                  onClick={removeOffer}
                  disabled={busy !== ""}
                  className="text-[13px] font-semibold text-muted hover:text-[#a33] disabled:opacity-40"
                >
                  Take it down
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {err && <p className="text-[12.5px] text-[#b42318]">{err}</p>}
      {msg && <p className="text-[12.5px] text-ok">{msg}</p>}
    </div>
  );
}
