import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, StatusChip } from "@/components/sections";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Advertiser Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Advertiser portal dashboard. Campaign rows, listing status, QR scans,
 * and referral credit read from the database on staging; the shapes
 * below match those queries so the swap is data-only. This page replaces
 * the legacy dashboard.php + my-cards.php and the dead manage-listing.php.
 */
const CAMPAIGNS = [
  {
    title: "Summerville · September card",
    detail: "Medium spot · $349 · mails Sept 12",
    chip: <StatusChip tone="warn">Artwork needed</StatusChip>,
    action: { label: "Upload artwork", href: "/account" },
  },
  {
    title: "Goose Creek · October card",
    detail: "Medium spot · $349 · mails Oct 3",
    chip: <StatusChip tone="ok">Approved for print</StatusChip>,
    action: { label: "View proof", href: "/account" },
  },
  {
    title: "Summerville · June card",
    detail: "Mailed June 14 · 5,000 homes · 148 QR scans",
    chip: <StatusChip tone="info">Completed</StatusChip>,
    action: { label: "Results", href: "/account" },
  },
];

export default async function AccountPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="bg-surface min-h-full">
      <div className="mx-auto max-w-[1120px] px-6 py-9">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-7">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.02em]">
              Welcome back{user.firstName ? `, ${user.firstName}` : ""}
            </h1>
            <p className="text-sm text-muted mt-1">
              Here is how your campaigns are doing.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/coverage-map"
              className="bg-navy-950 text-white font-semibold text-[13px] px-4 py-2 rounded-(--radius-btn) hover:bg-navy-800 transition-colors"
            >
              Book another mailing
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Active campaigns", value: "2", note: "Summerville + Goose Creek" },
            { label: "Artwork deadline", value: "Aug 4", note: "9 days away", warn: true },
            { label: "Homes reached in 2026", value: "15,000", note: "+5,000 this quarter" },
            { label: "QR scans", value: "312", note: "41 this week" },
          ].map((t) => (
            <Card key={t.label} className="p-5 grid gap-1">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                {t.label}
              </span>
              <b className={`text-[26px] font-bold tracking-[-0.025em] num ${t.warn ? "text-warn" : ""}`}>
                {t.value}
              </b>
              <span className="text-[12.5px] text-muted">{t.note}</span>
            </Card>
          ))}
        </div>

        <h2 className="text-[16px] font-semibold tracking-tight mb-3">Your campaigns</h2>
        <div className="grid gap-2.5 mb-9">
          {CAMPAIGNS.map((c) => (
            <Card key={c.title} className="px-5.5 py-4.5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-[15px] font-semibold tracking-tight">{c.title}</h3>
                <p className="text-[12.5px] text-muted mt-0.5 num">{c.detail}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {c.chip}
                <Link
                  href={c.action.href}
                  className="text-[13px] font-semibold text-brand-deep hover:underline"
                >
                  {c.action.label}
                </Link>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-3.5">
          <Card className="p-6 grid gap-3 content-start">
            <h2 className="text-[16px] font-semibold tracking-tight">Your directory listing</h2>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[14.5px] font-semibold">Palmetto Plumbing Co.</p>
                <p className="text-[12.5px] text-muted num">
                  Plumbing · Summerville · 1,204 views
                </p>
              </div>
              <StatusChip tone="ok">Live · Premium</StatusChip>
            </div>
            <div className="flex gap-4 text-[13px] font-semibold text-brand-deep">
              <Link href="/account" className="hover:underline">Edit listing</Link>
              <Link href="/account" className="hover:underline">Photos</Link>
              <Link href="/account" className="hover:underline">Hours</Link>
              <Link href="/account" className="hover:underline">Offers</Link>
            </div>
          </Card>

          <Card className="p-6 grid gap-3 content-start border-l-[3px] border-l-cta">
            <h2 className="text-[16px] font-semibold tracking-tight">
              Give $50, get $50
            </h2>
            <p className="text-[13.5px] text-body leading-relaxed">
              Refer another local business. When they book their first mailing,
              you both get $50 off your next card.
            </p>
            <p className="text-[12.5px] text-muted">
              Your referral credit: <b className="text-ink num">$0</b> · referrals
              activate with the account system on staging
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
