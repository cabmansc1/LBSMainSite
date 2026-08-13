import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Direct Mail Guides",
  description:
    "Straight answers about direct mail advertising in the Charleston Lowcountry — what it costs, how it compares with EDDM and the coupon envelopes, and whether it is worth it for your business.",
  alternates: { canonical: `${SITE_URL}/guides` },
  openGraph: {
    title: `Direct Mail Guides | ${SITE_NAME}`,
    description: "What direct mail costs in the Lowcountry, and whether it is worth it.",
    url: `${SITE_URL}/guides`,
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function GuidesPage() {
  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Guides
          </span>
          <h1 className="mt-3 text-[28px] md:text-[42px] font-bold tracking-[-0.032em] max-w-[22ch] text-balance">
            Direct mail, explained without the pitch
          </h1>
          <p className="mt-4 text-[#93A5B8] max-w-[58ch] text-[16.5px] leading-relaxed">
            What it costs, how the options compare, and when it is the wrong
            thing to spend money on. Written so you could act on them without
            hiring anybody.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-14 grid gap-3.5">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="border border-line rounded-(--radius-card) bg-white p-7 hover:border-navy-950 transition-colors grid gap-2"
          >
            <b className="text-[19px] font-bold tracking-[-0.02em] leading-snug">
              {g.title}
            </b>
            <p className="text-[14.5px] text-body leading-relaxed max-w-[70ch]">
              {g.description}
            </p>
            <span className="text-[12.5px] text-muted num">
              {g.minutes} min read
            </span>
          </Link>
        ))}

        <p className="text-[14px] text-muted mt-6">
          Looking for how the product itself works?{" "}
          <Link
            href="/direct-mail-marketing"
            className="text-brand-deep font-semibold"
          >
            Start here
          </Link>
          .
        </p>
      </div>
    </>
  );
}
