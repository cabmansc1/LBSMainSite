import { NextResponse } from "next/server";
import { submitEvent } from "@/lib/events";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/events-types";
import { sendAlertEmail } from "@/lib/email";
import { siteOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";

const CATEGORIES = new Set(EVENT_CATEGORIES.map((c) => c.value));

/** Rough shape only. Real validation is a human reading it. */
const looksLikeEmail = (s: string) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(s);

/**
 * Anybody can put an event forward. Nobody can publish one.
 *
 * The status is never read from the request, so no amount of extra
 * fields in the body can get something onto the site: submitEvent
 * always files it as pending and the admin decides.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

  const title = str(body.title, 200);
  const startsAt = str(body.startsAt, 40);
  const email = str(body.email, 191).toLowerCase();

  if (title.length < 3) {
    return NextResponse.json(
      { error: "What is the event called?" },
      { status: 422 },
    );
  }
  if (!startsAt || isNaN(new Date(startsAt).getTime())) {
    return NextResponse.json(
      { error: "When does it start?" },
      { status: 422 },
    );
  }
  if (!looksLikeEmail(email)) {
    return NextResponse.json(
      { error: "Leave an email so we can come back to you with questions." },
      { status: 422 },
    );
  }

  // A honeypot. Real people never fill in a field they cannot see, and
  // this answers as though it worked rather than telling a bot what
  // gave it away.
  if (str(body.website, 200)) {
    return NextResponse.json({ ok: true });
  }

  const category = str(body.category, 24);

  const result = await submitEvent({
    title,
    startsAt,
    endsAt: str(body.endsAt, 40),
    allDay: body.allDay === true,
    venueName: str(body.venueName, 200),
    address: str(body.address),
    placeSlug: str(body.placeSlug, 80),
    category: (CATEGORIES.has(category as EventCategory)
      ? category
      : "community") as EventCategory,
    summary: str(body.summary, 600),
    url: str(body.url, 500),
    email,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  // Told rather than discovered. A submission nobody knows about sits
  // in the queue until somebody happens to look, which for a dated
  // event means until it is too late to be worth publishing.
  await sendAlertEmail("event_submission", {
    subject: `Event submitted: ${title}`,
    text: [
      `${title}`,
      startsAt,
      str(body.venueName, 200),
      "",
      `From ${email}`,
      "",
      "Nothing is public until you approve it.",
      `${siteOrigin()}/admin/events/${result.id}`,
    ]
      .filter(Boolean)
      .join("\n"),
    replyTo: email,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
