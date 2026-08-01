import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getProblems, surveyUploads } from "@/lib/uploads-migration";
import { AdminUploadsMigration } from "@/components/admin-uploads-migration";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Legacy uploads",
  robots: { index: false, follow: false },
};

/**
 * Moves the files still living on the old PHP host into the database.
 *
 * This exists so that host can be switched off. Everything this app
 * uploads already goes into MySQL, because Railway gives a container no
 * disk that survives a deploy. The files here are older than that: the
 * PHP site wrote them to its own filesystem and recorded the name, and
 * those names are the last thing tying us to a service we no longer use.
 */
export default async function AdminUploadsPage() {
  await requireAdmin();
  const [survey, problems] = await Promise.all([surveyUploads(), getProblems()]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Legacy uploads</h1>
        <p className="text-[14px] text-body mt-1.5 max-w-2xl leading-relaxed">
          Copies the files the old PHP site kept on its own disk into the
          database, where the rest of our images already live. Run every
          category to zero before switching that service off. Safe to stop and
          pick up again: each file is recorded as it lands, and nothing is
          moved twice.
        </p>
      </div>

      <AdminUploadsMigration
        survey={survey.categories}
        base={survey.base}
        problems={problems}
      />
    </div>
  );
}
