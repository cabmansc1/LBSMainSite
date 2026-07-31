import "server-only";
import { sql } from "drizzle-orm";
import { createBusiness } from "@/lib/admin-data";
import { createPortalUser } from "@/lib/auth";
import { looksLikeEmail, normalizeUrl } from "@/lib/listing-edits";

/**
 * Self-serve directory signup.
 *
 * `/register` told people to email us, so no business could list itself.
 * This is the flow behind it, and the shape follows two rules that come
 * from how the rest of the site already works.
 *
 * A free listing is created unverified. The directory only shows rows
 * that are active, verified and not hidden, and the admin's Approve
 * button is exactly `is_verified = 1`, so an unverified row is already
 * the pending state and needs no new queue to sit in. Anybody can type
 * anything into a public form; a curated local directory that publishes
 * it unread stops being curated on its first spam day.
 *
 * A paid listing is verified by the webhook when the payment settles.
 * Paying is a better spam filter than a queue, and making somebody who
 * has just handed over money wait on us to press a button is the worst
 * first impression this product could give.
 *
 * Registration never signs anybody in. Anyone can type any address into
 * this form, and an account minted for an address you do not own would
 * later inherit that person's orders, because order matching is by
 * email. Proving the address is what the login codes already do, so
 * this hands off to them.
 */

export type Plan = "basic" | "monthly" | "annual";

export type RegistrationInput = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  category: string;
  locationArea: string;
  plan: Plan;
};

export type RegistrationResult =
  | {
      ok: true;
      businessId: number;
      slug: string;
      userId: number;
      /** Premium: the caller sends them to Stripe next. */
      needsPayment: boolean;
    }
  | { ok: false; errors: Record<string, string>; error: string };

const fail = (field: string, message: string): RegistrationResult => ({
  ok: false,
  errors: { [field]: message },
  error: message,
});

/**
 * Checks the form, then creates the account and the listing.
 *
 * Two of these checks are refusals rather than validation, and both
 * exist so registration cannot be used to reach an existing record:
 * an address that already has an account is sent to sign in, and one
 * that already has a listing is sent to claim it. Creating a second
 * account for an address is how somebody ends up with their orders on
 * one login and their listing on another.
 */
export async function registerBusiness(
  input: RegistrationInput,
): Promise<RegistrationResult> {
  const businessName = input.businessName.trim();
  const email = input.email.trim().toLowerCase();
  const contactName = input.contactName.trim();

  if (businessName.length < 2) {
    return fail("businessName", "Enter your business name.");
  }
  if (!looksLikeEmail(email)) {
    return fail("email", "Enter a valid email address.");
  }

  const website = normalizeUrl(input.website ?? "");
  if (website === null) {
    return fail("website", "That does not look like a web address.");
  }

  const phone = (input.phone ?? "").trim();
  if (phone) {
    const { looksLikePhone } = await import("@/lib/profile");
    if (!looksLikePhone(phone)) {
      return fail("phone", "That does not look like a phone number.");
    }
  }

  const description = (input.description ?? "").trim().slice(0, 4000);

  // Category and area are slugs the directory filters on, so a value
  // off the list would produce a listing that appears nowhere.
  const { getFilterOptions } = await import("@/lib/directory");
  const options = await getFilterOptions();
  if (!options.categories.some((c) => c.slug === input.category)) {
    return fail("category", "Choose a category from the list.");
  }
  if (!options.locations.some((l) => l.slug === input.locationArea)) {
    return fail("locationArea", "Choose an area from the list.");
  }

  const { db } = await import("@/lib/db");

  const existingUser = (await db.execute(
    sql`SELECT id FROM directory_users WHERE email = ${email} LIMIT 1`,
  )) as unknown as [{ id: number }[]];
  if (existingUser[0]?.[0]) {
    return fail(
      "email",
      "There is already an account for that address. Sign in and add your listing from there.",
    );
  }

  const existingListing = (await db.execute(
    sql`SELECT id FROM directory_businesses WHERE email = ${email} LIMIT 1`,
  )) as unknown as [{ id: number }[]];
  if (existingListing[0]?.[0]) {
    return fail(
      "email",
      "We already have a listing for that address. Sign in and you can claim it.",
    );
  }

  const user = await createPortalUser(email, contactName.split(" ")[0] ?? "");
  if (!user) {
    return {
      ok: false,
      errors: {},
      error: "We could not create your account just now. Try again shortly.",
    };
  }

  const paid = input.plan !== "basic";
  const created = await createBusiness({
    name: businessName,
    category: input.category,
    locationArea: input.locationArea,
    email,
    phone,
    website,
    description,
    // Paid listings are verified by the webhook once the money lands,
    // never here: this runs before Stripe has been anywhere near it.
    isVerified: false,
    planType: "basic",
  });

  // createBusiness is the admin's path and does not link an owner, so
  // the link is made here. Without it the new listing would show as
  // claimable rather than owned, and the person who just typed it in
  // would be asked to claim their own business.
  await db.execute(
    sql`UPDATE directory_businesses SET user_id = ${user.id} WHERE id = ${created.id}`,
  );

  return {
    ok: true,
    businessId: created.id,
    slug: created.slug,
    userId: user.id,
    needsPayment: paid,
  };
}
