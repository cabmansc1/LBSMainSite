import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CtaBand } from "@/components/sections";
import { getPastCards } from "@/lib/past-cards";
import { zoneBySlug } from "@/lib/zones";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ zone: string }>;
}): Promise<Metadata> {
  const { zone: slug } = await params;
  const cards = await getPastCards({ publishedOnly: true, zoneSlug: slug });
  if (cards.length === 0) return {};
  const name = cards[0].zoneName;
  const title = `${name} Postcards We Have Mailed`;
  return {
    title,
    description: `Every Spotlight Postcard mailed in ${name}: ${cards.length} ${
      cards.length === 1 ? "card" : "cards"
    }, the routes each one reached, and the local businesses that advertised on them.`,
    alternates: { canonical: `${SITE_URL}/gallery/${slug}` },
    openGraph: { title: `${title} | ${SITE_NAME}`, siteName: SITE_NAME, type: "website" },
  };
}

/** Every card mailed in one neighborhood, newest first. */
export default async function ZoneGalleryPage({
  params,
}: {
  params: Promise<{ zone: string }>;
}) {
  const { zone: slug } = await params;
  const cards = await getPastCards({ publishedOnly: true, zoneSlug: slug });
  if (cards.length === 0) notFound();

  const zone = zoneBySlug(slug);
  const name = cards[0].zoneName;

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1120px] px-6 pt-11 pb-12">
          <nav className="text-[12.5px] text-[#67768A] flex gap-2" aria-label="Breadcrumb">
            <Link href="/gallery" className="hover:text-white">
              Card gallery
            </Link>
            <span>/</span>
            <b className="text-white font-semibold">{name}</b>
          </nav>
          <h1 className="mt-4 text-[26px] md:text-[38px] font-bold tracking-[-0.03em]">
            {name} cards we have mailed
          </h1>
          <p className="mt-3 text-[#93A5B8] max-w-[56ch] num">
            {cards.length} {cards.length === 1 ? "card" : "cards"} printed and
            delivered. Open one to see the card, the routes it covered, and the
            businesses on it.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => {
            const img = c.images.find((i) => i.side === "front") ?? c.images[0];
            return (
              <Link
                key={c.slug}
                href={`/cards/${c.slug}`}
                className="block border border-line rounded-(--radius-card) overflow-hidden bg-white hover:border-faint transition-colors"
              >
                {img && (
                  <Image
                    src={`/api/card-image/${img.id}`}
                    alt={img.alt}
                    width={img.width || 800}
                    height={img.height || 534}
                    className="w-full h-auto"
                  />
                )}
                <span className="block px-5 py-4">
                  <b className="block text-[15px] font-semibold tracking-tight">
                    {c.cardName ?? c.zoneName}
                  </b>
                  <span className="text-[13px] text-muted">
                    Mailed {c.mailMonth}
                  </span>
                  {c.description && (
                    <span className="block text-[12.5px] text-muted mt-1.5 line-clamp-2">
                      {c.description}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex gap-3 flex-wrap">
          {zone && (
            <Button href={`/${zone.slug}-direct-mail-marketing`} variant="quiet" small>
              About direct mail in {zone.name}
            </Button>
          )}
          <Button href="/gallery" variant="quiet" small>
            All neighborhoods
          </Button>
        </div>

        <div className="mt-14">
          <CtaBand
            title={`Be on the next ${name} card.`}
            sub="One business per category. Categories go first come."
            ctaLabel="See pricing"
            ctaHref="/pricing"
          />
        </div>
      </div>
    </>
  );
}
