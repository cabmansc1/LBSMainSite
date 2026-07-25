import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import { POSTCARD_PRICING, formatPrice } from "@/lib/pricing";

export const metadata: Metadata = buildMetadata("home");

const STATS = [
  { value: "50,000+", label: "Postcards mailed" },
  { value: "75+", label: "Businesses served" },
  { value: "5,000+", label: "Households per mailing" },
  { value: "11", label: "Service areas" },
];

export default function HomePage() {
  const fromPrice = formatPrice(POSTCARD_PRICING["5k"].small.priceCents);

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-21 pb-16 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/6 border border-white/14 text-[#C6D3E0]">
              <span className="w-1.5 h-1.5 rounded-full bg-cta" />
              Phase 1 foundation build
            </span>
            <h1 className="mt-5 text-4xl md:text-[54px] font-bold tracking-[-0.035em] leading-[1.06] text-balance">
              Your business in <em className="not-italic text-brand">5,000 mailboxes.</em>{" "}
              One competitor: none.
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-[#AEBDCC] max-w-[50ch]">
              Shared 9×12 postcards mailed to Charleston-area neighborhoods. One
              exclusive spot per industry, professional design included, from{" "}
              <b className="text-white font-semibold num">{fromPrice}</b> per mailing.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/pricing">Reserve a Spot</Button>
              <Button href="/coverage-map" variant="ghost">
                View Coverage Map
              </Button>
            </div>
          </div>
          <div className="justify-self-center w-full max-w-[430px] rotate-[1.5deg] bg-white rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,.35)] p-5 text-ink">
            <div className="flex justify-between items-start px-1">
              <span className="font-bold text-sm tracking-tight">
                Lowcountry <span className="text-brand-deep">Business Spotlight</span>
              </span>
              <span className="w-[42px] h-[50px] border-[1.5px] border-line-strong rounded-[3px] bg-surface text-muted text-[9px] font-bold flex items-center justify-center text-center leading-tight">
                FIRST
                <br />
                CLASS
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 pt-3">
              <div className="col-span-2 row-span-2 rounded-[5px] bg-navy-950 text-white text-[11.5px] font-semibold flex items-center justify-center text-center min-h-[110px]">
                YOUR BUSINESS
                <br />
                FEATURED HERE
              </div>
              {["HVAC", "$50 OFF", "Dentist", "Roofing", "Landscaping", "Pizza"].map(
                (label) => (
                  <div
                    key={label}
                    className="rounded-[5px] bg-surface border border-line min-h-[52px] flex items-center justify-center text-[9.5px] font-semibold text-faint text-center p-1"
                  >
                    {label}
                  </div>
                ),
              )}
            </div>
            <p className="text-center text-[10.5px] text-muted pt-2.5">
              9×12 postcard · Summerville edition · 5,000+ households
            </p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-[1120px] px-6 py-7 grid grid-cols-2 md:grid-cols-4 gap-5">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={i > 0 ? "md:border-l md:border-white/10 md:pl-5" : ""}
              >
                <b className="block text-2xl md:text-[28px] font-bold tracking-tight num">
                  {s.value}
                </b>
                <span className="text-[12.5px] text-[#67768A]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1120px] px-6 py-22">
        <div className="max-w-[560px] mb-11">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">
            Phase 1 status
          </span>
          <h2 className="mt-3 text-[26px] md:text-[32px] font-bold tracking-[-0.025em] text-balance">
            Foundation is live. Full pages arrive in Phase 2.
          </h2>
          <p className="mt-3 text-[14.5px] text-muted">
            This page proves the design tokens, navigation, footer, fonts, pricing
            data, and redirect rules ported from the PHP site. The real homepage,
            pricing, zones, map, and blog land next.
          </p>
        </div>
      </section>
    </>
  );
}
