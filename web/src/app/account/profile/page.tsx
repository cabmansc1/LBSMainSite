import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPortalContext } from "@/lib/portal";
import { getProfileDetails } from "@/lib/profile";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [profile, ctx] = await Promise.all([
    getProfileDetails(session.id, session.email),
    getPortalContext(session),
  ]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.025em]">Your profile</h1>
        <p className="text-sm text-muted mt-1">
          How we reach you, and how you sign in.
        </p>
      </div>

      <ProfileForm profile={profile} />

      {ctx.listings.length > 0 && (
        <section className="mt-4 bg-white border border-line rounded-(--radius-card) p-6 grid gap-2.5">
          <h2 className="text-[16px] font-semibold tracking-tight">
            Your directory {ctx.listings.length === 1 ? "listing" : "listings"}
          </h2>
          <p className="text-[13px] text-body">
            {/* Deliberately a pointer rather than a second edit form. A
                listing is public and has its own screen; two places to
                edit the same business is how they drift apart. */}
            Your business details on the public directory are edited on the
            listings screen, not here.
          </p>
          <ul className="grid gap-1.5">
            {ctx.listings.map((l) => (
              <li key={l.id} className="text-[13.5px]">
                <b className="font-semibold">{l.name}</b>
                {l.locationArea ? (
                  <span className="text-muted"> · {l.locationArea}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <Link
            href="/account/listings"
            className="text-[13px] font-semibold text-brand-deep hover:underline justify-self-start"
          >
            Manage listings
          </Link>
        </section>
      )}
    </>
  );
}
