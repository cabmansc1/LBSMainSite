import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  deleteEvent,
  repeatWeekly,
  saveEvent,
  setEventStatus,
  type EventPatch,
} from "@/lib/events";
import { EVENT_CATEGORIES, type EventCategory, type EventStatus } from "@/lib/events-types";

const CATEGORIES = new Set(EVENT_CATEGORIES.map((c) => c.value));

/** Events: write, approve, repeat, remove. Admin only. */
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

  // Nothing public renders an event any more, so the admin list is the
  // only thing left to refresh.
  const bust = () => {
    revalidatePath("/admin/events");
  };

  if (action === "status") {
    if (!id) return NextResponse.json({ error: "Which event?" }, { status: 422 });
    const result = await setEventStatus(id, String(body.status) as EventStatus);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    bust();
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    if (!id) return NextResponse.json({ error: "Which event?" }, { status: 422 });
    const result = await deleteEvent(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    bust();
    return NextResponse.json({ ok: true });
  }

  if (action === "repeat") {
    if (!id) return NextResponse.json({ error: "Which event?" }, { status: 422 });
    const result = await repeatWeekly(id, Number(body.weeks ?? 4));
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    bust();
    return NextResponse.json({ ok: true, made: result.made });
  }

  const asInt = (v: unknown) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
  const category = str(body.category, 24);

  const patch: EventPatch = {
    title: str(body.title, 200),
    summary: str(body.summary, 600),
    bodyHtml: String(body.bodyHtml ?? ""),
    heroMediaId: asInt(body.heroMediaId),
    startsAt: str(body.startsAt, 40),
    endsAt: str(body.endsAt, 40),
    allDay: body.allDay === true,
    venueName: str(body.venueName, 200),
    address: str(body.address),
    placeSlug: str(body.placeSlug, 80),
    businessId: asInt(body.businessId),
    category: (CATEGORIES.has(category as EventCategory)
      ? category
      : "community") as EventCategory,
    url: str(body.url, 500),
    ticketUrl: str(body.ticketUrl, 500),
    priceText: str(body.priceText, 120),
    status: String(body.status ?? "pending") as EventStatus,
    featured: body.featured === true,
  };

  const result = await saveEvent(id, patch);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  bust();
  return NextResponse.json({ ok: true, id: result.id, slug: result.slug });
}
