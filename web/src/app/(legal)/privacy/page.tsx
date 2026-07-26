import type { Metadata } from "next";
import { LegalPage } from "../legal-page";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Lowcountry Business Spotlight collects, uses, shares, and protects your information, including SMS messaging, cookies, and your rights and choices.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return <LegalPage slug="privacy" />;
}
