import type { Metadata } from "next";
import { DirectoryPageShell } from "@/components/directory-page-shell";
import { SITE_URL } from "@/lib/seo";
import { taxonomyLabel } from "@/lib/taxonomy-labels";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = await taxonomyLabel("tag", slug);
  return {
    title: `${name} Businesses`,
    description: `Local businesses tagged ${name.toLowerCase()} in the Charleston Lowcountry.`,
    alternates: { canonical: `${SITE_URL}/directory/tag/${slug}` },
  };
}

export default async function DirectoryTagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = await taxonomyLabel("tag", slug);
  return (
    <DirectoryPageShell
      filters={{ tag: slug }}
      heading={`Tagged: ${name}`}
    />
  );
}
