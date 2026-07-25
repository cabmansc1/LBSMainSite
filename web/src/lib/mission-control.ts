import "server-only";
import { UPCOMING_MAILINGS, type UpcomingMailing } from "@/lib/mailings";

/**
 * Mission Control adapter, wired to MC's real API surface:
 *
 *   GET  /api/store                          full snapshot (primary read)
 *   GET  /api/pipeline/cards                 card list (light fallback)
 *   POST /api/pipeline/cards/{id}/advertisers  place advertiser on card
 *   POST /api/pipeline/advertisers/{id}/payment  record payment
 *   GET/POST /api/accounts                   advertiser accounts
 *
 * MC is the source of truth: the site reads availability from it and
 * reports checkouts/payments into it. Reads cache for 60s; the inbound
 * webhook (/api/mission-control/webhook) busts that early.
 *
 * Field names on MC records are normalized defensively (see pick())
 * until a sample /api/store payload locks the exact shape. Env:
 *   MC_BASE_URL   e.g. https://mc.example.com  (no trailing slash)
 *   MC_API_KEY    sent as Authorization: Bearer and x-api-key
 *   MC_WEBHOOK_SECRET  inbound webhook shared secret
 */

export const mcEnabled = () => !!process.env.MC_BASE_URL;

const mcFetch = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${process.env.MC_BASE_URL}${path}`, {
    ...init,
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
    next: init?.method && init.method !== "GET" ? undefined : { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Mission Control ${path}: ${res.status}`);
  return res.json();
};

/* ---------- normalization ---------- */

type McRecord = Record<string, unknown>;

/** First present-and-defined of several possible field spellings. */
const pick = <T,>(obj: McRecord, keys: string[], fallback: T): T => {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return fallback;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

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
  advertisers: { category?: string; name?: string }[];
};

function normalizeCard(raw: McRecord): McCard {
  const zoneName = String(
    pick(raw, ["zone", "zone_name", "area", "neighborhood", "name", "title"], ""),
  );
  const advertisersRaw = pick<McRecord[]>(
    raw,
    ["advertisers", "spots", "slots", "members"],
    [],
  );
  const spotsTotal = Number(
    pick(raw, ["total_spots", "spots_total", "capacity", "max_spots"], 11),
  );
  const spotsTaken = Number(
    pick(
      raw,
      ["spots_taken", "taken", "filled", "sold"],
      Array.isArray(advertisersRaw) ? advertisersRaw.length : 0,
    ),
  );
  const statusRaw = String(pick(raw, ["status", "state"], "open")).toLowerCase();
  const status: UpcomingMailing["status"] =
    statusRaw.includes("wait") ? "waitlist"
    : statusRaw.includes("full") || spotsTaken >= spotsTotal ? "full"
    : statusRaw.includes("open") || statusRaw.includes("active") ? "open"
    : "open";

  return {
    id: pick(raw, ["id", "card_id", "uuid"], ""),
    zoneSlug: slugify(String(pick(raw, ["zone_slug", "slug"], zoneName))),
    zoneName,
    mailMonth: String(
      pick(raw, ["mail_month", "mail_date", "mails_at", "mailing_date", "month"], "TBD"),
    ),
    artworkDeadline: String(
      pick(raw, ["artwork_deadline", "deadline", "print_deadline", "due"], "TBD"),
    ),
    households: String(pick(raw, ["households", "homes", "reach"], "5,000+")),
    spotsTotal,
    spotsTaken,
    status,
    advertisers: (Array.isArray(advertisersRaw) ? advertisersRaw : []).map((a) => ({
      category: pick<string | undefined>(a, ["category", "industry", "trade"], undefined),
      name: pick<string | undefined>(a, ["name", "business_name", "business"], undefined),
    })),
  };
}

/* ---------- reads ---------- */

async function fetchCards(): Promise<McCard[] | null> {
  if (!mcEnabled()) return null;
  try {
    // Prefer the snapshot; fall back to the cards list.
    let raw: unknown;
    try {
      const store = (await mcFetch("/api/store")) as McRecord;
      raw = pick(store, ["cards", "pipeline_cards", "pipeline"], null) ?? store;
    } catch {
      raw = await mcFetch("/api/pipeline/cards");
    }
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as McRecord)?.cards)
        ? ((raw as McRecord).cards as McRecord[])
        : null;
    if (!list) return null;
    return list.map(normalizeCard).filter((c) => c.zoneName);
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
    .map((a) => a.category)
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
 * Report site activity into Mission Control. Paid orders become real
 * pipeline records: the advertiser is placed on the matching card and
 * the payment recorded, so MC's board reflects online sales without
 * manual entry. Other events create/annotate accounts. All writes are
 * fire-and-forget: MC being down must never break a checkout.
 */
export async function pushToMissionControl(event: SignupEvent): Promise<void> {
  if (!mcEnabled()) {
    console.log("[mission-control preview] would push:", event.type, event.businessName ?? "");
    return;
  }
  try {
    if (event.type === "order_paid" && event.zoneSlug) {
      const cards = await fetchCards();
      const card = cards?.find(
        (c) => c.zoneSlug === event.zoneSlug && c.status === "open",
      );
      if (!card) throw new Error(`no open MC card for zone ${event.zoneSlug}`);

      const advertiser = (await mcFetch(
        `/api/pipeline/cards/${card.id}/advertisers`,
        {
          method: "POST",
          body: JSON.stringify({
            name: event.businessName,
            business_name: event.businessName,
            email: event.email,
            phone: event.phone,
            category: event.category,
            spot: event.spot,
            source: "website",
          }),
        },
      )) as McRecord;

      const advertiserId = pick(advertiser, ["id", "advertiser_id"], null);
      if (advertiserId !== null && event.amountCents) {
        await mcFetch(`/api/pipeline/advertisers/${advertiserId}/payment`, {
          method: "POST",
          body: JSON.stringify({
            amount: event.amountCents / 100,
            amount_cents: event.amountCents,
            method: "stripe",
            reference: event.reference,
            source: "website",
          }),
        });
      }
      return;
    }

    // Leads, waitlist joins, and started checkouts become accounts so
    // they appear in MC's follow-up queue.
    await mcFetch("/api/accounts", {
      method: "POST",
      body: JSON.stringify({
        name: event.businessName,
        business_name: event.businessName,
        email: event.email,
        phone: event.phone,
        category: event.category,
        zone: event.zoneSlug,
        note: `website:${event.type}${event.spot ? ` (${event.spot})` : ""}`,
        source: "website",
      }),
    });
  } catch (e) {
    console.error("Mission Control push failed (event logged for sweep):", e, event);
  }
}
