import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  buildDraftFor,
  issueLabel,
  saveIssue,
  sendIssue,
  type IssueContent,
} from "@/lib/advertiser-newsletter";
import type { AudienceGroup } from "@/lib/newsletter-audience";

const GROUPS = new Set<AudienceGroup>([
  "current",
  "past",
  "directory",
  "leads",
]);

/** The advertiser update: build, edit, send. Admin only. */
export async function POST(req: Request) {
  await requireAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const action = String(body.action ?? "");

  if (action === "build") {
    const label = issueLabel(new Date());
    const result = await buildDraftFor(label);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    revalidatePath("/admin/newsletter");
    return NextResponse.json({ ok: true, ...result });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Which issue?" }, { status: 422 });
  }

  if (action === "send") {
    const report = await sendIssue(id);
    if (report.error) {
      return NextResponse.json({ error: report.error }, { status: 422 });
    }
    revalidatePath("/admin/newsletter");
    revalidatePath(`/admin/newsletter/${id}`);
    return NextResponse.json({ ok: true, ...report });
  }

  if (action === "cancel") {
    const result = await saveIssue(id, { status: "cancelled" });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    revalidatePath("/admin/newsletter");
    return NextResponse.json({ ok: true });
  }

  if (action === "save") {
    const raw = (body.content ?? {}) as Partial<IssueContent>;
    // Only the written parts are accepted. The assembled cards are the
    // record of what the site looked like when the issue was built, and
    // letting the form post them back would let a stale browser tab
    // overwrite that with whatever it was showing.
    const content: Partial<IssueContent> = {
      subject: String(raw.subject ?? ""),
      preheader: String(raw.preheader ?? ""),
      intro: String(raw.intro ?? ""),
      news: String(raw.news ?? ""),
      signoff: String(raw.signoff ?? ""),
      story: {
        title: String(raw.story?.title ?? ""),
        body: String(raw.story?.body ?? ""),
      },
    };
    const groups = Array.isArray(body.groups)
      ? (body.groups as unknown[])
          .map((g) => String(g))
          .filter((g): g is AudienceGroup => GROUPS.has(g as AudienceGroup))
      : undefined;
    const months = Number(body.leadsMonths);

    const result = await saveIssue(id, {
      content,
      groups,
      leadsMonths:
        Number.isFinite(months) && months >= 1 && months <= 120
          ? Math.round(months)
          : undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    revalidatePath(`/admin/newsletter/${id}`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
