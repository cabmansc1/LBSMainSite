import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUpcomingMailings } from "@/lib/mission-control";
import { getCardDescriptions } from "@/lib/card-details";
import { isBookable, mailMonthLabel } from "@/lib/mailings";
import { Card, StatusChip } from "@/components/sections";
import { CONTACT_PHONE, CONTACT_PHONE_TEL } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Book a spot",
  robots: { index: false, follow: false },
};

/**
 * Booking the next card, from inside the account.
 *
 * There was no route from the portal into checkout at all. An advertiser
 * who wanted a second card had to leave for the public marketing pages
 * and start as though we had never met them, which is also where they
 * retyped their business name into a second record.
 *
 * Only cards that can actually be bought are listed. A waitlisted or
 * full card shown with a Reserve button is a promise the checkout page
 * then refuses.
 */
export default async function AccountBookPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [mailings, descriptions] = await Promise.all([
    getUpcomingMailings().catch(() => []),
    getCardDescriptions().catch(() => ({}) as Record<string, string>),
  ]);

  const open = mailings.filter((m) => isBookable(m.status));

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.025em]">Book a spot</h1>
        <p className="text-sm text-muted mt-1">
          Cards still filling. Your details are already on the checkout, so
          this books under the same account as your other campaigns.
        </p>
      </div>

      {open.length === 0 ? (
        <Card className="p-6 grid gap-2">
          <h2 className="text-[15.5px] font-bold">
            The next round of cards is being scheduled
          </h2>
          <p className="text-sm text-body max-w-[52ch] leading-relaxed">
            Nothing is open for booking this minute. Call and we will tell you
            which zones have room coming up, and hold one for you.
          </p>
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            className="text-[13px] font-semibold text-brand-deep hover:underline"
          >
            {CONTACT_PHONE}
          </a>
        </Card>
      ) : (
        <div className="grid gap-3">
          {open.map((m) => {
            const left = Math.max(0, m.spotsTotal - m.spotsTaken);
            const description = m.cardId ? descriptions[m.cardId] : undefined;
            const href = m.cardId
              ? `/postcards/${m.zoneSlug}/checkout?card=${encodeURIComponent(m.cardId)}`
              : `/postcards/${m.zoneSlug}/checkout`;
            return (
              <Card
                key={m.cardId ?? `${m.zoneSlug}-${m.mailMonth}`}
                className="p-5 flex flex-wrap items-start gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <b className="text-[15.5px]">
                      {m.cardName?.trim() || m.zoneName}
                    </b>
                    {m.status === "planned" ? (
                      <StatusChip tone="info">Planned</StatusChip>
                    ) : left <= 2 ? (
                      <StatusChip tone="warn">{left} left</StatusChip>
                    ) : (
                      <StatusChip tone="ok">{left} open</StatusChip>
                    )}
                  </div>
                  <p className="text-[13px] text-muted mt-0.5">
                    {m.zoneName} · mails {mailMonthLabel(m.mailMonth)}
                    {m.households ? ` · ${m.households} homes` : ""}
                  </p>
                  {description && (
                    <p className="text-[13px] text-body mt-1.5 max-w-[62ch] leading-relaxed">
                      {description}
                    </p>
                  )}
                  {m.artworkDeadline && (
                    // The date that actually costs them the card, said
                    // where the decision is being made rather than in a
                    // confirmation email afterwards.
                    <p className="text-[12.5px] text-[#9a5c00] mt-1.5 font-semibold">
                      Artwork due {m.artworkDeadline}
                    </p>
                  )}
                </div>
                <Link
                  href={href}
                  className="bg-cta text-navy-950 font-semibold text-[13.5px] px-4 py-2.5 rounded-(--radius-btn) hover:bg-cta-hover hover:text-white transition-colors shrink-0"
                >
                  Reserve a spot
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[12.5px] text-muted mt-5 max-w-[64ch]">
        A category is exclusive to one advertiser per card, so a spot is only
        yours once it is paid. Checkout holds one for thirty minutes while you
        pay. Prefer to talk it through?{" "}
        <Link href="/contact" className="text-brand-deep font-semibold hover:underline">
          Get in touch
        </Link>
        .
      </p>
    </>
  );
}
