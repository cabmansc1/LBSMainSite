import "server-only";
import { sql } from "drizzle-orm";

/**
 * Writes to the legacy `leads` table, the one process_form.php and
 * save-quiz-lead.php have always written to and admin/leads.php reads.
 *
 * The table name has no prefix and the schema is owned by the PHP site,
 * so nothing here creates or alters it. Every other runtime table in
 * this app is an `lbs_` table it made itself; this one is shared with a
 * system still in production, and a CREATE TABLE that guessed a column
 * width wrong would be worse than a missing row.
 *
 * getAdminLeads() in lib/admin-data.ts is the read side.
 */

export type LeadInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
  location: string;
  distributionReach: string;
  adSize: string;
  /** Dollars, matching the PHP float bind, not cents. */
  adPrice: number;
  packageDescription: string;
  ipAddress: string | null;
  userAgent: string | null;
};

/**
 * Column widths are not in this repo (there is no schema dump and the
 * PHP never declared them), and MySQL in strict mode rejects the whole
 * INSERT when one value overruns its column. Clamping to lengths the
 * legacy forms could never have exceeded means a long paste costs a few
 * characters instead of the entire lead.
 */
const cut = (value: string, max: number) => value.slice(0, max);

export async function recordLead(input: LeadInput): Promise<boolean> {
  try {
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`INSERT INTO leads (
            company_name, contact_name, email, phone, notes,
            location, distribution_reach, ad_size, ad_price, package_description,
            ip_address, user_agent, created_at
          ) VALUES (
            ${cut(input.companyName, 190)}, ${cut(input.contactName, 190)},
            ${cut(input.email, 190)}, ${cut(input.phone, 40)},
            ${cut(input.notes, 5000)}, ${cut(input.location, 190)},
            ${cut(input.distributionReach, 40)}, ${cut(input.adSize, 80)},
            ${input.adPrice}, ${cut(input.packageDescription, 190)},
            ${input.ipAddress ? cut(input.ipAddress, 45) : null},
            ${input.userAgent ? cut(input.userAgent, 255) : null},
            NOW()
          )`,
    );
    return true;
  } catch (e) {
    // The caller decides what to tell the visitor. It cannot promise a
    // callback on a lead that is only in a log line, so this returns a
    // value rather than throwing.
    console.error("[leads] could not record lead:", e);
    return false;
  }
}
