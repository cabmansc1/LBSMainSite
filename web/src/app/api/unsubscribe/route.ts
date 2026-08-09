import { NextResponse } from "next/server";
import { optOut, unsubscribeTokenValid } from "@/lib/newsletter-audience";
import { publicOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";

/**
 * Takes an address off the advertiser update.
 *
 * POST only, so a corporate link scanner opening URLs in incoming mail
 * cannot unsubscribe somebody who has not asked to be. The form on
 * /unsubscribe posts here and this sends the browser back there with the
 * outcome, which keeps the whole thing working with JavaScript off.
 *
 * Also accepts a JSON body, because RFC 8058 one-click unsubscribe posts
 * rather than gets, and a mail client honouring it should get the same
 * behaviour as somebody pressing the button.
 */
export async function POST(req: Request) {
  const origin = publicOrigin(req);
  let email = "";
  let token = "";

  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as {
      e?: unknown;
      t?: unknown;
    };
    email = String(body.e ?? "").trim();
    token = String(body.t ?? "");
  } else {
    const form = await req.formData().catch(() => null);
    email = String(form?.get("e") ?? "").trim();
    token = String(form?.get("t") ?? "");
  }

  const back = (params: string) =>
    NextResponse.redirect(`${origin}/unsubscribe?${params}`, { status: 303 });

  if (!email || !unsubscribeTokenValid(email, token)) {
    return back("");
  }

  const removed = await optOut(email);
  const q = new URLSearchParams({ e: email });
  q.set(removed ? "done" : "failed", "1");
  return back(q.toString());
}
