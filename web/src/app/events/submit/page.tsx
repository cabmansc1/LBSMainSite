import type { Metadata } from "next";
import Link from "next/link";
import { listActivePlaces } from "@/lib/places";
import { EventSubmitForm } from "@/components/event-submit-form";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add Your Event to the Charleston Calendar",
  description:
    "Running something worth knowing about around Greater Charleston? Tell us and we will put it on the calendar. Free, and open to anybody.",
  alternates: { canonical: `${SITE_URL}/events/submit` },
  openGraph: {
    title: `Add your event | ${SITE_NAME}`,
    description: "Put your Lowcountry event on the calendar.",
    siteName: SITE_NAME,
    type: "website",
  },
};

/**
 * The public way onto the calendar.
 *
 * Without this every event is one Andrew typed in himself, which is a
 * weekly job with no end date and the reason local calendars go quiet
 * around month four. It is also a lead in disguise: a business
 * submitting its own grand opening has just told us it exists, what it
 * does and where.
 */
export default async function SubmitEventPage() {
  const places = await listActivePlaces().catch(() => []);

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[760px] px-6 pt-12 pb-10">
          <nav className="text-[12.5px] text-[#67768A]" aria-label="Breadcrumb">
            <Link href="/events" className="hover:text-white">
              Events
            </Link>
            <span className="mx-1.5">/</span>
            <span>Add yours</span>
          </nav>
          <h1 className="mt-4 text-[28px] md:text-[38px] font-bold tracking-[-0.03em] leading-[1.12] text-balance">
            Tell us what you have coming up.
          </h1>
          <p className="mt-3.5 text-[16px] leading-relaxed text-[#AEBDCC] max-w-[54ch]">
            Free, and open to anybody putting on something around Greater
            Charleston. We read everything that comes in and publish what looks
            useful to people who live here.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-[760px] px-6 py-10">
        <EventSubmitForm
          places={places.map((p) => ({
            value: p.slug,
            label:
              p.kind === "region"
                ? p.name
                : p.kind === "market"
                  ? `— ${p.name}`
                  : `—— ${p.name}`,
          }))}
        />

        <p className="mt-8 text-[13px] text-muted max-w-[60ch]">
          Nothing goes up automatically. We check the date and the details
          first, which is why the calendar is worth reading.
        </p>
      </section>
    </>
  );
}
