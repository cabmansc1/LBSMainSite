"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DirectoryBusiness } from "@/lib/directory";

function BusinessCard({ b }: { b: DirectoryBusiness }) {
  return (
    <Link
      href={`/business/${b.slug}`}
      className="bg-white border border-line rounded-(--radius-card) p-6 grid gap-3 content-start hover:border-faint transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        {b.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.logoUrl}
            alt={`${b.name} logo`}
            className="w-14 h-14 rounded-[10px] border border-line bg-white object-contain p-0.5"
            loading="lazy"
          />
        ) : (
          <div className="w-11 h-11 rounded-[10px] bg-brand-tint text-brand-deep font-bold text-[15px] flex items-center justify-center">
            {b.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")}
          </div>
        )}
        <div className="flex gap-1.5 flex-wrap justify-end">
          {b.isFeatured && (
            <span className="text-[10.5px] font-bold uppercase tracking-wider bg-navy-950 text-white px-2 py-0.5 rounded-full">
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
        <p className="text-[12.5px] text-muted mt-0.5">
          {b.category} · {b.locationArea}
        </p>
      </div>
      <p className="text-[13.5px] text-body leading-relaxed line-clamp-2">
        {b.description}
      </p>
      {b.offer && (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a05e00] bg-cta-tint border border-[#f3ddbb] rounded-lg px-2.5 py-1.5 w-max">
          {b.offer.title}
        </span>
      )}
    </Link>
  );
}

export function DirectoryBrowser({
  businesses,
  categories,
  locations,
  activeCategory,
  activeLocation,
}: {
  businesses: DirectoryBusiness[];
  categories: { name: string; slug: string }[];
  locations: { name: string; slug: string }[];
  activeCategory?: string;
  activeLocation?: string;
}) {
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
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3.5">
            Featured businesses
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {featured.map((b) => (
              <BusinessCard key={b.id} b={b} />
            ))}
          </div>
        </section>
      )}

      <section>
        {featured.length > 0 && (
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3.5">
            All businesses
          </h2>
        )}
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
              <BusinessCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
