import "server-only";
import { UPCOMING_MAILINGS, type UpcomingMailing } from "@/lib/mailings";

/**
 * Mission Control adapter, locked to MC's real contract (from its type
 * definitions and middleware):
 *
 * Auth: Authorization: Bearer <key> OR x-api-key (either passes).
 * Failure is a 307 redirect to /login, NOT a 401, so redirects are
 * never followed and any 3xx/non-2xx counts as failure.
 *
 * Reads (all fields camelCase):
 *   GET /api/pipeline/cards       enriched cards incl. activity (primary)
 *   GET /api/store                snapshot fallback: pipelineCards[] +
 *                                 pipelineAdvertisers[] joined by cardId
 * Card canonical fields: area, totalSpots. Advertiser fields: id,
 * cardId, businessName, adSize, spotsPurchased, totalAmount,
 * amountPaid, paymentStatus, exclusivity, ...
 *
 * Writes:
 *   POST /api/pipeline/cards/{id}/advertisers   place paid advertiser
 *   POST /api/pipeline/advertisers/{id}/payment record the payment
 *   GET  /api/accounts?search=<email>           dedup check (MC only
 *                                               dedupes by slug, so we
 *                                               match exact email first)
 *   POST /api/accounts                          create lead account
 */

export const mcEnabled = () => !!process.env.MC_BASE_URL;

const mcFetch = async (path: string, init?: RequestInit) => {
  // Card/store reads cache for 60s; mutations and dedup lookups must
  // never be cached (a cached empty search result would create
  // duplicate accounts).
  const cacheable = (!init?.method || init.method === "GET") && init?.cache !== "no-store";
  const res = await fetch(`${process.env.MC_BASE_URL}${path}`, {
    ...init,
    redirect: "manual", // a 307 to /login means auth failed; never follow
    headers: {
      ...(process.env.MC_API_KEY
        ? {
            Authorization: `Bearer ${process.env.MC_API_KEY}`,
            "x-api-key": process.env.MC_API_KEY,
          }
        : {}),
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...(cacheable ? { next: { revalidate: 60 } } : {}),
  });
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`Mission Control ${path}: auth failed (redirected)`);
  }
  if (!res.ok) throw new Error(`Mission Control ${path}: ${res.status}`);
  return res.json();
};

/* ---------- types matching MC ---------- */

type McAdvertiser = {
  id: string | number;
  cardId?: string | number;
  accountId?: string;
  businessName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  adSize?: string;
  spotsPurchased?: number;
  pricePerSpot?: number;
  totalAmount?: number;
  amountPaid?: number;
  paymentStatus?: "unpaid" | "partial" | "paid";
  exclusivity?: string | boolean;
  category?: string;
};

type McCardRaw = Record<string, unknown> & {
  id: string | number;
  area?: string;
  totalSpots?: number;
  status?: string;
  advertisers?: McAdvertiser[];
};

type McCard = {
  id: string | number;
  zoneSlug: string;
  zoneName: string;
  mailMonth: string;
  artworkDeadline: string;
  households: string;
  spotsTotal: number;
  spotsTaken: number;
  status: UpcomingMailing["status"];
  advertisers: McAdvertiser[];
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const str = (v: unknown, fallback = ""): string =>
  v === undefined || v === null ? fallback : String(v);

function normalizeCard(raw: McCardRaw, advertisers: McAdvertiser[]): McCard {
  const zoneName = str(raw.area ?? raw.name ?? raw.title);
  const spotsTotal = Number(raw.totalSpots ?? 11);
  // Prefer an explicit activity field; otherwise sum purchased spots.
  const explicitTaken = raw.spotsTaken ?? raw.spotsFilled ?? raw.spotsSold;
  const spotsTaken =
    explicitTaken !== undefined && explicitTaken !== null
      ? Number(explicitTaken)
      : advertisers.reduce((n, a) => n + (a.spotsPurchased ?? 1), 0);

  const statusRaw = str(raw.status, "open").toLowerCase();
  const status: UpcomingMailing["status"] =
    statusRaw.includes("wait") ? "waitlist"
    : statusRaw.includes("full") || spotsTaken >= spotsTotal ? "full"
    : "open";

  return {
    id: raw.id,
    zoneSlug: slugify(zoneName),
    zoneName,
    mailMonth: str(raw.mailMonth ?? raw.mailDate ?? raw.month, "TBD"),
    artworkDeadline: str(raw.artworkDeadline ?? raw.deadline ?? raw.printDeadline, "TBD"),
    households: str(raw.households ?? raw.homes, "5,000+"),
    spotsTotal,
    spotsTaken,
    status,
    advertisers,
  };
}

/** Category an advertiser holds exclusively on their card. */
const advertiserCategory = (a: McAdvertiser): string | undefined => {
  if (typeof a.exclusivity === "string" && a.exclusivity) return a.exclusivity;
  return a.category;
};

/* ---------- reads ---------- */

async function fetchCards(): Promise<McCard[] | null> {
  if (!mcEnabled()) return null;
  try {
    // Primary: enriched cards with nested advertisers (activity).
    try {
      const list = (await mcFetch("/api/pipeline/cards")) as McCardRaw[];
      if (Array.isArray(list)) {
        return list
          .map((c) => normalizeCard(c, c.advertisers ?? []))
          .filter((c) => c.zoneName);
      }
    } catch (e) {
      console.error("MC /api/pipeline/cards failed, trying /api/store:", e);
    }
    // Fallback: raw snapshot, join advertisers by cardId ourselves.
    const store = (await mcFetch("/api/store")) as {
      pipelineCards?: McCardRaw[];
      pipelineAdvertisers?: McAdvertiser[];
    };
    if (!Array.isArray(store.pipelineCards)) return null;
    const byCard = new Map<string, McAdvertiser[]>();
    for (const a of store.pipelineAdvertisers ?? []) {
      const key = String(a.cardId);
      byCard.set(key, [...(byCard.get(key) ?? []), a]);
    }
    return store.pipelineCards
      .map((c) => normalizeCard(c, byCard.get(String(c.id)) ?? []))
      .filter((c) => c.zoneName);
  } catch (e) {
    console.error("Mission Control read failed, serving fallback:", e);
    return null;
  }
}

export async function getUpcomingMailings(): Promise<UpcomingMailing[]> {
  const cards = await fetchCards();
  if (!cards || cards.length === 0) return UPCOMING_MAILINGS;
  return cards.map((c) => ({
    zoneSlug: c.zoneSlug,
    zoneName: c.zoneName,
    mailMonth: c.mailMonth,
    artworkDeadline: c.artworkDeadline,
    households: c.households,
    spotsTotal: c.spotsTotal,
    spotsTaken: c.spotsTaken,
    status: c.status,
  }));
}

export async function getZoneMailing(zoneSlug: string) {
  const all = await getUpcomingMailings();
  return all.find((m) => m.zoneSlug === zoneSlug);
}

export async function getTakenCategories(zoneSlug: string): Promise<string[]> {
  const cards = await fetchCards();
  if (!cards) return ["Plumbing", "Dental"]; // sample fallback
  const card = cards.find((c) => c.zoneSlug === zoneSlug && c.status === "open");
  if (!card) return [];
  return card.advertisers
    .map(advertiserCategory)
    .filter((c): c is string => !!c);
}

/* ---------- writes ---------- */

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
 * MC's POST /api/accounts dedupes by slug only (same name creates
 * joes-pizza-1; same email is never caught), so we search for an exact
 * email match before creating.
 */
