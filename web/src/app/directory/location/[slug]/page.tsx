import type { Metadata } from "next";
import {
  DirectoryPageShell,
  directoryPageUrl,
  readPageParam,
} from "@/components/directory-page-shell";
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
  const name = await taxonomyLabel("location", slug);
  return {
    title: `Businesses in ${name}, SC`,
    description: `Browse local businesses in ${name}, South Carolina in the ${SITE_NAME} directory.`,
    alternates: {
      canonical: `${SITE_URL}${directoryPageUrl(`/directory/location/${slug}`, page)}`,
    },
  };
}

export default async function DirectoryLocationPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const page = readPageParam((await searchParams).page);
  const name = await taxonomyLabel("location", slug);
  return (
    <DirectoryPageShell
      filters={{ location: slug }}
      basePath={`/directory/location/${slug}`}
      page={page}
      heading={`Businesses in ${name}`}
    />
  );
}
