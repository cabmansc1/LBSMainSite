import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPortalContext } from "@/lib/portal";
import { getPortalTodos } from "@/lib/portal-todos";
import { missingProfileFields } from "@/lib/profile";
import { PortalNav } from "@/components/portal-nav";
import { LogoutButton } from "@/components/logout-button";
import { getAdvertiserBusiness } from "@/lib/advertiser-business";
import { ImpersonationBanner } from "@/components/impersonation-banner";

export const dynamic = "force-dynamic";

/**
 * Portal shell. Authorization happens here and again in each page via
 * getSession, so no route renders for a signed-out visitor.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const ctx = await getPortalContext(session);
  const { listings, currentCards } = ctx;

  // Who this account is, in the order we would rather say it.
  //
  // This used to be listings[0] alone, so an advertiser who bought a
  // postcard spot and never listed in the directory saw nothing but
  // their email address in their own portal. Their business name is
  // sitting on their order and on their profile; it just was not being
  // asked for.
  const saved = await getAdvertiserBusiness(session.id, session.email).catch(
    () => null,
  );
  const businessName =
    saved?.business.businessName?.trim() ||
    listings[0]?.name ||
    session.firstName ||
    "Your account";

  // The badges are the counts themselves, not a guess at what is
  // interesting. The Cards one used to be "current cards that are not
  // waitlisted", which is just how many cards they are on, and Listings
  // had none at all even when there was one to count.
  // Messages showed the total, called it unread, and so never went down
  // however many had been answered. A badge that cannot reach zero reads
  // as a permanent unfinished job and teaches people to ignore the rest.
  const { countUnhandled } = await import("@/lib/inquiries");
  const unanswered = await countUnhandled(listings.map((l) => l.id)).catch(
    () => 0,
  );

  const gaps = await missingProfileFields(session.email).catch(() => []);
  const todos = await getPortalTodos(
    ctx,
    gaps.some((g) => g.key === "phone"),
  ).catch(() => []);

  return (
    <>
      {session.impersonatedBy && <ImpersonationBanner email={session.email} />}
    <div className="bg-surface min-h-full md:flex md:items-stretch">
      <aside className="hidden md:flex w-[224px] shrink-0 bg-navy-950 text-white p-5 flex-col gap-6 sticky top-0 h-screen">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/lb-spotlight.png" alt="LB Spotlight" className="h-8 w-auto" />
          <span className="text-[12px] text-[#93A5B8] leading-tight">
            Advertiser
            <br />
            portal
          </span>
        </Link>

        {/* Above the nav rather than pinned to the bottom of a full
            height sidebar, where it sat below the fold on a short
            screen: who you are signed in as, and how to stop being
            signed in, are the two things you look for first. */}
        <div className="border-b border-white/10 pb-4 grid gap-2">
          <div className="text-[13px] font-semibold text-white leading-tight">
            {businessName}
            <span className="block text-[11.5px] font-normal text-[#93A5B8] truncate">
              {session.email}
            </span>
          </div>
          <LogoutButton />
        </div>

        <PortalNav
          variant="sidebar"
          unreadMessages={unanswered}
          cardCount={currentCards.length}
          listingCount={listings.length}
          todoCount={todos.length}
          todoOverdue={todos.some((t) => t.overdue)}
        />

      </aside>

      <div className="md:hidden bg-navy-950 text-white px-5 py-3 flex items-center justify-between sticky top-0 z-20">
        <b className="text-[14px] truncate">{businessName}</b>
        <LogoutButton />
      </div>

      <main className="flex-1 min-w-0 px-5 md:px-7 py-6 md:py-7 pb-24 md:pb-10">
        <div className="max-w-[940px]">{children}</div>
      </main>

      <PortalNav
        variant="bottom"
        unreadMessages={unanswered}
        cardCount={currentCards.length}
        listingCount={listings.length}
        todoCount={todos.length}
        todoOverdue={todos.some((t) => t.overdue)}
      />
    </div>
    </>
  );
}
