"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DirectoryBusiness } from "@/lib/directory";

const Pin = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

function BusinessCard({
  b,
  lowcoDeals = 0,
}: {
  b: DirectoryBusiness;
  lowcoDeals?: number;
}) {
  const featured = b.isFeatured;
  return (
    <div
      className={`rounded-(--radius-card) grid gap-3 content-start p-6 transition-colors ${
        featured
          ? "bg-[#FFFBF2] border-[1.5px] border-cta/70 hover:border-cta"
          : "bg-white border border-line hover:border-faint"
      }`}
    >
      <Link href={`/business/${b.slug}`} className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          {b.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.logoUrl}
              alt={`${b.name} logo`}
              className={`rounded-[10px] border bg-white object-contain p-0.5 ${
                featured ? "w-[72px] h-[72px] border-cta/40" : "w-14 h-14 border-line"
              }`}
              loading="lazy"
            />
          ) : (
            <div
              className={`rounded-[10px] bg-brand-tint text-brand-deep font-bold flex items-center justify-center ${
                featured ? "w-[72px] h-[72px] text-lg" : "w-11 h-11 text-[15px]"
              }`}
            >
              {b.name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")}
            </div>
          )}
          <div className="flex gap-1.5 flex-wrap justify-end">
            {featured && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider bg-cta text-navy-950 px-2 py-0.5 rounded-full">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.9 6.3 6.6.6-5 4.5 1.5 6.6L12 16.9 6 20l1.5-6.6-5-4.5 6.6-.6z" />
                </svg>
                Featured
              </span>
            )}
            {b.isVerified && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider bg-surface border border-line text-body px-2 py-0.5 rounded-full">
                <svg className="text-ok" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Verified
              </span>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-[16.5px] font-semibold tracking-tight">{b.name}</h3>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-deep mt-1">
            {b.category}
          </p>
          <p className="text-[12.5px] text-muted mt-0.5 flex items-center gap-1">
            <Pin />
            {b.locationArea}
            {b.city && b.locationArea !== b.city ? `, SC` : ", SC"}
          </p>
        </div>
        <p className="text-[13.5px] text-body leading-relaxed line-clamp-2">
          {b.description}
        </p>
        {(b.tags?.length || b.offer || lowcoDeals > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {b.tags?.map((t) => (
              <span
                key={t.slug}
                className="text-[11.5px] font-semibold text-brand-deep bg-brand-tint rounded-full px-2.5 py-1"
              >
                {t.name}
              </span>
            ))}
            {b.offer && (
              <span className="text-xs font-semibold text-[#a05e00] bg-cta-tint border border-[#f3ddbb] rounded-lg px-2.5 py-1">
                {b.offer.title}
              </span>
            )}
            {lowcoDeals > 0 && (
              <span className="text-xs font-semibold text-ok bg-[#e5f5ec] border border-[#bfe8d2] rounded-lg px-2.5 py-1">
                {lowcoDeals} deal{lowcoDeals > 1 ? "s" : ""} on LowcoDeals
              </span>
            )}
          </div>
        )}
      </Link>
      <div
        className={`flex items-center justify-between gap-3 flex-wrap border-t pt-3 mt-1 text-[13px] ${
          featured ? "border-cta/30" : "border-line"
        }`}
      >
        <div className="flex items-center gap-4">
          {b.phone && (
            <a
              href={`tel:${b.phone.replace(/\D/g, "")}`}
              className="font-semibold text-brand-deep hover:underline num"
            >
              {b.phone}
            </a>
          )}
          {b.website && (
            <a
              href={b.website}
              target="_blank"
              rel="nofollow noopener"
              className="font-semibold text-brand-deep hover:underline"
            >
              Website
            </a>
          )}
        </div>
        <Link
          href={`/business/${b.slug}`}
          className="font-semibold text-brand-deep hover:underline"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}

export function DirectoryBrowser({
  businesses,
  categories,
  locations,
  activeCategory,
  activeLocation,
  lowcoDealCounts = {},
}: {
  businesses: DirectoryBusiness[];
  categories: { name: string; slug: string }[];
  locations: { name: string; slug: string }[];
  activeCategory?: string;
  activeLocation?: string;
  /** normalized business name -> live LowcoDeals count */
  lowcoDealCounts?: Record<string, number>;
}) {
  const dealCount = (name: string) =>
    lowcoDealCounts[name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "")] ?? 0;
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter((b) =>
      [b.name, b.category, b.locationArea, b.description]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [businesses, query]);

  const featured = visible.filter((b) => b.isFeatured);
  const rest = visible.filter((b) => !b.isFeatured);

  return (
    <div className="grid gap-8">
      <div className="grid gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, trade, or neighborhood"
          aria-label="Search the directory"
          className="w-full max-w-[520px] text-[15px] px-4 py-3 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950"
        />
        <div className="flex flex-wrap gap-2" aria-label="Filter by category">
          <Link
            href="/directory"
            className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full border ${
              !activeCategory && !activeLocation
                ? "bg-navy-950 text-white border-navy-950"
                : "bg-white text-body border-line-strong hover:border-faint"
            }`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/directory/category/${c.slug}`}
              className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full border ${
                activeCategory === c.slug
                  ? "bg-navy-950 text-white border-navy-950"
                  : "bg-white text-body border-line-strong hover:border-faint"
              }`}
            >
              {c.name}
            </Link>
          ))}
          <span className="w-px bg-line-strong mx-1 hidden sm:block" />
          {locations.map((l) => (
            <Link
              key={l.slug}
              href={`/directory/location/${l.slug}`}
              className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full border ${
                activeLocation === l.slug
                  ? "bg-navy-950 text-white border-navy-950"
                  : "bg-surface text-muted border-line hover:border-faint"
              }`}
            >
              {l.name}
            </Link>
          ))}
        </div>
      </div>

      {featured.length > 0 && (
        <section className="bg-white border border-line rounded-2xl p-6 md:p-7">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="w-8 h-8 rounded-full bg-cta text-white flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.9 6.3 6.6.6-5 4.5 1.5 6.6L12 16.9 6 20l1.5-6.6-5-4.5 6.6-.6z" />
              </svg>
            </span>
            <h2 className="text-[19px] font-bold tracking-tight">
              Featured Businesses
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {featured.map((b) => (
              <BusinessCard key={b.id} b={b} lowcoDeals={dealCount(b.name)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3.5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
            All businesses
          </h2>
          <span className="text-[13px] text-muted num">
            {visible.length} listed
          </span>
        </div>
        {rest.length === 0 && featured.length === 0 ? (
          <p className="text-muted text-sm py-8">
            No businesses match that search yet. Try a different term, or{" "}
            <Link href="/directory-signup" className="text-brand-deep font-semibold hover:underline">
              be the first to list
            </Link>
            .
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {rest.map((b) => (
              <BusinessCard key={b.id} b={b} lowcoDeals={dealCount(b.name)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
