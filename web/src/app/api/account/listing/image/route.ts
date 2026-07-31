import { after, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeListingWrite, isDenied } from "@/lib/listing-guard";
import {
  countGallery,
  deleteBusinessImage,
  saveBusinessImage,
  type ImageKind,
} from "@/lib/business-images";

/**
 * An advertiser's logo and photos.
 *
 * Stored in the database rather than on disk, following the logo upload
 * the admin already had. The legacy gallery lives on the PHP host's
 * disk and this app cannot write there, so a photo added here is served
 * from /api/business-image/{id} instead.
 */

/** Enough for a listing page, few enough that nobody is uploading an album. */
const MAX_GALLERY = 8;

/** What a phone camera actually produces, before we resize it. */
const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const businessId = Number(form.get("businessId"));
  const kind: ImageKind = form.get("kind") === "gallery" ? "gallery" : "logo";

  const auth = await authorizeListingWrite(businessId, {
    // A logo is part of a basic listing. The gallery is what Premium
    // sells, so only that one is gated.
    requirePremium: kind === "gallery",
    what: `${kind} upload`,
  });
  if (isDenied(auth)) return auth.response;

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is over 12MB. Most phones can send a smaller copy." },
      { status: 422 },
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "That file is not an image." },
      { status: 422 },
    );
  }

  if (kind === "gallery" && (await countGallery(businessId)) >= MAX_GALLERY) {
    return NextResponse.json(
      { error: `You can have ${MAX_GALLERY} photos. Remove one to add another.` },
      { status: 422 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const saved = await saveBusinessImage(businessId, bytes, kind);
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 422 });
  }

  after(() => {
    revalidatePath("/directory");
    revalidatePath(`/business/${auth.listing.slug}`);
  });

  return NextResponse.json({ ok: true, id: saved.id, kind });
}

export async function DELETE(req: Request) {
  let body: { businessId?: number; imageId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const businessId = Number(body.businessId);
  // Deleting is not gated on the plan. A listing that has dropped to
  // Basic still has its photos in the table, and refusing to let them
  // take one down would be holding their own content hostage.
  const auth = await authorizeListingWrite(businessId, { what: "image delete" });
  if (isDenied(auth)) return auth.response;

  const removed = await deleteBusinessImage(businessId, Number(body.imageId));
  if (!removed) {
    return NextResponse.json({ error: "That image is not there." }, { status: 404 });
  }

  after(() => {
    revalidatePath("/directory");
    revalidatePath(`/business/${auth.listing.slug}`);
  });

  return NextResponse.json({ ok: true });
}
