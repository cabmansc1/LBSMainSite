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
};

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
    return { id: data.id, email: data.email, firstName: data.firstName };
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
