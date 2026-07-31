"use client";

import { useRouter } from "next/navigation";

/**
 * Sign out.
 *
 * Both places this appears are navy: the admin header and the portal
 * sidebar. The colours used to be muted going to ink, which is near
 * black, so hovering faded the control into the background and it
 * disappeared under the cursor. Light going to white instead.
 */
export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className="text-[13px] font-semibold text-[#93A5B8] hover:text-white transition-colors"
    >
      Sign out
    </button>
  );
}
