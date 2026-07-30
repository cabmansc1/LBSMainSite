import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { saveSetting, saveSiteStat, deleteSiteStat } from "@/lib/admin-data";
import { PRICING_KEY } from "@/lib/pricing-store";
import {
  DIRECTORY_PRICING_KEY,
  MAX_DIRECTORY_PRICE_CENTS,
} from "@/lib/directory-pricing";
import { setCardOrientation, type Orientation } from "@/lib/card-capacity";
import { CARD_DESCRIPTION_MAX, setCardDescription } from "@/lib/card-details";

/**
 * Admin writes for editable site settings: postcard pricing and the
 * homepage stats bar. Pricing changes revalidate the pages that quote
 * prices so the site updates without a deploy.
 */
export async function POST(req: Request) {
  await requireAdmin();

  let body: { type?: string; [k: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    if (body.type === "pricing") {
      const overrides = body.overrides as Record<
        string,
        Record<string, number>
      >;
      // Reject anything that is not a positive whole number of cents.
      for (const reach of Object.values(overrides ?? {})) {
        for (const cents of Object.values(reach ?? {})) {
          // Zero is allowed: it means the size is not sold at that reach.
          if (!Number.isInteger(cents) || cents < 0 || cents > 10_000_00) {
            return NextResponse.json(
              { error: "Prices must be between $0 and $10,000" },
              { status: 422 },
            );
          }
        }
      }
      await saveSetting(PRICING_KEY, overrides);
      for (const path of ["/pricing", "/advertise", "/roi-calculator", "/compare"]) {
        revalidatePath(path);
      }
      return NextResponse.json({ ok: true });
    }

    if (body.type === "directory-pricing") {
      const monthlyCents = Number(body.monthlyCents);
      const annualCents = Number(body.annualCents);
      for (const cents of [monthlyCents, annualCents]) {
        // Zero is allowed and means that term is not sold, the same as
        // taking an ad size off sale.
        if (
          !Number.isInteger(cents) ||
          cents < 0 ||
          cents > MAX_DIRECTORY_PRICE_CENTS
        ) {
          return NextResponse.json(
            { error: "Prices must be between $0 and $1,000" },
            { status: 422 },
          );
        }
      }
      await saveSetting(DIRECTORY_PRICING_KEY, { monthlyCents, annualCents });
      // Everywhere the Premium price is quoted.
      for (const path of ["/directory-signup", "/register"]) {
        revalidatePath(path);
      }
      return NextResponse.json({ ok: true });
    }

    if (body.type === "stat") {
      const stat = body.stat as Parameters<typeof saveSiteStat>[0];
      if (!stat?.key || !stat?.label) {
        return NextResponse.json(
          { error: "A key and label are required" },
          { status: 422 },
        );
      }
      await saveSiteStat(stat);
      revalidatePath("/");
      return NextResponse.json({ ok: true });
    }

    if (body.type === "card-description") {
      const cardId = String(body.cardId ?? "");
      if (!cardId) {
        return NextResponse.json({ error: "A card is required" }, { status: 422 });
      }
      const description = String(body.description ?? "");
      if (description.length > CARD_DESCRIPTION_MAX) {
        return NextResponse.json(
          { error: `Keep it under ${CARD_DESCRIPTION_MAX} characters` },
          { status: 422 },
        );
      }
      await setCardDescription(cardId, description);
      // The description shows anywhere a card is offered.
      for (const path of ["/pricing", "/coverage-map", "/mailing-calendar"]) {
        revalidatePath(path);
      }
      return NextResponse.json({ ok: true });
    }

    if (body.type === "card-orientation") {
      const cardId = String(body.cardId ?? "");
      const orientation = String(body.orientation ?? "") as Orientation;
      if (!cardId || !["horizontal", "vertical"].includes(orientation)) {
        return NextResponse.json(
          { error: "A card and orientation are required" },
          { status: 422 },
        );
      }
      await setCardOrientation(cardId, orientation);
      // Capacity feeds availability everywhere a card is sold.
      for (const path of ["/coverage-map", "/mailing-calendar"]) {
        revalidatePath(path);
      }
      return NextResponse.json({ ok: true });
    }

    if (body.type === "stat-delete") {
      await deleteSiteStat(Number(body.id));
      revalidatePath("/");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown setting" }, { status: 400 });
  } catch (e) {
    console.error("[admin] settings write failed:", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
