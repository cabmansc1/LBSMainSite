import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth";

/** Every /admin page calls this first; non-admins land on admin login. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/admin/login");
  return session;
}
