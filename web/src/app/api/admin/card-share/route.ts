import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { shareCardToFacebook } from "@/lib/facebook";

/**
 * Share one mailed card to the Facebook Page.
 *
 * Deliberately not a cron. Everything else about a mailing is automatic
 * by the time it gets here, but a post to the Page is public the
 * instant it lands and cannot be un-seen, so it waits for somebody to
 * press the button and read the caption first.
 */
export async function POST(req: Request) {
  await requireAdmin();

  const body = (await req.json().catch(() => null)) as {
    slug?: string;
    message?: string;
    allowRepost?: boolean;
  } | null;

  const slug = body?.slug?.trim();
  if (!slug) return NextResponse.json({ ok: false, error: "Missing card." }, { status: 400 });

  const result = await shareCardToFacebook(slug, {
    message: body?.message,
    allowRepost: body?.allowRepost === true,
  });

  // The gallery admin is force-dynamic and updates its own row from this
  // response, so there is nothing to revalidate.
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
