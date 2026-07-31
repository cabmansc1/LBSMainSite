import type { Metadata } from "next";
import { DirectoryPageShell } from "@/components/directory-page-shell";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { taxonomyLabel } from "@/lib/taxonomy-labels";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = await taxonomyLabel("location", slug);
  return {
    title: `Businesses in ${name}, SC`,
    description: `Browse local businesses in ${name}, South Carolina in the ${SITE_NAME} directory.`,
    alternates: { canonical: `${SITE_URL}/directory/location/${slug}` },
  };
}

export default async function DirectoryLocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = await taxonomyLabel("location", slug);
  return (
    <DirectoryPageShell
      filters={{ location: slug }}
      heading={`Businesses in ${name}`}
    />
  );
}
