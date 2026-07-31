import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

/**
 * Session auth against the existing directory_users table. Passwords
 * were hashed with PHP password_hash() (bcrypt), which bcryptjs
 * verifies directly, so every existing user keeps their password.
 *
 * Sessions are HMAC-signed cookies (stateless, httpOnly, secure).
 * Swappable for Auth.js later without touching callers: everything goes
 * through getSession()/requireUser().
 */

const COOKIE = "lbs_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export type SessionUser = {
  id: number;
  email: string;
  firstName: string;
  role?: "admin";
  /**
   * Set when an admin is viewing the portal as this advertiser.
   *
   * Carried inside the signed session, so it cannot be removed or
   * forged to escape the restrictions that come with it. Its presence
   * is what blocks buying and password changes: support should be able
   * to see what a customer sees, and nothing more.
   */
  impersonatedBy?: { id: number; email: string };
};

/** True when this session is an admin looking through someone's eyes. */
export const isImpersonating = (u: SessionUser | null): boolean =>
  !!u?.impersonatedBy;

const secret = () => process.env.AUTH_SECRET ?? "dev-only-secret-change-me";

const sign = (payload: string) =>
  createHmac("sha256", secret()).update(payload).digest("base64url");

export function encodeSession(user: SessionUser): string {
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + MAX_AGE * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string): SessionUser | null {
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    const by = data.impersonatedBy;
    return {
      id: data.id,
      email: data.email,
      firstName: data.firstName,
      role: data.role === "admin" ? "admin" : undefined,
      impersonatedBy:
        by && typeof by.id === "number" && typeof by.email === "string"
          ? { id: by.id, email: by.email }
          : undefined,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return token ? decodeSession(token) : null;
}

export async function setSessionCookie(user: SessionUser) {
  const jar = await cookies();
  jar.set(COOKIE, encodeSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Demo account for preview mode (no database configured). */
const PREVIEW_USER = {
  email: "demo@lbspotlight.com",
  password: "demo1234",
  user: { id: 0, email: "demo@lbspotlight.com", firstName: "Demo" },
};

/**
 * Admin verification against campaign_admins (the same table the PHP
 * admin uses), so existing admin credentials keep working. Preview mode
 * uses a demo admin. This replaces the legacy hardcoded email-allowlist
 * authorization from bulk_import.php with a real credential check.
 */
export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  if (!process.env.DB_HOST) {
    return email.toLowerCase() === "admin@lbspotlight.com" &&
      password === "admin1234"
      ? { id: 0, email, firstName: "Admin", role: "admin" }
      : null;
  }

  const { db } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");

  // admin/login.php authenticates on `username` and requires
  // status = 'active'. Some installs also carry an email column, so try
  // username first and fall back to email; SELECT * keeps this working
  // whichever columns the table actually has.
  type AdminRow = Record<string, unknown>;
  const lookups = [
    sql`SELECT * FROM campaign_admins WHERE username = ${email} AND status = 'active' LIMIT 1`,
    sql`SELECT * FROM campaign_admins WHERE email = ${email} AND status = 'active' LIMIT 1`,
  ];

  let admin: AdminRow | undefined;
  for (const query of lookups) {
    try {
      const rows = (await db.execute(query)) as unknown as Array<AdminRow[]>;
      admin = rows[0]?.[0];
      if (admin) break;
    } catch {
      // Column not present on this install; try the next shape.
    }
  }
  if (!admin) return null;

  const hash = String(admin.password_hash ?? "");
  if (!hash) return null;
  const ok = await bcrypt.compare(password, hash);
  if (!ok) return null;

  return {
    id: Number(admin.id),
    email: String(admin.email ?? admin.username ?? email),
    firstName: String(admin.name ?? admin.username ?? "Admin"),
    role: "admin",
  };
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  if (!process.env.DB_HOST) {
    return email.toLowerCase() === PREVIEW_USER.email &&
      password === PREVIEW_USER.password
      ? PREVIEW_USER.user
      : null;
  }

  const { db } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");
  const rows = (await db.execute(
    sql`SELECT id, email, password_hash, first_name FROM directory_users WHERE email = ${email} AND is_active = 1 LIMIT 1`,
  )) as unknown as Array<
    { id: number; email: string; password_hash: string; first_name: string }[]
  >;
  const user = rows[0]?.[0];
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  return ok
    ? { id: user.id, email: user.email, firstName: user.first_name ?? "" }
    : null;
}

/**
 * The portal account for an email, creating one if the address has
 * earned it.
 *
 * Buying is what creates an account, so by the time someone signs in
 * they normally have one. The order lookup here is for the people who
 * bought before that existed, and for the case where the webhook's
 * account creation failed while the payment succeeded. Without it those
 * customers would have orders they could never see.
 *
 * An address with no account, no orders and no listing gets nothing.
 * Sign-in must not be a way to mint accounts for arbitrary emails.
 */
export async function findOrCreatePortalUser(
  emailRaw: string,
): Promise<SessionUser | null> {
  const email = emailRaw.trim().toLowerCase();
  if (!email) return null;

  if (!process.env.DB_HOST) {
    return email === PREVIEW_USER.email ? PREVIEW_USER.user : null;
  }

  const { db } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");

  const existing = (await db.execute(
    sql`SELECT id, email, first_name FROM directory_users
        WHERE email = ${email} AND is_active = 1 LIMIT 1`,
  )) as unknown as [{ id: number; email: string; first_name: string }[]];
  const found = existing[0]?.[0];
  if (found) {
    return { id: found.id, email: found.email, firstName: found.first_name ?? "" };
  }

  // Earned it? An order or a directory listing under this address.
  const claim = (await db.execute(
    sql`SELECT
          (SELECT COUNT(*) FROM lbs_orders WHERE email = ${email}) AS orders,
          (SELECT COUNT(*) FROM directory_businesses WHERE email = ${email}) AS listings`,
  )) as unknown as [{ orders: number | string; listings: number | string }[]];
  const row = claim[0]?.[0];
  if (Number(row?.orders ?? 0) === 0 && Number(row?.listings ?? 0) === 0) {
    return null;
  }

  return createPortalUser(email);
}

/**
 * Creates a portal login for an address.
 *
 * password_hash gets a value bcrypt can never match, rather than being
 * left empty. An empty hash is the kind of thing a future comparison
 * treats as "any password works", and this table is also read by the
 * legacy PHP site, which we are not changing. Codes are the way in
 * until the owner sets a password of their own.
 */
export async function createPortalUser(
  emailRaw: string,
  firstName = "",
): Promise<SessionUser | null> {
  const email = emailRaw.trim().toLowerCase();
  if (!email) return null;
  try {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    const unusable = `$2a$12$${"." .repeat(53)}`;
    await db.execute(
      sql`INSERT INTO directory_users (email, password_hash, first_name, is_active)
          VALUES (${email}, ${unusable}, ${firstName}, 1)`,
    );
    const rows = (await db.execute(
      sql`SELECT id, email, first_name FROM directory_users
          WHERE email = ${email} ORDER BY id DESC LIMIT 1`,
    )) as unknown as [{ id: number; email: string; first_name: string }[]];
    const u = rows[0]?.[0];
    return u ? { id: u.id, email: u.email, firstName: u.first_name ?? "" } : null;
  } catch (e) {
    // Never fatal to the caller. A checkout must not fail because a
    // login could not be created, and a sign-in attempt should say
    // "could not sign you in" rather than surface a database error.
    console.error("[auth] could not create portal user:", e);
    return null;
  }
}
