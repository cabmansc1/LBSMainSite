import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  createPlace,
  movePlace,
  setPlaceActive,
  updatePlace,
  type PlaceKind,
  type PlacePatch,
} from "@/lib/places";

/** Markets, zones and neighbourhoods. Admin only. */
export async function POST(req: Request) {
  await requireAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const id = Number(body.id);
  const needsId = action === "update" || action === "active" || action === "move";
  if (needsId && (!Number.isInteger(id) || id <= 0)) {
    return NextResponse.json({ error: "Which place?" }, { status: 422 });
  }

  // An empty string from a <select> means "none", not the empty slug.
  const orNull = (v: unknown) => {
    const s = String(v ?? "").trim();
    return s ? s : null;
  };

  const patch: PlacePatch = {
    name: String(body.name ?? ""),
    kind: String(body.kind ?? "neighborhood") as PlaceKind,
    parentSlug: orNull(body.parentSlug),
    blurb: String(body.blurb ?? ""),
    mailingZoneSlug: orNull(body.mailingZoneSlug),
    directorySlug: orNull(body.directorySlug),
    active: body.active !== false,
  };

  const result =
    action === "create"
      ? await createPlace(String(body.name ?? ""), patch)
      : action === "update"
        ? await updatePlace(id, patch)
        : action === "active"
          ? await setPlaceActive(id, body.active !== false)
          : action === "move"
            ? await movePlace(id, body.direction === "up" ? "up" : "down")
            : ({ ok: false, error: "Unknown action" } as const);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  // Nothing public reads places yet, so this is only the homepage market
  // chips once they land. Listed now so the next person adding a page
  // that reads places finds the habit already here.
  for (const path of ["/", "/sitemap.xml"]) revalidatePath(path);
  return NextResponse.json({ ok: true });
}
