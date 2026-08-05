"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Removing an uploaded file.
 *
 * Confirmed by name rather than a bare OK, because the list is sorted by
 * date and the rows look alike: two attempts at the same logo an hour
 * apart are one careless click away from deleting the wrong one. There is
 * no undo, and the file may be the only copy the business sent.
 */
export function AdminArtworkDelete({
  id,
  filename,
}: {
  id: number;
  filename: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (
      !window.confirm(
        `Delete ${filename}? This cannot be undone, and it may be the only copy we have.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/artwork?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not delete.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={remove}
        className="text-[12px] font-semibold text-danger hover:underline disabled:opacity-40"
      >
        {busy ? "Removing..." : "Remove"}
      </button>
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </>
  );
}
