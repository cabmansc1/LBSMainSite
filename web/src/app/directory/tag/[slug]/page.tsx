import type { Metadata } from "next";
import {
  DirectoryPageShell,
  directoryPageUrl,
  readPageParam,
} from "@/components/directory-page-shell";
import { SITE_URL } from "@/lib/seo";
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
  const name = await taxonomyLabel("tag", slug);
  return {
    title: `${name} Businesses`,
    description: `Local businesses tagged ${name.toLowerCase()} in the Charleston Lowcountry.`,
    alternates: {
      canonical: `${SITE_URL}${directoryPageUrl(`/directory/tag/${slug}`, page)}`,
    },
  };
}

export default async function DirectoryTagPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const page = readPageParam((await searchParams).page);
  const name = await taxonomyLabel("tag", slug);
  return (
    <DirectoryPageShell
      filters={{ tag: slug }}
      basePath={`/directory/tag/${slug}`}
      page={page}
      heading={`Tagged: ${name}`}
    />
  );
}
