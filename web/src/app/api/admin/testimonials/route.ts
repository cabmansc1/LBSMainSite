import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  deleteTestimonial,
  saveTestimonial,
  type Testimonial,
} from "@/lib/testimonials";

/**
 * Testimonial writes.
 *
 * Quotes appear on the home page, the pricing page and the zone pages,
 * all of which render per request, so there is nothing to revalidate
 * for those. The paths listed below are the cached ones.
 */
export async function POST(req: Request) {
  await requireAdmin();

  let body: { action?: string; testimonial?: Testimonial; id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "delete") {
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "Which one?" }, { status: 422 });
    }
    const ok = await deleteTestimonial(id);
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Could not remove it." }, { status: 500 });
  }

  if (body.action === "save") {
    const t = body.testimonial;
    if (!t || String(t.quote ?? "").trim().length < 10) {
      return NextResponse.json(
        { error: "A quote needs to be at least a sentence." },
        { status: 422 },
      );
    }
    const ok = await saveTestimonial({
      ...t,
      placements: Array.isArray(t.placements) ? t.placements : [],
    });
    if (!ok) {
      return NextResponse.json({ error: "Could not save it." }, { status: 500 });
    }
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
