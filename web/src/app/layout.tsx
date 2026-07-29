import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { SiteFooter } from "@/components/site-footer";
import { Analytics } from "@/components/analytics";
import { ChatWidget } from "@/components/chat-widget";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  /**
   * Relative image paths in metadata need an origin to become the
   * absolute URLs Facebook and X require. Without this, Next resolves
   * them against a localhost fallback, so a blog post whose featured
   * image is now served from this app rather than the old PHP host
   * would share with a preview image nobody outside the container can
   * fetch.
   *
   * SITE_ORIGIN rather than SITE_URL, because staging has to point at
   * itself: the live domain does not serve /api/blog-image until
   * cutover. Canonicals are unaffected, they are already absolute.
   */
  metadataBase: new URL(process.env.SITE_ORIGIN?.trim() || SITE_URL),
  title: {
    default: SITE_NAME,
    // "LBS" not the full name: the legacy titles used the short form and
    // sat inside the ~60 characters a search result actually shows. The
    // full name pushed most pages well past it.
    template: "%s | LBS",
  },
  description:
    "Shared 9x12 postcards mailed to Charleston-area neighborhoods. One exclusive spot per industry, free ad design, from $249 per mailing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {/* Both sit at the end of <body> and load after hydration, so
            neither is on the path to first paint. seo_head.php had the
            trackers in <head> only because PHP had nowhere later to put
            them. */}
        <Analytics />
        <ChatWidget />
      </body>
    </html>
  );
}
