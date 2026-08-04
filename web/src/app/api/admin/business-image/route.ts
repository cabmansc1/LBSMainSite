import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  countGallery,
  deleteBusinessImage,
  getImagesFor,
  saveBusinessImage,
  type ImageKind,
} from "@/lib/business-images";

/** Uploads are capped before anything is decoded. A 40MB file should be
 *  refused on sight, not after sharp has tried to open it. */
const MAX_BYTES = 8 * 1024 * 1024;

/** The same ceiling the advertiser portal enforces. Two doors into one
 *  gallery should not disagree about how big it is allowed to be. */
const MAX_GALLERY = 8;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/** What a listing already has, so the admin can see it before changing it. */
export async function GET(req: Request) {
  await requireAdmin();
  const businessId = Number(new URL(req.url).searchParams.get("businessId"));
  if (!Number.isInteger(businessId) || businessId <= 0) {
    return NextResponse.json({ error: "Which listing?" }, { status: 422 });
  }
  const images = await getImagesFor(businessId);
  return NextResponse.json({ ok: true, ...images });
}

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

  // Previously always a logo, with no way to say otherwise, so an admin
  // could not put a customer's photos up for them however much that
  // customer had paid for the gallery.
  const kind: ImageKind = form.get("kind") === "gallery" ? "gallery" : "logo";

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

  if (kind === "gallery" && (await countGallery(businessId)) >= MAX_GALLERY) {
    return NextResponse.json(
      { error: `That listing already has ${MAX_GALLERY} photos. Remove one first.` },
      { status: 422 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const saved = await saveBusinessImage(businessId, bytes, kind);
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 422 });
  }

  revalidatePath("/directory");
  return NextResponse.json({
    ok: true,
    ...saved,
    kind,
    url: `/api/business-image/${saved.id}`,
  });
}

/**
 * Removes one image.
 *
 * By id, never by business. This used to delete every row the business
 * had, which meant the Remove button beside the logo also destroyed any
 * gallery the advertiser had uploaded themselves, and destroyed it
 * silently, because the admin had no gallery on screen to notice was
 * gone.
 */
export async function DELETE(req: Request) {
  await requireAdmin();
  const params = new URL(req.url).searchParams;
  const businessId = Number(params.get("businessId"));
  const imageId = Number(params.get("imageId"));

  if (!Number.isInteger(businessId) || businessId <= 0) {
    return NextResponse.json({ error: "Which listing?" }, { status: 422 });
  }
  if (!Number.isInteger(imageId) || imageId <= 0) {
    return NextResponse.json({ error: "Which image?" }, { status: 422 });
  }

  // Scoped to the business as well as the image, so an id belonging to
  // somebody else's listing deletes nothing rather than deleting theirs.
  const removed = await deleteBusinessImage(businessId, imageId);
  if (!removed) {
    return NextResponse.json({ error: "That image is not there." }, { status: 404 });
  }

  revalidatePath("/directory");
  return NextResponse.json({ ok: true });
}
