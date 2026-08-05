import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { deleteAd, saveAd, saveAdsense, setAdActive } from "@/lib/ads";
import { isAdSlot, type AdSlotId, type AdsenseConfig } from "@/lib/ads-types";

/** Capped before anything is decoded. A 40MB file is refused on sight. */
const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const list = (v: FormDataEntryValue | null): string[] =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Creates or updates a creative.
 *
 * Multipart rather than JSON because the artwork comes with it, and a
 * base64 round trip through JSON would inflate an 8MB upload to 11MB for
 * no benefit.
 */
export async function POST(req: Request) {
  await requireAdmin();

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Send the ad as form data." }, { status: 400 });
  }

  const file = form.get("file");
  let bytes: Buffer | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "That image is over 8MB. Try a smaller one." },
        { status: 413 },
      );
    }
    if (file.type && !ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Use a JPEG, PNG, WebP, GIF or AVIF." },
        { status: 415 },
      );
    }
    bytes = Buffer.from(await file.arrayBuffer());
  }

  const idRaw = Number(form.get("id"));
  const result = await saveAd(
    {
      id: Number.isInteger(idRaw) && idRaw > 0 ? idRaw : undefined,
      slot: String(form.get("slot") ?? ""),
      name: String(form.get("name") ?? ""),
      alt: String(form.get("alt") ?? ""),
      clickUrl: String(form.get("clickUrl") ?? ""),
      categories: list(form.get("categories")),
      locations: list(form.get("locations")),
      startsOn: String(form.get("startsOn") ?? "") || null,
      endsOn: String(form.get("endsOn") ?? "") || null,
      active: form.get("active") !== "false",
    },
    bytes,
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  revalidatePath("/directory");
  return NextResponse.json({ ok: true, id: result.id });
}

/** Pause, resume, or save the AdSense settings. */
export async function PATCH(req: Request) {
  await requireAdmin();

  let body: { id?: unknown; active?: unknown; adsense?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.adsense && typeof body.adsense === "object") {
    const incoming = body.adsense as Partial<AdsenseConfig>;
    const units: AdsenseConfig["units"] = {};
    for (const [slot, unit] of Object.entries(incoming.units ?? {})) {
      if (isAdSlot(slot)) units[slot as AdSlotId] = String(unit ?? "");
    }
    await saveAdsense({
      enabled: !!incoming.enabled,
      client: String(incoming.client ?? ""),
      units,
    });
    return NextResponse.json({ ok: true });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Which ad?" }, { status: 422 });
  }
  await setAdActive(id, body.active !== false);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Which ad?" }, { status: 422 });
  }
  await deleteAd(id);
  return NextResponse.json({ ok: true });
}
