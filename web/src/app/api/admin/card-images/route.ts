import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { requireAdmin } from "@/lib/admin";
import {
  addCardImage,
  deleteCardImage,
  deletePastCard,
  getPastCard,
  savePastCard,
  type CardSide,
} from "@/lib/past-cards";

/** A printed 9x12 needs detail, not a poster. 1800px is plenty. */
const MAX_EDGE = 1800;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const SIDES: CardSide[] = ["front", "back", "detail"];

export async function POST(req: Request) {
  await requireAdmin();

  const form = await req.formData();
  const file = form.get("file");
  const cardSlug = String(form.get("cardSlug") ?? "").trim();
  const side = String(form.get("side") ?? "front") as CardSide;
  const caption = String(form.get("caption") ?? "").trim();

  if (!cardSlug) {
    return NextResponse.json({ error: "Pick a card first" }, { status: 422 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image received" }, { status: 422 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "That image is over 25MB. Try a smaller export." },
      { status: 422 },
    );
  }
  if (!SIDES.includes(side)) {
    return NextResponse.json({ error: "Unknown side" }, { status: 422 });
  }

  const card = await getPastCard(cardSlug);
  if (!card) {
    return NextResponse.json({ error: "That card does not exist" }, { status: 404 });
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    // rotate() honours the EXIF orientation phones write, without which
    // a photo taken sideways stores sideways.
    const pipeline = sharp(input).rotate().resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });
    const bytes = await pipeline.webp({ quality: 82 }).toBuffer();
    const meta = await sharp(bytes).metadata();

    const sideLabel =
      side === "front"
        ? "front"
        : side === "back"
          ? "postage side"
          : "close-up of one ad";
    const alt = `${card.cardName ?? card.zoneName} Spotlight Postcard, ${card.mailMonth}, ${sideLabel}`;

    const id = await addCardImage({
      cardSlug,
      side,
      caption: caption || undefined,
      alt,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      mime: "image/webp",
      bytes,
      order: card.images.length,
    });

    for (const path of ["/gallery", `/cards/${cardSlug}`]) revalidatePath(path);
    return NextResponse.json({
      ok: true,
      id,
      width: meta.width,
      height: meta.height,
      kb: Math.round(bytes.length / 1024),
    });
  } catch (e) {
    console.error("[card-images] upload failed:", e);
    return NextResponse.json(
      { error: "Could not read that file as an image" },
      { status: 422 },
    );
  }
}

export async function PUT(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "A card is required" }, { status: 422 });
  }
  await savePastCard({
    slug,
    mcCardId: body.mcCardId ? String(body.mcCardId) : undefined,
    zoneSlug: String(body.zoneSlug ?? ""),
    zoneName: String(body.zoneName ?? ""),
    cardName: body.cardName ? String(body.cardName) : undefined,
    mailMonth: String(body.mailMonth ?? ""),
    mailDate: body.mailDate ? String(body.mailDate) : undefined,
    description: body.description ? String(body.description).slice(0, 600) : undefined,
    published: !!body.published,
  });
  for (const path of ["/gallery", `/cards/${slug}`, "/sitemap.xml"]) {
    revalidatePath(path);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get("imageId");
  const slug = searchParams.get("slug");

  if (imageId) {
    await deleteCardImage(Number(imageId));
  } else if (slug) {
    await deletePastCard(slug);
  } else {
    return NextResponse.json({ error: "Nothing to delete" }, { status: 422 });
  }
  revalidatePath("/gallery");
  if (slug) revalidatePath(`/cards/${slug}`);
  return NextResponse.json({ ok: true });
}
