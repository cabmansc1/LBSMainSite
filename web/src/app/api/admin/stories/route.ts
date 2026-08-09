import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  deleteStory,
  saveStory,
  setStoryStatus,
  type StoryBusiness,
  type StoryKind,
  type StoryPatch,
  type StoryStatus,
} from "@/lib/stories";

/** Stories: write, publish, remove. Admin only. */
export async function POST(req: Request) {
  await requireAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const action = String(body.action ?? "save");
  const rawId = Number(body.id);
  const id = Number.isInteger(rawId) && rawId > 0 ? rawId : null;

  const bust = (slug?: string) => {
    for (const p of ["/stories", "/sitemap.xml", "/"]) revalidatePath(p);
    if (slug) revalidatePath(`/stories/${slug}`);
  };

  if (action === "status") {
    if (!id) return NextResponse.json({ error: "Which story?" }, { status: 422 });
    const result = await setStoryStatus(id, String(body.status) as StoryStatus);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    bust(typeof body.slug === "string" ? body.slug : undefined);
    revalidatePath("/admin/stories");
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    if (!id) return NextResponse.json({ error: "Which story?" }, { status: 422 });
    const result = await deleteStory(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    bust(typeof body.slug === "string" ? body.slug : undefined);
    revalidatePath("/admin/stories");
    return NextResponse.json({ ok: true });
  }

  const asInt = (v: unknown) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  const patch: StoryPatch = {
    title: String(body.title ?? ""),
    kind: String(body.kind ?? "news") as StoryKind,
    dek: String(body.dek ?? ""),
    bodyHtml: String(body.bodyHtml ?? ""),
    heroMediaId: asInt(body.heroMediaId),
    status: String(body.status ?? "draft") as StoryStatus,
    publishedAt: String(body.publishedAt ?? ""),
    featuredRank: (() => {
      const n = Number(body.featuredRank);
      // Zero is a legitimate rank and would be lost by a truthiness
      // check, so only a genuinely absent or unparseable value is null.
      return Number.isFinite(n) && String(body.featuredRank ?? "") !== ""
        ? Math.max(0, Math.round(n))
        : null;
    })(),
    sponsored: body.sponsored === true,
    sponsorBusinessId: asInt(body.sponsorBusinessId),
    metaTitle: String(body.metaTitle ?? ""),
    metaDescription: String(body.metaDescription ?? ""),
    places: Array.isArray(body.places)
      ? (body.places as unknown[]).map((p) => String(p).trim()).filter(Boolean)
      : [],
    businesses: Array.isArray(body.businesses)
      ? (body.businesses as unknown[]).flatMap((b) => {
          const rec = b as { businessId?: unknown; role?: unknown };
          const bid = asInt(rec.businessId);
          if (!bid) return [];
          return [
            {
              businessId: bid,
              role: rec.role === "mentioned" ? "mentioned" : "subject",
            } satisfies StoryBusiness,
          ];
        })
      : [],
  };

  const result = await saveStory(id, patch);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  bust(result.slug);
  revalidatePath("/admin/stories");
  return NextResponse.json({ ok: true, id: result.id, slug: result.slug });
}
