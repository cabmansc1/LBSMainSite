import type { Metadata } from "next";
import { DirectoryPageShell } from "@/components/directory-page-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata("directory");
export const dynamic = "force-dynamic";

export default function DirectoryPage() {
  return <DirectoryPageShell />;
}
