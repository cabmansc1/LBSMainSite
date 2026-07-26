import type { Metadata } from "next";
import { DirectoryPageShell } from "@/components/directory-page-shell";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const pretty = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${pretty(slug)} Businesses`,
    description: `Local businesses tagged ${pretty(slug).toLowerCase()} in the Charleston Lowcountry.`,
    alternates: { canonical: `${SITE_URL}/directory/tag/${slug}` },
  };
}

export default async function DirectoryTagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <DirectoryPageShell
      filters={{ tag: slug }}
      heading={`Tagged: ${pretty(slug)}`}
    />
  );
}
