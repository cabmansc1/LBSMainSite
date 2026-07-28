import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { AdminNav } from "@/components/admin-nav";


/**
 * Admin chrome. Authorization happens in each page via requireAdmin()
 * (layouts do not reliably know the pathname, and per-page checks mean
 * no route can be added unprotected by accident); the layout only
 * decides whether to show the admin nav.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (session?.role !== "admin") {
    return <div className="bg-surface min-h-full">{children}</div>;
  }

  return (
    <div className="bg-surface min-h-full">
      {/* relative, because the mobile menu drops out of this bar */}
      <div className="bg-navy-950 text-white relative">
        <div className="mx-auto max-w-[1120px] px-6 py-3 flex items-center gap-5 flex-wrap">
          <b className="text-[13.5px] font-bold shrink-0">
            LBS <span className="text-brand">Admin</span>
          </b>
          <AdminNav />
          <span className="ml-auto text-[#93A5B8]">
            <LogoutButton />
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
