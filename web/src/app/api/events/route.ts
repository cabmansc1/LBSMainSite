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
 * Smaller than the admin's 15MB.
 *
 * An admin uploading a raw camera file is a known person doing a known
 * thing. An anonymous form is a place people point scripts at, and a
 * poster or a phone photograph is comfortably under this.
 */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * Anybody can put an event forward. Nobody can publish one.
 *
 * The status is never read from the request, so no amount of extra
 * fields in the body can get something onto the site: submitEvent
 * always files it as pending and the admin decides.
 *
 * Takes either JSON or multipart. Multipart is what the form sends now
 * that it carries a picture; JSON is still accepted because it is the
 * shape anything scripted would reach for, and refusing it would buy
 * nothing.
 */
export async function POST(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};
  let file: File | null = null;

  if (type.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    for (const [k, v] of form.entries()) {
      if (v instanceof File) {
        if (k === "image" && v.size > 0) file = v;
      } else {
        body[k] = v;
      }
    }
    // Checkboxes arrive as strings through form data.
    body.allDay = body.allDay === "true" || body.allDay === "on";
  } else {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
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
    return NextResponse.json({ error: "When does it start?" }, { status: 422 });
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

  /*
   * The picture, if there is one.
   *
   * Checked before it is decoded, then re-encoded to WebP by the media
   * library, which is what makes taking a file from a stranger safe:
   * whatever was in the original does not survive being read as pixels
   * and written back out. A failure here never fails the submission —
   * losing the event over a bad photograph would be the wrong trade.
   */
  let heroMediaId: number | null = null;
  if (file) {
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "That image is over 8MB. Try a smaller one." },
        { status: 413 },
      );
    }
    if (file.type && !ALLOWED_IMAGE.has(file.type)) {
      return NextResponse.json(
        { error: "Use a JPEG, PNG, WebP, GIF or AVIF." },
        { status: 415 },
      );
    }
    try {
      const { saveMedia } = await import("@/lib/media");
      const saved = await saveMedia(Buffer.from(await file.arrayBuffer()), {
        alt: title,
        credit: email,
      });
      if (!("error" in saved)) heroMediaId = saved.id;
    } catch (e) {
      console.error("[events] submitted image failed:", e);
    }
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
    priceText: str(body.priceText, 120),
    heroMediaId,
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
      heroMediaId ? "They sent a picture." : "",
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
