import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { saveSetting, saveSiteStat, deleteSiteStat } from "@/lib/admin-data";
import { PRICING_KEY } from "@/lib/pricing-store";

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
          if (!Number.isInteger(cents) || cents <= 0 || cents > 10_000_00) {
            return NextResponse.json(
              { error: "Prices must be between $1 and $10,000" },
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
