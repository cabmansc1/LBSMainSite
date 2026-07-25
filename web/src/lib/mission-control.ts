import "server-only";
import { UPCOMING_MAILINGS, type UpcomingMailing } from "@/lib/mailings";

/**
 * Mission Control adapter. MC is the source of truth for card inventory
 * and signups: the site READS availability from it and WRITES signups
 * and paid orders into it. Everything goes through this one file, so
 * pointing it at the real API is a matter of filling three env vars:
 *
 *   MC_BASE_URL        e.g. https://missioncontrol.example.com/api
 *   MC_API_KEY         bearer token for reads and writes
 *   MC_WEBHOOK_SECRET  shared secret MC uses to push changes to us
 *
 * Until those exist, reads fall back to the sample schedule and writes
 * are logged no-ops, so every page and flow stays testable. The exact
 * endpoint paths below are a first guess and will be adjusted to match
 * Mission Control's real API once it is shared.
 */

export const mcEnabled = () => !!process.env.MC_BASE_URL && !!process.env.MC_API_KEY;

const mcFetch = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${process.env.MC_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MC_API_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    // Availability must be fresh-ish but not hammer MC on every render.
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Mission Control ${path}: ${res.status}`);
  return res.json();
};

/** Upcoming mailings with spot counts, MC first, sample fallback. */
export async function getUpcomingMailings(): Promise<UpcomingMailing[]> {
  if (!mcEnabled()) return UPCOMING_MAILINGS;
  try {
    const data = await mcFetch("/mailings/upcoming");
    if (Array.isArray(data) && data.length > 0) return data as UpcomingMailing[];
  } catch (e) {
    console.error("Mission Control read failed, serving fallback:", e);
  }
  return UPCOMING_MAILINGS;
}

export async function getZoneMailing(zoneSlug: string) {
  const all = await getUpcomingMailings();
  return all.find((m) => m.zoneSlug === zoneSlug);
}

/** Categories already exclusive on a mailing, MC first. */
export async function getTakenCategories(zoneSlug: string): Promise<string[]> {
  if (!mcEnabled()) return ["Plumbing", "Dental"]; // sample
  try {
    const data = await mcFetch(`/mailings/${encodeURIComponent(zoneSlug)}/taken-categories`);
    if (Array.isArray(data)) return data.map(String);
  } catch (e) {
    console.error("Mission Control read failed, serving fallback:", e);
  }
  return [];
}

type SignupEvent = {
  type: "checkout_started" | "order_paid" | "waitlist_joined" | "lead";
  businessName?: string;
  email?: string;
  phone?: string;
  category?: string;
  zoneSlug?: string;
  spot?: string;
  amountCents?: number;
  reference?: string;
};

/**
 * Push a signup/order event into Mission Control. Fire-and-forget from
 * request paths: an MC outage must never block a customer's checkout,
 * so failures log and the event is retried by the reconciliation sweep.
 */
export async function pushToMissionControl(event: SignupEvent): Promise<void> {
  if (!mcEnabled()) {
    console.log("[mission-control preview] would push:", event.type, event.businessName ?? "");
    return;
  }
  try {
    await mcFetch("/events", {
      method: "POST",
      body: JSON.stringify({ ...event, source: "website", at: new Date().toISOString() }),
    });
  } catch (e) {
    console.error("Mission Control push failed (event queued for sweep):", e);
  }
}
