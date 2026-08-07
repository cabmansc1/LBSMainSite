import type { Metadata } from "next";
import {
  DirectoryPageShell,
  directoryPageUrl,
  readPageParam,
} from "@/components/directory-page-shell";
import { buildMetadata, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const page = readPageParam((await searchParams).page);
  return {
    ...buildMetadata("directory"),
    // Each page of the directory is a different set of businesses, so
    // each one points at itself. Pointing them all at /directory said
    // they were the same page, and a page that is a copy of another is
    // a page whose links are worth nothing to the listings on it.
    alternates: { canonical: `${SITE_URL}${directoryPageUrl("/directory", page)}` },
  };
}

export default async function DirectoryPage({ searchParams }: Props) {
  const page = readPageParam((await searchParams).page);
  return <DirectoryPageShell basePath="/directory" page={page} />;
}
