import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { resetBlock, saveBlock } from "@/lib/blocks";

/** Which page each block key belongs to, for cache busting after a save. */
const PATH_FOR: Record<string, string> = {
  home: "/",
  advertise: "/advertise",
};

/** Editable page copy. Admin only. */
export async function POST(req: Request) {
  const admin = await requireAdmin();

  let body: { action?: unknown; page?: unknown; key?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const page = String(body.page ?? "");
  const key = String(body.key ?? "");
  if (!page || !key) {
    return NextResponse.json({ error: "Which block?" }, { status: 422 });
  }

  // Whose edit it was. The screen shows this beside the block so a
  // surprising change on the homepage has a name against it.
  const by = admin.email ?? "";

  const result =
    body.action === "reset"
      ? await resetBlock(page, key)
      : await saveBlock(page, key, String(body.value ?? ""), by);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const path = PATH_FOR[page];
  if (path) revalidatePath(path);
  return NextResponse.json({ ok: true });
}