async function ensureAccount(event: SignupEvent): Promise<void> {
  if (event.email) {
    try {
      const results = (await mcFetch(
        `/api/accounts?search=${encodeURIComponent(event.email)}`,
        { cache: "no-store" },
      )) as { email?: string }[];
      if (
        Array.isArray(results) &&
        results.some(
          (a) => a.email?.toLowerCase() === event.email!.toLowerCase(),
        )
      ) {
        return; // already known; do not create a duplicate
      }
    } catch (e) {
      console.error("MC account search failed, skipping create to avoid dupes:", e);
      return;
    }
  }

  await mcFetch("/api/accounts", {
    method: "POST",
    body: JSON.stringify({
      businessName: event.businessName ?? event.email ?? "Website lead",
      email: event.email,
      phone: event.phone,
      category: event.category,
      city: event.zoneSlug
        ? event.zoneSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : undefined,
      state: "SC",
      tags: ["website"],
      nextAction: `Website ${event.type.replace("_", " ")}${event.spot ? ` (${event.spot})` : ""}`,
    }),
  });
}

/**
 * Report site activity into Mission Control. Paid orders become real
 * pipeline records; other events become accounts in the follow-up
 * queue. Fire-and-forget: MC being down must never break a checkout.
 */
export async function pushToMissionControl(event: SignupEvent): Promise<void> {
  if (!mcEnabled()) {
    console.log("[mission-control preview] would push:", event.type, event.businessName ?? "");
    return;
  }
  // Staging safety: with MC_READ_ONLY set (or a read-only key), writes
  // are never attempted, so no staging bug can mutate live MC data.
  if (process.env.MC_READ_ONLY === "1") {
    console.log("[mission-control read-only] suppressed write:", event.type, event.businessName ?? "");
    return;
  }
  try {
    if (event.type === "order_paid" && event.zoneSlug) {
      const cards = await fetchCards();
      const card = cards?.find(
        (c) => c.zoneSlug === event.zoneSlug && c.status === "open",
      );
      if (!card) throw new Error(`no open MC card for zone ${event.zoneSlug}`);

      const dollars = event.amountCents ? event.amountCents / 100 : undefined;
      const advertiser = (await mcFetch(
        `/api/pipeline/cards/${card.id}/advertisers`,
        {
          method: "POST",
          body: JSON.stringify({
            businessName: event.businessName,
            email: event.email,
            phone: event.phone,
            adSize: event.spot,
            spotsPurchased: 1,
            totalAmount: dollars,
            amountPaid: dollars,
            paymentStatus: "paid",
            exclusivity: event.category,
          }),
        },
      )) as { id?: string | number };

      if (advertiser.id !== undefined && dollars) {
        await mcFetch(`/api/pipeline/advertisers/${advertiser.id}/payment`, {
          method: "POST",
          body: JSON.stringify({
            amount: dollars,
            method: "stripe",
            reference: event.reference,
          }),
        });
      }
      return;
    }

    await ensureAccount(event);
  } catch (e) {
    console.error("Mission Control push failed (event logged for sweep):", e, event);
  }
}
