import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { savePost, setSignupStatus, type PostPatch } from "@/lib/admin-data";

/** Admin writes for blog posts and the directory signup queue. */
export async function POST(req: Request) {
  await requireAdmin();

  let body: { type?: string; [k: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    if (body.type === "post") {
      const patch = body.post as PostPatch;
      const id = body.id ? Number(body.id) : null;
      if (!patch?.title || !patch?.slug) {
        return NextResponse.json(
          { error: "A title and slug are required" },
          { status: 422 },
        );
      }
      if (!/^[a-z0-9-]+$/.test(patch.slug)) {
        return NextResponse.json(
          { error: "Slug can use lowercase letters, numbers, and dashes only" },
          { status: 422 },
        );
      }
      const result = await savePost(id, patch);
      revalidatePath("/blog");
      revalidatePath(`/blog/${patch.slug}`);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.type === "signup-status") {
      await setSignupStatus(Number(body.id), String(body.status));
      revalidatePath("/directory");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[admin] content write failed:", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
