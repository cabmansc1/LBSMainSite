import { after, NextResponse } from "next/server";
import { getBusiness, usingSampleData } from "@/lib/directory";

/**
 * Business inquiry endpoint. Fixes the legacy business.php form, which
 * accepted unauthenticated POSTs with no validation or spam control:
 * here we validate shape, drop honeypot hits silently, and only write
 * when a database is configured. Email notification and reCAPTCHA
 * attach in the commerce phase alongside the other outbound mail.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot filled means bot: pretend success, store nothing.
  if (typeof body.company_website === "string" && body.company_website !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const message = String(body.message ?? "").trim();
  const businessSlug = String(body.businessSlug ?? "").trim();

  if (
    name.length < 1 ||
    name.length > 128 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    message.length < 10 ||
    message.length > 2000
  ) {
    return NextResponse.json(
      { error: "Please fill out every field correctly." },
      { status: 422 },
    );
  }

  const business = await getBusiness(businessSlug);
  if (!business) {
    return NextResponse.json({ error: "Unknown business" }, { status: 404 });
  }

  if (usingSampleData()) {
    // No database configured (preview mode): accept and discard.
    return NextResponse.json({ ok: true, preview: true });
  }

  const { db } = await import("@/lib/db");
  const { businessInquiries } = await import("@/lib/db/schema-legacy");
  await db.insert(businessInquiries).values({
    businessId: business.id,
    name,
    email,
    message,
  });

  // After the response, so the person who filled in the form is not kept
  // waiting on a mail server. Before this, nothing was sent at all: the
  // row was written and everybody involved was left to find out by
  // looking, which for the business meant never.
  after(async () => {
    const { businessNotifyEmail } = await import("@/lib/inquiries");
    const { sendInquiryEmails } = await import("@/lib/inquiry-emails");
    await sendInquiryEmails({
      businessName: business.name,
      businessEmail: await businessNotifyEmail(business.id),
      businessSlug: business.slug,
      fromName: name,
      fromEmail: email,
      message,
    });

    const { recordActivity } = await import("@/lib/admin-activity");
    await recordActivity({
      kind: "inquiry",
      title: `${name} messaged ${business.name}`,
      detail: message.slice(0, 200),
      href: "/admin/inquiries",
    });
  });

  return NextResponse.json({ ok: true });
}
