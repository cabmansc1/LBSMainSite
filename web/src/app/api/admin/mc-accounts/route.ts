import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createLoginsFor, createListingsFor } from "@/lib/mc-accounts";

/**
 * Creates logins and listings for existing Mission Control customers.
 *
 * The request carries only which addresses to act on. Everything written
 * about them is re-read from Mission Control on the server, so a tampered
 * payload can name an address but cannot invent the business filed under
 * it.
 *
 * Nothing here sends email. These are paying customers, which makes a
 * careless bulk send more expensive than usual, so contacting them stays
 * a separate decision.
 */
export async function POST(req: Request) {
  await requireAdmin();

  let body: { action?: unknown; emails?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const emails = Array.isArray(body.emails)
    ? body.emails.map((e) => String(e ?? "").trim()).filter(Boolean)
    : [];
  if (emails.length === 0) {
    return NextResponse.json({ error: "Nobody selected" }, { status: 422 });
  }

  const action = String(body.action ?? "");
  if (action !== "create-logins" && action !== "create-listings") {
    return NextResponse.json({ error: "Unknown action" }, { status: 422 });
  }

  try {
    const result =
      action === "create-logins"
        ? await createLoginsFor(emails)
        : await createListingsFor(emails);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error(`[admin] mc-accounts ${action} failed:`, e);
    return NextResponse.json({ error: "That did not finish" }, { status: 500 });
  }
}
