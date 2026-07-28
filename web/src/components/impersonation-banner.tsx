"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Always visible while viewing as someone else.
 *
 * Sticky and loud on purpose. The failure mode of impersonation is
 * forgetting you are in it and then wondering why the site is behaving
 * oddly, or worse, acting as though the data belongs to you.
 */
export function ImpersonationBanner({ email }: { email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const stop = async () => {
    setBusy(true);
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    router.push("/admin/users");
    router.refresh();
  };

  return (
    <div className="sticky top-0 z-40 bg-cta text-navy-950 px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap">
      <span className="text-[13px] font-semibold">
        Viewing as {email}. Changes are blocked.
      </span>
      <button
        onClick={stop}
        disabled={busy}
        className="text-[12.5px] font-bold bg-navy-950 text-white px-3 py-1.5 rounded-md hover:bg-navy-800 disabled:opacity-60"
      >
        {busy ? "Leaving..." : "Back to admin"}
      </button>
    </div>
  );
}
