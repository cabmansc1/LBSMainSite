"use client";

import { useEffect, useState } from "react";

/**
 * Switching phone notifications on for this browser.
 *
 * A subscription belongs to a browser, not to a person, so this is per
 * device and the wording says so. Somebody who turns it on at their desk
 * and expects their phone to ring has been misled by a label, not by a
 * bug.
 *
 * The permission prompt only ever appears from a click. Asking on page
 * load is how a browser learns to block the site permanently, and the
 * decision is not reversible from here once it has been made.
 */

type State =
  | "checking"
  | "unsupported"
  | "unconfigured"
  | "blocked"
  | "off"
  | "on"
  | "working";

/**
 * VAPID keys travel as base64url; PushManager wants raw bytes.
 *
 * Backed by an explicit ArrayBuffer rather than Uint8Array.from, because
 * applicationServerKey will not take the ArrayBufferLike the shorthand
 * produces: a Uint8Array can sit on a SharedArrayBuffer, and this API
 * only accepts the plain kind.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function AdminPushToggle() {
  const [state, setState] = useState<State>("checking");
  const [publicKey, setPublicKey] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        // Most often an iPhone where the site has not been added to the
        // home screen, which is the one case worth naming.
        setState("unsupported");
        return;
      }

      try {
        const res = await fetch("/api/admin/push");
        const j = await res.json();
        if (!j.enabled || !j.publicKey) {
          setState("unconfigured");
          return;
        }
        setPublicKey(j.publicKey);

        if (Notification.permission === "denied") {
          setState("blocked");
          return;
        }

        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        setState(sub ? "on" : "off");
      } catch {
        setState("unconfigured");
      }
    })();
  }, []);

  async function enable() {
    setState("working");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        // Required by every browser now: a push that cannot be shown to
        // the user is not allowed to be delivered silently.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not register.");
      setState("on");
      setMessage("This browser will now be notified.");
    } catch (e) {
      setState("off");
      setMessage(e instanceof Error ? e.message : "That did not work.");
    }
  }

  async function disable() {
    setState("working");
    setMessage("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        // Told first, so the server stops sending even if the browser
        // then fails to tear its own subscription down.
        await fetch("/api/admin/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unsubscribe", subscription: sub.toJSON() }),
        });
        await sub.unsubscribe();
      }
      setState("off");
      setMessage("Switched off for this browser.");
    } catch (e) {
      setState("on");
      setMessage(e instanceof Error ? e.message : "That did not work.");
    }
  }

  async function test() {
    setMessage("Sending...");
    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      setMessage(
        res.ok
          ? "Sent. It should arrive in a moment, and appear in the activity feed."
          : "That did not send.",
      );
    } catch {
      setMessage("That did not send.");
    }
  }

  if (state === "checking") return null;

  return (
    <div className="border border-line rounded-(--radius-card) bg-white px-5 py-4 grid gap-2">
      <b className="text-[14px]">Phone notifications</b>

      {state === "unsupported" && (
        <p className="text-[13px] text-muted">
          This browser cannot do push notifications. On an iPhone, add the site
          to your home screen first and open it from there.
        </p>
      )}

      {state === "unconfigured" && (
        <p className="text-[13px] text-muted">
          Not set up on this deploy. Generate a key pair with{" "}
          <code className="text-[12px]">
            node -e &quot;console.log(require(&apos;web-push&apos;).generateVAPIDKeys())&quot;
          </code>{" "}
          and set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
        </p>
      )}

      {state === "blocked" && (
        <p className="text-[13px] text-muted">
          Notifications are blocked for this site in your browser settings.
          That has to be changed there; this page cannot ask again.
        </p>
      )}

      {(state === "off" || state === "on" || state === "working") && (
        <>
          <p className="text-[13px] text-muted">
            {state === "on"
              ? "On for this browser. Each device you want notified has to be switched on from that device."
              : "Get artwork, orders and refunds on this device even with the site closed. Per browser, so switch it on wherever you want it."}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              disabled={state === "working"}
              onClick={state === "on" ? disable : enable}
              className={
                state === "on"
                  ? "text-[13px] font-semibold px-4 py-2 rounded-(--radius-btn) border border-line-strong hover:bg-surface disabled:opacity-40"
                  : "bg-navy-950 text-white text-[13px] font-bold px-4 py-2 rounded-(--radius-btn) hover:bg-navy-800 disabled:opacity-40"
              }
            >
              {state === "working"
                ? "Working..."
                : state === "on"
                  ? "Turn off"
                  : "Turn on"}
            </button>
            {state === "on" && (
              <button
                type="button"
                onClick={test}
                className="text-[13px] font-semibold text-brand-deep hover:underline"
              >
                Send a test
              </button>
            )}
          </div>
        </>
      )}

      {message && <p className="text-[12.5px] text-body">{message}</p>}
    </div>
  );
}
