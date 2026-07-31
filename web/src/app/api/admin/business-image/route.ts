import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { deleteBusinessImages, saveBusinessImage } from "@/lib/business-images";

/** Uploads are capped before anything is decoded. A 40MB file should be
 *  refused on sight, not after sharp has tried to open it. */
const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function POST(req: Request) {
  await requireAdmin();

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Send the image as form data." }, { status: 400 });
  }

  const businessId = Number(form.get("businessId"));
  if (!Number.isInteger(businessId) || businessId <= 0) {
    return NextResponse.json({ error: "Which listing?" }, { status: 422 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file." }, { status: 422 });
  }
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

  const bytes = Buffer.from(await file.arrayBuffer());
  const saved = await saveBusinessImage(businessId, bytes);
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true, ...saved, url: `/api/business-image/${saved.id}` });
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const businessId = Number(new URL(req.url).searchParams.get("businessId"));
  if (!Number.isInteger(businessId) || businessId <= 0) {
    return NextResponse.json({ error: "Which listing?" }, { status: 422 });
  }
  await deleteBusinessImages(businessId);
  return NextResponse.json({ ok: true });
}
