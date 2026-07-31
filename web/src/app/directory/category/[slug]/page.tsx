import type { Metadata } from "next";
import { DirectoryPageShell } from "@/components/directory-page-shell";
import { getCategoryContent } from "@/lib/category-content";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { taxonomyLabel } from "@/lib/taxonomy-labels";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = await taxonomyLabel("category", slug);
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
  const content = getCategoryContent(slug);
  const name = await taxonomyLabel("category", slug);
  return (
    <DirectoryPageShell
      filters={{ category: slug }}
      heading={`${name} in the Lowcountry`}
      intro={content?.intro}
      faqs={content?.faqs}
    />
  );
}
