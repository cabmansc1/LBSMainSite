import type { Metadata } from "next";
import {
  DirectoryPageShell,
  directoryPageUrl,
  readPageParam,
} from "@/components/directory-page-shell";
import { getCategoryContent } from "@/lib/category-content";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { taxonomyLabel } from "@/lib/taxonomy-labels";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = readPageParam((await searchParams).page);
  const name = await taxonomyLabel("category", slug);
  return {
    title: `${name} Businesses in the Charleston Area`,
    description: `Find trusted ${name.toLowerCase()} businesses across the Charleston Lowcountry in the ${SITE_NAME} directory.`,
    alternates: {
      canonical: `${SITE_URL}${directoryPageUrl(`/directory/category/${slug}`, page)}`,
    },
  };
}

export default async function DirectoryCategoryPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const page = readPageParam((await searchParams).page);
  const content = getCategoryContent(slug);
  const name = await taxonomyLabel("category", slug);
  return (
    <DirectoryPageShell
      filters={{ category: slug }}
      basePath={`/directory/category/${slug}`}
      page={page}
      heading={`${name} in the Lowcountry`}
      intro={content?.intro}
      faqs={content?.faqs}
    />
  );
}
