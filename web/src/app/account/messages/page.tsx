import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPortalContext } from "@/lib/portal";
import { Card } from "@/components/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

export default async function AccountMessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { inquiries, listings } = await getPortalContext(session);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.025em]">Messages</h1>
        <p className="text-sm text-muted mt-1">
          People who contacted you through your directory listing.
        </p>
      </div>

      {inquiries.length === 0 ? (
        <Card className="p-6 grid gap-2">
          <p className="text-sm text-body">
            No messages yet. Enquiries sent from your listing page land here and
            in your email.
          </p>
          {listings[0] && (
            <a
              href={`/business/${listings[0].slug}`}
              className="text-[13px] font-semibold text-brand-deep hover:underline"
            >
              View your listing
            </a>
          )}
        </Card>
      ) : (
        <div className="grid gap-3">
          {inquiries.map((q) => (
            <Card key={q.id} className="p-5 grid gap-2">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <b className="text-[15px] font-semibold">{q.name}</b>
                  <p className="text-[12.5px] text-muted mt-0.5">
                    <a
                      href={`mailto:${q.email}`}
                      className="text-brand-deep hover:underline"
                    >
                      {q.email}
                    </a>
                    {q.phone ? ` · ${q.phone}` : ""}
                  </p>
                </div>
                <div className="text-right text-[12px] text-muted">
                  {q.createdAt?.slice(0, 16) ?? ""}
                  {listings.length > 1 && (
                    <div className="font-semibold">{q.businessName}</div>
                  )}
                </div>
              </div>
              <p className="text-sm text-body leading-relaxed whitespace-pre-line border-t border-line pt-2.5">
                {q.message}
              </p>
              <a
                href={`mailto:${q.email}?subject=Re: your enquiry`}
                className="text-[13px] font-semibold text-brand-deep hover:underline"
              >
                Reply by email
              </a>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
