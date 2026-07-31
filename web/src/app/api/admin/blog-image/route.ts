import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { blogImagePath, saveBlogImage } from "@/lib/blog-images";

/** Uploads are capped before anything is decoded. A 40MB file should be
 *  refused on sight, not after sharp has tried to open it. */
const MAX_BYTES = 12 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * No post id is required or accepted. The editor uploads while the post
 * is still unsaved and has no id, and the saved post is what points at
 * the image, so asking for one here would only make new posts a special
 * case.
 */
export async function POST(req: Request) {
  await requireAdmin();

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Send the image as form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file." }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is over 12MB. Try a smaller one." },
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
  const saved = await saveBlogImage(bytes);
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 422 });
  }

  // The path is what the editor writes into featured_image, so the
  // caller never has to know how the column is read back.
  return NextResponse.json({ ok: true, ...saved, url: blogImagePath(saved.id) });
}
