import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import {
  getIssue,
  personalIndex,
  renderIssue,
} from "@/lib/advertiser-newsletter";
import { buildAudience } from "@/lib/newsletter-audience";
import { AdminNewsletterEditor } from "@/components/admin-newsletter-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Advertiser update",
  robots: { index: false, follow: false },
};

/**
 * One issue: what it says, who gets it, and what it looks like to them.
 *
 * The preview is the point of this screen. Andrew's worry about a
 * personalised email was that it would show one advertiser's business to
 * another, and the only way to settle that is to let him read the actual
 * email as any recipient on the list. Picking a different person redraws
 * it from their cards alone.
 */
export default async function AdminNewsletterIssuePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { as } = await searchParams;

  const issue = await getIssue(Number(id));
  if (!issue) notFound();

  const [audience, personal] = await Promise.all([
    buildAudience(issue.groups, issue.leadsMonths),
    personalIndex(),
  ]);

  // Preview as whoever was asked for, else the first person who actually
  // has cards, because the personalised block is the part worth checking
  // and a recipient with no cards would not show it at all.
  const chosen =
    audience.recipients.find((r) => r.email === (as ?? "").toLowerCase()) ??
    audience.recipients.find((r) => (personal.get(r.email) ?? []).length > 0) ??
    audience.recipients[0];

  const preview = chosen
    ? renderIssue(issue.content, chosen, personal.get(chosen.email) ?? [])
    : undefined;

  // Enough to choose from without rendering a select box with a thousand
  // options in it. Anyone with cards first, since those are the copies
  // worth reading.
  const pickable = [...audience.recipients]
    .sort((a, b) => {
      const ac = (personal.get(a.email) ?? []).length;
      const bc = (personal.get(b.email) ?? []).length;
      return bc - ac || a.businessName.localeCompare(b.businessName);
    })
    .slice(0, 40);

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <p className="text-[13px] mb-3">
        <Link href="/admin/newsletter" className="text-brand-deep font-semibold">
          &larr; All issues
        </Link>
      </p>

      <div className="mb-5 max-w-[74ch]">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">
          {issue.content.subject}
        </h1>
        <p className="text-sm text-muted mt-1 num">Built for {issue.builtFor}</p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        <AdminNewsletterEditor
          issue={issue}
          counts={audience.counts}
          total={audience.recipients.length}
          suppressed={audience.suppressed}
          mcReadable={audience.mcReadable}
          previewAs={chosen?.email}
        />

        <div className="lg:sticky lg:top-6 grid gap-2.5">
          <b className="text-[15px]">Read it as</b>
          {pickable.length === 0 ? (
            <p className="text-[13px] text-muted">
              Nobody is on the list yet, so there is nothing to preview.
            </p>
          ) : (
            <>
              <form method="get" className="grid gap-2">
                <select
                  name="as"
                  defaultValue={chosen?.email ?? ""}
                  className="w-full text-[13px] px-3 py-2 border border-line-strong rounded-[10px] bg-white"
                >
                  {pickable.map((r) => {
                    const n = (personal.get(r.email) ?? []).length;
                    return (
                      <option key={r.email} value={r.email}>
                        {r.businessName || r.email}
                        {n ? ` (${n} ${n === 1 ? "card" : "cards"})` : ""}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="submit"
                  className="justify-self-start text-[13px] font-semibold px-3.5 py-2 rounded-[9px] border border-line-strong bg-white"
                >
                  Show me
                </button>
              </form>

              {preview && (
                <>
                  <p className="text-[12px] text-muted num">
                    To {chosen?.email}
                  </p>
                  {/* Sandboxed, and rendered from our own generator rather
                      than anything a recipient supplied. The iframe is here
                      so the email's own styles cannot leak into the admin. */}
                  <iframe
                    title="Email preview"
                    srcDoc={preview.html}
                    sandbox=""
                    className="w-full h-[560px] border border-line rounded-(--radius-card) bg-white"
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
