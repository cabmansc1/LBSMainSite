import { after, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, isImpersonating } from "@/lib/auth";
import {
  FIELD_LABELS,
  claimListing,
  getListingForAccount,
  saveListingEdits,
  type EditableField,
} from "@/lib/listing-edits";
import { getHours, saveHours, type DayHours } from "@/lib/business-hours";
import {
  WRITES_BLOCKED_MESSAGE,
  directoryWritesBlocked,
  logBlockedWrite,
} from "@/lib/write-guard";

/**
 * An advertiser's own directory listing.
 *
 * Everything is scoped through getListingForAccount, which resolves the
 * id against the signed-in session. An id in the request body is only
 * ever a lookup key, never authorization: passing somebody else's finds
 * nothing.
 *
 * Two things happen here. Claiming links a listing that matched on
 * email to this login. Saving splits the edit, publishing the harmless
 * fields immediately and queueing the ones that decide where a listing
 * appears. See lib/listing-edits.ts for which is which and why.
 */

/** The public pages an edit can change. */
function publish(slug: string) {
  revalidatePath("/directory");
  if (slug) revalidatePath(`/business/${slug}`);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  // Support can look, not touch. Editing a customer's public listing
  // from inside their account is exactly what impersonation must not
  // make easy; an admin who genuinely needs to change it has the admin
  // screens, where the change is theirs rather than the customer's.
  if (isImpersonating(session)) {
    return NextResponse.json(
      { error: "You are viewing as this advertiser. Stop to make changes." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Before anything is looked up, so a staging click cannot edit a real
  // business's page. Logged rather than dropped, so what would have
  // been written is still reviewable.
  if (directoryWritesBlocked()) {
    logBlockedWrite("advertiser listing write", { by: session.email, body });
    return NextResponse.json({ error: WRITES_BLOCKED_MESSAGE }, { status: 503 });
  }

  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "A listing id is required" }, { status: 422 });
  }

  // "Not yours" and "we could not ask" must not answer the same way.
  // Telling somebody their listing does not exist because the database
  // was unreachable is how a support call starts.
  let listing;
  try {
    listing = await getListingForAccount(session, id);
  } catch (e) {
    console.error("[account] listing lookup failed:", e);
    return NextResponse.json(
      { error: "We could not reach your listing just now." },
      { status: 500 },
    );
  }
  if (!listing) {
    return NextResponse.json({ error: "We could not find that listing." }, { status: 404 });
  }

  if (body.action === "claim") {
    const result = await claimListing(session, id).catch((e) => {
      console.error("[account] claim failed:", e);
      return { ok: false as const, error: "We could not claim that just now." };
    });
    return result.ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: result.error }, { status: 409 });
  }

  // Editing needs the listing to actually be theirs. An unclaimed one
  // has exactly one action available, and it is the button above.
  if (!listing.owned) {
    return NextResponse.json(
      { error: "Claim this listing before editing it." },
      { status: 403 },
    );
  }

  const fields =
    body.fields && typeof body.fields === "object"
      ? (body.fields as Record<string, unknown>)
      : {};
  const hours = Array.isArray(body.hours) ? (body.hours as DayHours[]) : undefined;

  let result;
  try {
    result = await saveListingEdits(session, listing, fields);
  } catch (e) {
    console.error("[account] listing save failed:", e);
    return NextResponse.json({ error: "We could not save that just now." }, { status: 500 });
  }

  const errors = Object.entries(result.errors) as [EditableField, string][];
  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: errors[0][1],
        fields: Object.fromEntries(errors),
      },
      { status: 422 },
    );
  }

  // Hours are their own table, so they save separately. They go last:
  // a failure here should not roll back an edit that has already been
  // published, and the advertiser is told which part did not land.
  let hoursSaved = false;
  if (hours) {
    // Whether this listing had any hours before it saved these ones.
    const had = (await getHours(listing.id)).length > 0;

    const saved = await saveHours(listing.id, hours);
    if (!saved.ok) {
      if (result.published.length > 0) publish(result.slug);
      return NextResponse.json({ error: saved.error }, { status: 422 });
    }
    hoursSaved = true;

    // Filling in a week of opening times for the first time is somebody
    // saying they want them shown. show_hours is a legacy column whose
    // default a listing inherits without ever being asked, so leaving it
    // to a checkbox meant the work could be saved and silently hidden.
    // The toggle still turns them off afterwards; it just stops being
    // the thing that has to be discovered first.
    if (!had && hours.some((d) => !d.closed)) {
      const { updateBusiness } = await import("@/lib/admin-data");
      await updateBusiness(listing.id, { showHours: true });
    }
  }

  if (result.published.length > 0 || hoursSaved) publish(result.slug);

  // After the response, and as one message rather than one per field.
  // Somebody correcting their name and their category in the same save
  // is doing one thing, and two emails about it would read as two
  // requests to go and look at.
  if (result.queued.length > 0) {
    after(async () => {
      const { sendQueuedAlert } = await import("@/lib/listing-emails");
      await sendQueuedAlert({
        businessName: listing.name,
        slug: listing.slug,
        advertiserEmail: session.email,
        changes: result.queued,
        siteOrigin: process.env.SITE_ORIGIN?.trim() || undefined,
      });
    });
  }

  return NextResponse.json({
    ok: true,
    published: result.published.map((f) => FIELD_LABELS[f]),
    queued: result.queued.map((q) => FIELD_LABELS[q.field]),
    hoursSaved,
  });
}
