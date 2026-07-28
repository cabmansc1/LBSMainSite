import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPortalContext } from "@/lib/portal";
import { Card } from "@/components/sections";
import { ProfileGaps } from "@/components/profile-gaps";
import { missingProfileFields } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

const money = (cents?: number) =>
  cents === undefined ? null : `$${(cents / 100).toLocaleString("en-US")}`;

/** Launchpad: what needs attention, a few figures, recent activity. */
export default async function AccountHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const ctx = await getPortalContext(session);
  // Contact details checkout let them skip. Asked for here, where the
  // sale is banked and a form field costs nothing.
  const gaps = await missingProfileFields(session.email).catch(() => []);

  const business = ctx.listings[0];
  const nextCard = [...ctx.currentCards].sort((a, b) =>
    a.mailDateIso.localeCompare(b.mailDateIso),
  )[0];

  const stats = [
    {
      label: "Tentative mail date",
      value: nextCard?.mailMonth ?? "None booked",
      note: nextCard ? `${nextCard.zoneName} card` : "Reserve a spot to start",
      due: !!nextCard,
    },
    {
      label: "Running cards",
      value: String(ctx.currentCards.length),
      note: ctx.currentCards.map((c) => c.zoneName).join(", ") || "Nothing running",
    },
    {
      label: "Messages",
      value: String(ctx.inquiries.length),
      note: ctx.inquiries.length ? "From your listing" : "No enquiries yet",
    },
    {
      label: "Cards run",
      value: String(ctx.pastCards.length),
      note: ctx.pastCards.length ? "Mailed to date" : "None yet",
    },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.025em]">
          Welcome back{session.firstName ? `, ${session.firstName}` : ""}
        </h1>
        <p className="text-sm text-muted mt-1">
          {business ? `Managing ${business.name}.` : "Here is your account."}
        </p>
      </div>

      <ProfileGaps fields={gaps} />

      {ctx.warnings.map((w) => (
        <p
          key={w}
          className="mb-4 text-[13px] text-body bg-surface border border-line rounded-[10px] px-4 py-2.5"
        >
          {w}
        </p>
      ))}

      {ctx.listings.length === 0 && ctx.warnings.length === 0 && (
        <Card className="p-6 grid gap-2 mb-4 border-l-[3px] border-l-cta bg-cta-tint">
          <h2 className="text-[15.5px] font-bold">No listing linked yet</h2>
          <p className="text-sm text-body">
            We could not find a directory listing for {session.email}. If your
            business is already listed, contact us and we will connect it to
            this login.
          </p>
          <Link
            href="/contact"
            className="text-[13px] font-semibold text-brand-deep hover:underline"
          >
            Get this sorted
          </Link>
        </Card>
      )}

      {nextCard && (
        <Card className="p-6 flex gap-4 items-start flex-wrap mb-4 border-l-[3px] border-l-cta bg-cta-tint">
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-[15.5px] font-bold">
              Your {nextCard.zoneName} card tentatively mails {nextCard.mailMonth}
            </h2>
            <p className="text-sm text-body mt-1">
              {nextCard.artworkDeadline
                ? `Artwork deadline ${nextCard.artworkDeadline}. `
                : ""}
              Send us your art or let us design it.
            </p>
          </div>
          <Link
            href="/account/cards"
            className="bg-cta text-navy-950 text-[13.5px] font-bold px-4 py-2.5 rounded-(--radius-btn) hover:bg-[#FFA033]"
          >
            Open cards
          </Link>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-[10.5px] font-bold uppercase tracking-widest text-muted">
              {s.label}
            </div>
            <div
              className={`text-[22px] font-bold tracking-tight mt-1.5 ${
                s.due ? "text-[#9a5c00]" : ""
              }`}
            >
              {s.value}
            </div>
            <div className="text-[12.5px] text-muted mt-0.5">{s.note}</div>
          </Card>
        ))}
      </div>

      {ctx.inquiries.length > 0 && (
        <>
          <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mt-8 mb-3">
            Recent messages
          </h2>
          <Card>
            {ctx.inquiries.slice(0, 4).map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-4 px-5 py-3.5 border-b border-line last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <b className="text-[14.5px] font-semibold">{q.name}</b>
                  <p className="text-[12.5px] text-muted truncate">{q.message}</p>
                </div>
                <Link
                  href="/account/messages"
                  className="text-[13px] font-semibold text-brand-deep hover:underline shrink-0"
                >
                  Read
                </Link>
              </div>
            ))}
          </Card>
        </>
      )}

      {ctx.currentCards.length > 0 && (
        <>
          <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-muted mt-8 mb-3">
            Running now
          </h2>
          <Card>
            {ctx.currentCards.map((c) => (
              <div
                key={c.cardId}
                className="flex items-center gap-4 px-5 py-3.5 border-b border-line last:border-b-0 flex-wrap"
              >
                <div className="flex-1 min-w-[200px]">
                  <b className="text-[14.5px] font-semibold">
                    {c.zoneName}, {c.mailMonth}
                  </b>
                  <p className="text-[12.5px] text-muted">
                    {c.adSize}
                    {money(c.amountCents) ? ` · ${money(c.amountCents)}` : ""}
                    {c.households ? ` · ${c.households} homes` : ""}
                  </p>
                </div>
                <Link
                  href="/account/cards"
                  className="text-[13px] font-semibold text-brand-deep hover:underline"
                >
                  Details
                </Link>
              </div>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
