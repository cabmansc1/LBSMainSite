import type { Metadata } from "next";
import { DirectoryPageShell } from "@/components/directory-page-shell";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const pretty = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = pretty(slug);
  return {
    title: `${name} Businesses in the Charleston Area`,
    description: `Find trusted ${name.toLowerCase()} businesses across the Charleston Lowcountry in the ${SITE_NAME} directory.`,
    alternates: { canonical: `${SITE_URL}/directory/category/${slug}` },
  };
}

export default async function DirectoryCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <DirectoryPageShell
      filters={{ category: slug }}
      heading={`${pretty(slug)} in the Lowcountry`}
    />
  );
}
