import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * Admin bulk import. Accepts validated rows from the import UI and
 * writes them when a database is configured; in preview mode it
 * validates and reports what would be written. API routes return 401
 * JSON rather than redirecting.
 */

type AdvertiserRow = {
  businessName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  category?: string;
  zone?: string;
};

type CardRow = {
  zoneSlug?: string;
  mailMonth?: string;
  caption?: string;
  imageUrl: string;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 401 });
  }

  let body: { kind?: string; rows?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0 || rows.length > 500) {
    return NextResponse.json(
      { error: "Provide between 1 and 500 rows." },
      { status: 422 },
    );
  }

  if (body.kind === "advertisers") {
    const valid: AdvertiserRow[] = [];
    const errors: { row: number; problem: string }[] = [];
    rows.forEach((raw, i) => {
      const r = raw as Record<string, unknown>;
      const businessName = String(r.businessName ?? "").trim();
      const email = String(r.email ?? "").trim();
      if (businessName.length < 2) {
        errors.push({ row: i + 1, problem: "Missing business name" });
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: i + 1, problem: `Bad email: ${email}` });
        return;
      }
      valid.push({
        businessName,
        contactName: String(r.contactName ?? "").trim() || undefined,
        email: email || undefined,
        phone: String(r.phone ?? "").trim() || undefined,
        category: String(r.category ?? "").trim() || undefined,
        zone: String(r.zone ?? "").trim() || undefined,
      });
    });

    if (!process.env.DB_HOST) {
      return NextResponse.json({
        ok: true,
        preview: true,
        wouldImport: valid.length,
        errors,
      });
    }

    const { db } = await import("@/lib/db");
    const { businesses } = await import("@/lib/db/schema-legacy");
    let imported = 0;
    for (const v of valid) {
      await db.insert(businesses).values({
        businessName: v.businessName,
        slug: `${slugify(v.businessName)}-${Date.now().toString(36)}`,
        email: v.email,
        phone: v.phone,
        category: v.category,
        locationArea: v.zone,
        state: "SC",
        planType: "basic",
        isActive: true,
        isVerified: false, // imported listings go through review
        isHidden: false,
      });
      imported++;
    }
    return NextResponse.json({ ok: true, imported, errors });
  }

  if (body.kind === "cards") {
    const valid: CardRow[] = [];
    const errors: { row: number; problem: string }[] = [];
    rows.forEach((raw, i) => {
      const r = raw as Record<string, unknown>;
      const imageUrl = String(r.imageUrl ?? "").trim();
      if (!imageUrl) {
        errors.push({ row: i + 1, problem: "Missing image URL or filename" });
        return;
      }
      valid.push({
        imageUrl,
        zoneSlug: String(r.zoneSlug ?? "").trim() || undefined,
        mailMonth: String(r.mailMonth ?? "").trim() || undefined,
        caption: String(r.caption ?? "").trim() || undefined,
      });
    });

    if (!process.env.DB_HOST) {
      return NextResponse.json({
        ok: true,
        preview: true,
        wouldImport: valid.length,
        errors,
      });
    }

    const { db } = await import("@/lib/db");
    const { postcardGallery } = await import("@/lib/db/schema");
    let imported = 0;
    for (const v of valid) {
      await db.insert(postcardGallery).values({
        imageUrl: v.imageUrl,
        zoneSlug: v.zoneSlug,
        mailMonth: v.mailMonth,
        caption: v.caption,
      });
      imported++;
    }
    return NextResponse.json({ ok: true, imported, errors });
  }

  return NextResponse.json({ error: "Unknown import kind" }, { status: 422 });
}
