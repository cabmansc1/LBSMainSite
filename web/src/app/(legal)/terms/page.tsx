import type { Metadata } from "next";
import { LegalPage } from "../legal-page";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "The terms governing use of the Lowcountry Business Spotlight site, directory listings, advertising services, payments, and SMS communications.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return <LegalPage slug="terms" />;
}
