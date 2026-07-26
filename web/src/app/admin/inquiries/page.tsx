import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { getInquiries } from "@/lib/admin-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Inquiries",
  robots: { index: false, follow: false },
};

const str = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);

/**
 * Successor to admin/inquiries.php. Same rows the advertiser portal will
 * later show each business, scoped to their own listing.
 */
export default async function AdminInquiriesPage() {
  await requireAdmin();
  const rows = await getInquiries();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[21px] font-bold tracking-[-0.02em]">Inquiries</h1>
        <p className="text-sm text-muted mt-1">
          Messages sent through directory listing contact forms.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted border border-line rounded-(--radius-card) bg-white px-4 py-8 text-center">
          No inquiries yet.
        </p>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div
              key={String(r.id)}
              className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-2"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <b className="text-[15px] font-semibold">{str(r.name)}</b>
                  <p className="text-[12.5px] text-muted mt-0.5">
                    <a
                      href={`mailto:${str(r.email)}`}
                      className="text-brand-deep hover:underline"
                    >
                      {str(r.email)}
                    </a>
                    {str(r.phone) ? ` · ${str(r.phone)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  {str(r.slug) !== "" && (
                    <Link
                      href={`/business/${str(r.slug)}`}
                      className="text-[13px] font-semibold text-brand-deep hover:underline"
                    >
                      {str(r.business_name)}
                    </Link>
                  )}
                  <p className="text-[12px] text-muted mt-0.5">
                    {str(r.created_at).slice(0, 16)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-body leading-relaxed whitespace-pre-line border-t border-line pt-2.5">
                {str(r.message)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
