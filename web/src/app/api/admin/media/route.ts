import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listMedia, mediaPath, saveMedia, updateMediaText } from "@/lib/media";

export const dynamic = "force-dynamic";

/**
 * The library, for the picker.
 *
 * Never returns bytes — listMedia selects every column except the blob,
 * so browsing eighty pictures costs eighty rows rather than eighty
 * full-size images pulled into memory to draw thumbnails.
 */
export async function GET(req: Request) {
  await requireAdmin();
  const limit = Math.min(
    Math.max(Number(new URL(req.url).searchParams.get("limit")) || 120, 1),
    200,
  );
  return NextResponse.json({ items: await listMedia(limit) });
}

/** Capped before anything is decoded, so a huge file is refused on sight. */
const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * Uploads a picture, or edits the words attached to one.
 *
 * Form data means an upload; JSON means a text edit. The bytes are never
 * editable: replacing a picture writes a new row, so a URL already out
 * in the world can never start returning something different.
 */
export async function POST(req: Request) {
  await requireAdmin();

  const type = req.headers.get("content-type") ?? "";

  if (type.includes("application/json")) {
    let body: { id?: unknown; alt?: unknown; caption?: unknown; credit?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Which picture?" }, { status: 422 });
    }
    const result = await updateMediaText(id, {
      alt: String(body.alt ?? ""),
      caption: String(body.caption ?? ""),
      credit: String(body.credit ?? ""),
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json({ ok: true });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Send the image as form data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file." }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is over 15MB. Try a smaller one." },
      { status: 413 },
    );
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, GIF or AVIF." },
      { status: 415 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const saved = await saveMedia(bytes, {
    alt: String(form.get("alt") ?? ""),
    caption: String(form.get("caption") ?? ""),
    credit: String(form.get("credit") ?? ""),
  });
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true, ...saved, url: mediaPath(saved.id) });
}
