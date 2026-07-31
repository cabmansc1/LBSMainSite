import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { GHL_SURFACES, sendSample, type GhlSurface } from "@/lib/ghl-sample";

/**
 * Fires a sample payload at GoHighLevel so an inbound webhook trigger
 * has something to map fields against. Admin only, and it never touches
 * the database: nothing here creates a lead, an order or a subscriber.
 */
export async function POST(req: Request) {
  await requireAdmin();

  let body: { surface?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const surface = String(body.surface ?? "") as GhlSurface;
  if (!GHL_SURFACES.includes(surface)) {
    return NextResponse.json(
      { error: `Pick one of: ${GHL_SURFACES.join(", ")}` },
      { status: 422 },
    );
  }

  const result = await sendSample(surface);
  // ok means the request was made and answered, not that GoHighLevel did
  // anything useful with it. An inbound webhook returns 200 the moment it
  // receives a request, whether or not the workflow behind it is
  // published or has an action, which is exactly the confusion this tool
  // exists to clear up.
  return NextResponse.json({ ok: true, ...result });
}
