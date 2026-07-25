import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Inbound webhook for Mission Control: when inventory, deadlines, or
 * card status change over there, MC calls this and the site's cached
 * availability refreshes immediately instead of waiting out the
 * 60-second revalidation window.
 *
 * Authenticated by shared secret header: x-mc-secret: $MC_WEBHOOK_SECRET
 */
export async function POST(req: Request) {
  const secret = process.env.MC_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  if (req.headers.get("x-mc-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { type?: string; zoneSlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Any inventory-shaped event refreshes the pages that show counts.
  revalidatePath("/mailing-calendar");
  revalidatePath("/coverage-map");
  if (body.zoneSlug) {
    revalidatePath(`/${body.zoneSlug}-direct-mail-marketing`);
    revalidatePath(`/postcards/${body.zoneSlug}/checkout`);
  }

  return NextResponse.json({ ok: true, refreshed: body.type ?? "inventory" });
}
