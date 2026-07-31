import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { Card, SectionHeading } from "@/components/sections";
import { SITE_NAME, SITE_URL, CONTACT_EMAIL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Talk to Lowcountry Business Spotlight about postcard advertising, directory listings, or your next mailing. Call 843-212-2969 or email hello@lowcountrybusinessspotlight.com.",
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: `Contact | ${SITE_NAME}`,
    description: "Questions about advertising? Talk to a real person.",
    siteName: SITE_NAME,
    type: "website",
  },
};

const WAYS = [
  {
    title: "Call or text",
    value: "843-212-2969",
    href: "tel:+18432122969",
    note: "Fastest during business hours",
  },
  {
    title: "Email",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    note: "We reply within one business day",
  },
  {
    title: "Book a call",
    value: "Pick a time that works",
    href: "/contact",
    note: "15 minutes, no pitch, real advice",
  },
];

export default function ContactPage() {
  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-14 pb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            Contact
          </span>
          <h1 className="mt-3 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] max-w-[22ch] text-balance">
            Talk to a person, not a funnel.
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[56ch]">
            Questions about a zone, a deadline, or what size fits your budget?
            Reach out however you like.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        <div className="grid md:grid-cols-3 gap-3.5">
          {WAYS.map((w) => (
            <Card key={w.title} className="p-6.5 grid gap-1.5 content-start">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                {w.title}
              </span>
              <a
                href={w.href}
                className="text-[17px] font-semibold text-brand-deep hover:underline"
              >
                {w.value}
              </a>
              <p className="text-[12.5px] text-muted">{w.note}</p>
            </Card>
          ))}
        </div>

        <section className="pt-16">
          <SectionHeading
            eyebrow="Send a message"
            title="Tell us what you are working on"
            sub="Business name, your name, and an email are all we need. The more you tell us about your industry and neighborhood, the more useful the reply."
          />
          <div className="mt-6 max-w-[720px]">
            <ContactForm />
          </div>
        </section>

        <section className="pt-16">
          <SectionHeading
            eyebrow="Office hours"
            title="Summerville, SC"
            sub="Monday to Friday, 9am to 5pm Eastern. Calls, texts, and email all reach us directly."
          />
        </section>
      </div>
    </>
  );
}
