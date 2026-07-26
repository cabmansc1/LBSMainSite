import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/directory", label: "Directory" },
  { href: "/admin/cards", label: "Cards" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/stats", label: "Stats" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/signups", label: "Signups" },
  { href: "/admin/users", label: "Accounts" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/qr", label: "QR Codes" },
  { href: "/admin/import", label: "Import" },
];

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
      <div className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 py-3.5 flex items-center gap-6 flex-wrap">
          <b className="text-[13.5px] font-bold">
            LBS <span className="text-brand">Admin</span>
          </b>
          <nav className="flex gap-4.5 text-[13px] text-[#93A5B8] flex-wrap">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto text-[#93A5B8]">
            <LogoutButton />
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
