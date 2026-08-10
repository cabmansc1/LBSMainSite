import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { buildRoundup, generateRoundup, weekendWindow } from "@/lib/event-roundup";

export const dynamic = "force-dynamic";

/** What next weekend looks like, without writing anything. */
export async function GET() {
  await requireAdmin();
  const window = weekendWindow();
  const draft = await buildRoundup(window);
  return NextResponse.json({
    span: window.span,
    count: draft.count,
    groups: draft.groups,
    title: draft.title,
  });
}

export async function POST() {
  await requireAdmin();
  const result = await generateRoundup();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  return NextResponse.json(result);
}
