import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPortalContext } from "@/lib/portal";
import { PortalNav } from "@/components/portal-nav";
import { LogoutButton } from "@/components/logout-button";
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

  const { listings, currentCards, inquiries } = await getPortalContext(session);
  const business = listings[0];
  const needsAction = currentCards.filter((c) => c.status !== "waitlist").length;

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

        <PortalNav
          variant="sidebar"
          unreadMessages={inquiries.length}
          cardsNeedingAction={needsAction}
        />

        <div className="mt-auto border-t border-white/10 pt-4 grid gap-2">
          <div className="text-[12.5px] text-white leading-tight">
            {business?.name ?? session.firstName ?? "Your account"}
            <span className="block text-[11.5px] text-[#93A5B8] truncate">
              {session.email}
            </span>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="md:hidden bg-navy-950 text-white px-5 py-3 flex items-center justify-between sticky top-0 z-20">
        <b className="text-[14px] truncate">
          {business?.name ?? "Your account"}
        </b>
        <LogoutButton />
      </div>

      <main className="flex-1 min-w-0 px-5 md:px-7 py-6 md:py-7 pb-24 md:pb-10">
        <div className="max-w-[940px]">{children}</div>
      </main>

      <PortalNav
        variant="bottom"
        unreadMessages={inquiries.length}
        cardsNeedingAction={needsAction}
      />
    </div>
    </>
  );
}
