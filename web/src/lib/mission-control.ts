import "server-only";
import {
  UPCOMING_MAILINGS,
  artworkDeadlineFrom,
  isBookable,
  type CardRoute,
  type UpcomingMailing,
} from "@/lib/mailings";
import { sameBusiness } from "@/lib/name-match";
import { ZONES } from "@/lib/zones";

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

/**
 * Mission Control issues three tiers, and the key is chosen by what it
 * can do rather than by the order somebody happened to write them in.
 *
 *   MC_API_KEY            master:   everything
 *   MC_API_KEY_WRITE      write:    all GET/HEAD, plus exactly the three
 *                                   POSTs this adapter needs
 *   MC_API_KEY_READONLY   readonly: all GET/HEAD, no writes
 *
 * The write tier is a superset of readonly, so it must be preferred over
 * it. The old order put MC_API_KEY_WRITE last, behind readonly, which
 * meant a variable named for writing could never take effect while a
 * read-only key existed. Setting the write key did nothing, gave no
 * error, and looked exactly like setting it correctly.
 */
export const mcKey = () => rawKey()?.trim() || undefined;

/**
 * Which variable supplied the key. Reported by /api/version, because
 * "the key is wrong" and "the key came from somewhere you did not
 * expect" look identical from outside and one of them cost us a day.
 */
export const mcKeySource = (): string => {
  if (process.env.MC_API_KEY?.trim()) return "MC_API_KEY (master)";
  if (process.env.MC_API_KEY_WRITE?.trim()) return "MC_API_KEY_WRITE (read+write)";
  if (process.env.MC_API_KEY_READONLY?.trim()) return "MC_API_KEY_READONLY (read only)";
  return "none";
};

const rawKey = () =>
  // Trimmed at the boundary: a key pasted into a hosting dashboard picks
  // up whitespace with no visible sign, and a stray newline is not a
  // valid header value, which throws inside fetch and takes down every
  // read as well as every write.
  process.env.MC_API_KEY ||
  process.env.MC_API_KEY_WRITE ||
  process.env.MC_API_KEY_READONLY;

/**
 * Mission Control is a different box on a different network, and a page
 * render must not wait on it indefinitely. Without this a hanging MC
 * takes every page that reads a card down with it, which is exactly what
 * broke the build: eleven zone pages each sat for the full 60 second
 * limit waiting for a reply that never came.
 */
const MC_TIMEOUT_MS = 6000;

/**
 * Staging must never mutate live Mission Control: a fake advertiser on
 * a real card locks a real category and costs a real sale.
 *
 * The guard used to sit at the top of pushToMissionControl, which made
 * it safe but also blind. Nothing downstream ran, so the one thing you
 * actually want to know from a staging test purchase, whether the
 * payload we would send is correct, was exactly what you could not see.
 *
 * It now sits at the fetch boundary. Every read still happens for real,
 * so card resolution and account dedup are genuinely exercised, and
 * every write logs its full method, path and body and returns a
 * synthetic response so the rest of the sequence keeps going. A staging
 * checkout prints precisely what production would have sent.
 */
const mcWritesBlocked = () => process.env.MC_READ_ONLY === "1";

/** Marks a response that came from the dry run rather than from MC. */
const DRY_RUN_ID = "dry-run";

const mcFetch = async (path: string, init?: RequestInit) => {
  const method = init?.method ?? "GET";
  if (method !== "GET" && mcWritesBlocked()) {
    let body: unknown;
    try {
      body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    } catch {
      body = init?.body;
    }
    console.log(
      "[mission-control read-only] would send:\n" +
        JSON.stringify({ method, path, body }, null, 2),
    );
    // A plausible response, so the caller's next step runs and logs too.
    // Without an id the payment POST after an advertiser create would
    // silently never appear in the log.
    return { id: DRY_RUN_ID, dryRun: true };
  }
  return mcFetchLive(path, init);
};

const mcFetchLive = async (path: string, init?: RequestInit) => {
  // Card/store reads cache for 60s; mutations and dedup lookups must
  // never be cached (a cached empty search result would create
  // duplicate accounts).
  const cacheable = (!init?.method || init.method === "GET") && init?.cache !== "no-store";
  const res = await fetch(`${process.env.MC_BASE_URL}${path}`, {
    signal: AbortSignal.timeout(MC_TIMEOUT_MS),
    ...init,
    redirect: "manual", // a 307 to /login means auth failed; never follow
    headers: {
      ...(mcKey()
        ? {
            Authorization: `Bearer ${mcKey()}`,
            "x-api-key": mcKey() as string,
          }
        : {}),
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...(cacheable ? { next: { revalidate: 60 } } : {}),
  });
  // Not every redirect is an auth failure. MC sends 307 to /login when a
  // key is rejected, but a plain 308 is host or path normalization, which
  // is safe to follow once for a read.
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location") ?? "";
    if (!location || /\/login/i.test(location)) {
      throw new Error(
        `Mission Control ${path}: auth failed (${res.status} -> ${location || "no location"})`,
      );
    }
    const next = new URL(location, `${process.env.MC_BASE_URL}${path}`).toString();
    const followed = await fetch(next, {
      signal: AbortSignal.timeout(MC_TIMEOUT_MS),
      ...init,
      redirect: "manual",
      headers: {
        ...(mcKey()
          ? { Authorization: `Bearer ${mcKey()}`, "x-api-key": mcKey() as string }
          : {}),
        "Content-Type": "application/json",
        ...init?.headers,
      },
      ...(cacheable ? { next: { revalidate: 60 } } : {}),
    });
    if (followed.status >= 300 && followed.status < 400) {
      // The same /login test as above. MC answers a write from a
      // read-only key with 308 to the canonical path first and 307 to
      // /login second, so the rejection only shows up on this hop.
      // Calling that a "redirect loop" sent a real diagnosis looking in
      // entirely the wrong place: the key was the problem, not routing.
      const to = followed.headers.get("location") ?? "";
      throw new Error(
        /\/login/i.test(to)
          ? `Mission Control ${path}: auth failed (${followed.status} -> ${to}). The key cannot write; check MC_API_KEY is the write-scoped one.`
          : `Mission Control ${path}: redirect loop (${followed.status} -> ${to || "?"})`,
      );
    }
    if (!followed.ok) {
      throw new Error(`Mission Control ${path}: ${followed.status} after redirect`);
    }
    return followed.json();
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
  spotsConsumed?: number;
  spotsPurchased?: number;
  pricePerSpot?: number;
  totalAmount?: number;
  amountPaid?: number;
  paymentStatus?: "unpaid" | "partial" | "paid";
  /** Live MC: boolean flag; the locked category is category/primaryCategory. */
  exclusivity?: string | boolean;
  category?: string;
  primaryCategory?: string;
  /** approved | received | requested | in_revision | not_requested */
  artStatus?: string;
};

/**
 * A category an admin has reserved on a card from inside Mission
 * Control, before any advertiser exists for it. Sales staff use these to
 * park a category they are mid-conversation on, so the site has to treat
 * a hold exactly like a sold exclusive.
 */
type McHold = {
  id: string;
  cardId?: string | number;
  category?: string;
  note?: string | null;
};

type McAccount = {
  id?: string;
  businessName?: string;
  category?: string;
  primaryCategory?: string;
  subcategory?: string;
  email?: string;
  phone?: string;
};

type McCardRaw = Record<string, unknown> & {
  id: string | number;
  cardName?: string;
  notes?: string | null;
  area?: string;
  totalSpots?: number;
  status?: string;
  mailDate?: string;
  distribution?: number | string;
  cardsMailed?: number | string;
  spotsFilled?: number;
  advertisers?: McAdvertiser[];
};

type McCard = {
  id: string | number;
  cardName: string;
  routes: CardRoute[];
  zoneSlug: string;
  zoneName: string;
  mailMonth: string;
  artworkDeadline?: string;
  artworkDeadlineIso?: string;
  households?: string;
  spotsTotal: number;
  spotsTaken: number;
  status: UpcomingMailing["status"];
  advertisers: McAdvertiser[];
  isPast: boolean;
  mailDateIso: string;
};

/**
 * A row parked on a card for prospecting, not a customer.
 *
 * Sales staff add a business to a card to see how it would sit there and
 * to hold the category while the conversation happens. Until this, that
 * row was indistinguishable from a sale: it showed up in the business's
 * own portal as though they had bought the spot, which is how it was
 * found.
 *
 * The test is no money attached and nothing paid. Checked against the
 * live store: of 13 unpaid rows, ten carry a real agreed price and are
 * genuine deals waiting on payment, so unpaid alone would have hidden
 * paying customers from their own account. And $0 alone is no good
 * either, because 25 rows are $0 and marked paid, which are the comps
 * and trades. Only the two together mean nobody has bought anything.
 *
 * Prospects still consume their spot and still lock their category on
 * the public site. Parking a category mid-conversation is the point of
 * the row, and releasing it could let somebody buy it out from under the
 * deal being worked.
 */
function isProspectRow(a: McAdvertiser): boolean {
  const owed = Number(a.totalAmount) || 0;
  const paid = Number(a.amountPaid) || 0;
  return owed === 0 && paid === 0 && a.paymentStatus !== "paid" &&
    a.paymentStatus !== "partial";
}

/** "Aug 28", matching the format the sample schedule already quotes. UTC
 *  because the mail date is date-only and local time would shift it. */
function formatDeadline(d: Date | undefined): string | undefined {
  return d
    ? d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : undefined;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const str = (v: unknown, fallback = ""): string =>
  v === undefined || v === null ? fallback : String(v);

/** MC area names that map onto a different site zone. */
const ZONE_ALIASES: Record<string, string> = {
  "north-mount-pleasant": "mount-pleasant",
  nexton: "summerville",
};

/**
 * Card names that name a place more precisely than the card's area does.
 *
 * The Kiawah/Seabrook card is filed under Mount Pleasant in Mission
 * Control, but those islands share ZIP 29455 with Johns Island and mail
 * with it, so the area is wrong and the name is right. A name only wins
 * when it matches one of these deliberately, never by guess.
 */
const CARD_NAME_ZONES: { match: RegExp; zone: string }[] = [
  { match: /\bkiawah\b|\bseabrook\b/i, zone: "johns-island" },
];

/** Live MC statuses: filling = selling now; in_production = closed for
 * print; mailed = history. */
const isPastStatus = (s: string) =>
  ["mailed", "shipped", "archived", "cancelled", "completed"].includes(s);

const formatMailMonth = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || "TBD";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

/**
 * "Other" is Mission Control's placeholder for unclassified, not a
 * category. Treating it as one is how a card full of advertisers ends up
 * blocking nothing and describing nothing.
 */
const realCategory = (c?: string) =>
  c && c.trim() && c.trim().toLowerCase() !== "other" ? c.trim() : undefined;

const num = (v: string) => {
  const n = Number(String(v).replace(/[$,\s%]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Mission Control keeps the USPS route table in the card's notes as
 * pasted spreadsheet rows:
 *
 *   Route  Residential  Business  Total  Age: 25-34  Size  Income  Cost
 *   29483-R039  667  13  680  10.8%  2.68  $101,970  $167.96
 *
 * Parsing it is what lets the site say which part of town a card covers,
 * which matters the moment a zone has two cards filling at once.
 *
 * Only the route code and the delivery counts are kept. The cost and
 * demographic columns are dropped here, at the boundary, so they never
 * reach a page or a payload in the first place.
 */
function parseRoutes(notes?: string | null): CardRoute[] {
  if (!notes) return [];
  const out: CardRoute[] = [];
  for (const line of notes.split(/\r?\n/)) {
    const cells = line.split("\t").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 4) continue;
    const code = cells[0];
    const m = /^(\d{5})-([A-Z]?\d+)$/i.exec(code);
    if (!m) continue; // header row, or a note that is not a route
    const residential = num(cells[1]);
    const business = num(cells[2]);
    const total = num(cells[3]);
    if (total === undefined) continue;
    out.push({
      code,
      zip: m[1],
      residential: residential ?? 0,
      business: business ?? 0,
      total,
    });
  }
  return out;
}

/**
 * A card's zone, from its area, or from its name when the area does not
 * identify one.
 *
 * Mission Control's area list does not cover every zone we sell, so a
 * card for a missing one gets filed under "Other". That happened to the
 * August Moncks Corner card, and because the site drops "Other" rather
 * than publishing a zone page for it, the card vanished from the site
 * while filling. The card name says what the area could not, so it is
 * worth reading before giving up.
 */
function zoneFromCard(area: string, cardName: string) {
  // A name that names a place beats an area that contradicts it.
  const named = CARD_NAME_ZONES.find((c) => c.match.test(cardName));
  if (named) {
    const zone = ZONES.find((z) => z.slug === named.zone);
    if (zone) return { slug: zone.slug, name: zone.name };
  }

  const areaSlug = slugify(area);
  const mapped = ZONE_ALIASES[areaSlug] ?? areaSlug;
  if (mapped && mapped !== "other" && ZONES.some((z) => z.slug === mapped)) {
    return { slug: mapped, name: area };
  }

  const nameSlug = slugify(cardName);
  const byName = ZONES.find(
    (z) => nameSlug === z.slug || nameSlug.startsWith(`${z.slug}-`),
  );
  if (byName) return { slug: byName.slug, name: byName.name };

  return { slug: mapped, name: area };
}

function normalizeCard(raw: McCardRaw, advertisers: McAdvertiser[]): McCard {
  const rawArea = str(raw.area ?? raw.name ?? raw.title);
  const zone = zoneFromCard(rawArea, str(raw.cardName));
  const zoneName = zone.name;
  const spotsTotal = Number(raw.totalSpots ?? 11);
  // Enriched rows carry spotsFilled; raw store rows fall back to
  // summing each advertiser's consumed spots.
  const explicitTaken = raw.spotsFilled ?? raw.spotsTaken ?? raw.spotsSold;
  const spotsTaken =
    explicitTaken !== undefined && explicitTaken !== null
      ? Number(explicitTaken)
      : advertisers.reduce(
          (n, a) => n + (a.spotsConsumed ?? a.spotsPurchased ?? 1),
          0,
        );

  const statusRaw = str(raw.status, "open").toLowerCase();
  // Full and waitlist win over planned: a planned card with every spot
  // sold is full, and saying "planned" would invite an order that
  // cannot be placed. Planned only decides how an available card is
  // described.
  const status: UpcomingMailing["status"] =
    statusRaw.includes("wait") ? "waitlist"
    : statusRaw === "in_production" || spotsTaken >= spotsTotal ? "full"
    : statusRaw.includes("plan") ? "planned"
    : "open";

  const mailDate = str(raw.mailDate ?? raw.mailMonth ?? raw.month);
  const routes = parseRoutes(raw.notes);

  // Reach, in order of how much we trust it.
  //
  // Mission Control's distribution figure wins. It is the quantity being
  // bought and printed, set deliberately at 2,500 / 5,000 / 10,000. The
  // route table is a working document: routes get added and dropped
  // right up to the print deadline, so its sum is provisional. Quoting
  // it as reach would mean publishing 2,680 today and 2,910 next week,
  // each one looking like a promise.
  //
  // Under both sat a literal "5,000+", a zone-level sales figure that is
  // not a fact about any card at all. That is gone: a card with no
  // reach we can stand behind now reports none.
  const explicit = raw.distribution ?? raw.cardsMailed ?? raw.households;
  const explicitNum =
    typeof explicit === "number"
      ? explicit
      : explicit !== undefined && explicit !== null && String(explicit).trim()
        ? Number(String(explicit).replace(/[^0-9]/g, ""))
        : NaN;
  const routeTotal = routes.reduce((n, r) => n + r.total, 0);
  const reach =
    Number.isFinite(explicitNum) && explicitNum > 0
      ? explicitNum
      : routeTotal > 0
        ? routeTotal
        : undefined;

  // Mission Control has no artwork deadline field, verified against the
  // live store: a card carries mailDate and startDate and nothing else
  // date-like. So every screen that offered to show a deadline has been
  // rendering nothing at all. Derive it from the mail date the same way
  // the order receipt already does, from the single ARTWORK_LEAD_DAYS
  // constant the advertise page quotes too. An explicit value still wins, in
  // case Mission Control grows the field later.
  //
  // Not derived for a planned card. A lead time counted back from a date
  // nobody has committed to is not a deadline, and printing one is how a customer
  // ends up rushing artwork for a mailing that later moves. An explicit
  // deadline from Mission Control still shows, because somebody typing
  // one in is somebody committing to it.
  const explicitDeadline = str(raw.artworkDeadline ?? raw.deadline).trim();
  const deadline =
    explicitDeadline ||
    (status === "planned" ? "" : formatDeadline(artworkDeadlineFrom(mailDate)));
  // Judged on the derived date, never on the displayed string. See the
  // note on UpcomingMailing.artworkDeadlineIso: a display string has no
  // year, and this has to agree with artworkDueFor, which derives too.
  const deadlineDate = status === "planned" ? undefined : artworkDeadlineFrom(mailDate);

  return {
    id: raw.id,
    cardName: str(raw.cardName),
    routes,
    zoneSlug: zone.slug,
    zoneName,
    mailMonth: formatMailMonth(mailDate),
    artworkDeadline: deadline || undefined,
    artworkDeadlineIso: deadlineDate?.toISOString(),
    households: reach !== undefined ? reach.toLocaleString("en-US") : undefined,
    spotsTotal,
    spotsTaken,
    status,
    advertisers,
    // A card with no mail date is normally history: Mission Control
    // clears the date when a card is done. A planned card is the
    // opposite, and treating it as past filed a mailing that has not
    // happened under an advertiser's past campaigns.
    isPast: isPastStatus(statusRaw) || (!mailDate && status !== "planned"),
    mailDateIso: mailDate,
  };
}

/**
 * Category an advertiser holds on their card. Being on the card is what
 * holds it: the product is one business per category per card, so an
 * advertiser with a category has that category, full stop.
 *
 * This used to require the exclusivity flag to be set, which made the
 * whole promise depend on a checkbox somebody remembered to tick. It
 * was not always ticked. Dip My Ryde sat on the Downtown Summerville
 * card as Automotive with the flag off, so checkout happily offered
 * Automotive to the next automotive business that came along. Selling
 * the same category twice costs a refund and the reputation of the one
 * thing we promise; a wrong block costs a phone call.
 *
 * "Other" is still not a category to lock. It is Mission Control's
 * placeholder for unclassified, and locking it would block every
 * unclassified business at once. Advertisers are enriched from their
 * account before this runs, so by here the real classification is
 * usually present.
 */
const advertiserCategory = (a: McAdvertiser): string | undefined => {
  // A string exclusivity names the locked category outright and beats
  // the advertiser's own classification.
  if (typeof a.exclusivity === "string" && a.exclusivity) {
    const named = realCategory(a.exclusivity);
    if (named) return named;
  }
  return realCategory(a.category) ?? realCategory(a.primaryCategory);
};

/* ---------- reads ---------- */

type McStore = {
  pipelineCards?: McCardRaw[];
  pipelineAdvertisers?: McAdvertiser[];
  spotlightHolds?: McHold[];
  accounts?: McAccount[];
};

/**
 * The whole Mission Control snapshot. Every read the site does comes out
 * of this one document, and mcFetch caches it for 60s, so asking for it
 * in several places costs one request per minute in total.
 */
async function fetchStore(): Promise<McStore | null> {
  if (!mcEnabled()) return null;
  try {
    return (await mcFetch("/api/store")) as McStore;
  } catch (e) {
    console.error("MC /api/store failed:", e);
    return null;
  }
}

async function fetchCards(): Promise<McCard[] | null> {
  if (!mcEnabled()) return null;
  try {
    // Primary: the store snapshot. The enriched cards list has activity
    // numbers but does NOT nest advertisers (verified against live MC),
    // and category locks need advertiser records, so the snapshot with
    // a cardId join is the one source that has everything.
    {
      const store = (await fetchStore()) ?? {};
      if (Array.isArray(store.pipelineCards)) {
        // An advertiser row is a snapshot taken when the business was
        // placed on the card, and it goes stale: nearly all of them still
        // read category "Other" while the account behind them says HVAC or
        // Roofing, and a business renamed in Mission Control keeps its old
        // name on every card it ever rode. The account is the record that
        // gets maintained, so it wins.
        const accounts = new Map(
          (store.accounts ?? [])
            .filter((a) => a.id)
            .map((a) => [String(a.id), a]),
        );
        const enrich = (a: McAdvertiser): McAdvertiser => {
          const acct = a.accountId ? accounts.get(String(a.accountId)) : undefined;
          if (!acct) return a;
          return {
            ...a,
            businessName: acct.businessName?.trim() || a.businessName,
            // Contact details are on the account far more often than on
            // the card row, and the card row is the stale snapshot. This
            // is what decides whether an advertiser can be emailed about
            // artwork at all, so it is worth reaching for.
            email: a.email?.trim() || acct.email?.trim() || a.email,
            phone: a.phone?.trim() || acct.phone?.trim() || a.phone,
            // The card-specific category wins when it says something, since
            // that is the exclusivity that was actually sold; otherwise the
            // account's classification fills the gap.
            category:
              realCategory(a.category) ??
              realCategory(acct.category) ??
              realCategory(acct.primaryCategory) ??
              a.category,
          };
        };

        const byCard = new Map<string, McAdvertiser[]>();
        for (const a of store.pipelineAdvertisers ?? []) {
          const key = String(a.cardId);
          byCard.set(key, [...(byCard.get(key) ?? []), enrich(a)]);
        }
        return store.pipelineCards
          .map((c) => normalizeCard(c, byCard.get(String(c.id)) ?? []))
          .filter((c) => c.zoneName);
      }
    }
    // Fallback: enriched cards (no advertisers, so no category locks,
    // but availability still works via spotsFilled).
    const list = (await mcFetch("/api/pipeline/cards")) as McCardRaw[];
    if (!Array.isArray(list)) return null;
    return list
      .map((c) => normalizeCard(c, c.advertisers ?? []))
      .filter((c) => c.zoneName);
  } catch (e) {
    console.error("Mission Control read failed, serving fallback:", e);
    return null;
  }
}

/**
 * Sample mailings are a local-development convenience only. Once
 * MC_BASE_URL is configured, Mission Control is the sole authority: if
 * it is unreachable or has nothing upcoming, pages show an empty state
 * rather than an invented schedule a customer could act on.
 */
export async function getUpcomingMailings(): Promise<UpcomingMailing[]> {
  const cards = await fetchCards();
  if (!cards || cards.length === 0) return mcEnabled() ? [] : UPCOMING_MAILINGS;
  // A card whose mail date has gone by is history whatever its status
  // says. Mission Control statuses are moved by hand, so a card can sit
  // in production weeks after it landed in mailboxes, and calling that
  // the next mailing puts a date in the past in front of a buyer.
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = cards
    .filter(
      (c) =>
        !c.isPast &&
        c.zoneName.toLowerCase() !== "other" &&
        (!c.mailDateIso || c.mailDateIso.slice(0, 10) >= today),
    )
    // Soonest first, but a card with no date yet goes last rather than
    // first: an empty string sorts before every real date, which put
    // the least certain card at the top of the calendar.
    .sort((a, b) => {
      if (!a.mailDateIso !== !b.mailDateIso) return a.mailDateIso ? -1 : 1;
      return a.mailDateIso.localeCompare(b.mailDateIso);
    });
  if (upcoming.length === 0) return mcEnabled() ? [] : UPCOMING_MAILINGS;
  return upcoming.map((c) => ({
    cardId: String(c.id),
    cardName: c.cardName || undefined,
    routes: c.routes.length ? c.routes : undefined,
    zoneSlug: c.zoneSlug,
    zoneName: c.zoneName,
    mailMonth: c.mailMonth,
    artworkDeadline: c.artworkDeadline,
    artworkDeadlineIso: c.artworkDeadlineIso,
    households: c.households,
    spotsTotal: c.spotsTotal,
    spotsTaken: c.spotsTaken,
    status: c.status,
  }));
}

/** Every card currently open in a zone, soonest first. */
export async function getZoneMailings(zoneSlug: string): Promise<UpcomingMailing[]> {
  const all = await getUpcomingMailings();
  // Through the card, not the zone. Isle of Palms and Sullivan's Island
  // share one, and whichever of the two Mission Control filed it under,
  // both pages have to find it: matching the slug alone left one island
  // showing "coming soon" for a card that was already selling.
  const { getLiveMailingAreaFor } = await import("@/lib/zone-store");
  const slugs = (await getLiveMailingAreaFor(zoneSlug))?.zoneSlugs ?? [zoneSlug];
  return all.filter((m) => slugs.includes(m.zoneSlug));
}

/** The soonest card in a zone. Prefer getZoneMailings where a zone can
 *  have more than one card filling at the same time. */
export async function getZoneMailing(zoneSlug: string) {
  const all = await getZoneMailings(zoneSlug);
  return all[0];
}

/**
 * Categories an admin reserved on a card inside Mission Control. These
 * are not sold yet, but they are spoken for, so the site must not let
 * anyone buy them.
 */
async function heldCategoriesForCard(cardId: string | number): Promise<string[]> {
  const store = await fetchStore();
  return (store?.spotlightHolds ?? [])
    .filter((h) => String(h.cardId) === String(cardId))
    .map((h) => (h.category ?? "").trim())
    .filter(Boolean);
}

const uniqueCategories = (values: string[]): string[] => {
  const seen = new Map<string, string>();
  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, v.trim());
  }
  return [...seen.values()];
};

export async function getTakenCategoriesForCard(cardId: string): Promise<string[]> {
  const cards = await fetchCards();
  if (!cards) return [];
  const card = cards.find((c) => String(c.id) === String(cardId));
  if (!card) return [];
  const sold = card.advertisers
    .map(advertiserCategory)
    .filter((c): c is string => !!c);
  return uniqueCategories([...sold, ...(await heldCategoriesForCard(card.id))]);
}

export async function getTakenCategories(zoneSlug: string): Promise<string[]> {
  const cards = await fetchCards();
  // Samples are a local-development convenience only. With MC configured
  // but unreachable, returning the sample list would block real sales in
  // those categories, so report none taken and let the order through;
  // the paid push to MC surfaces any genuine clash.
  if (!cards) return mcEnabled() ? [] : ["Plumbing", "Dental"];
  // isPast as well as status: a mailed card normalizes to "open",
  // because the status ladder only demotes waitlist and in_production.
  // Reading exclusivity off a card that already landed in mailboxes
  // reports categories taken that are free on the card being sold.
  const card = cards.find(
    (c) => c.zoneSlug === zoneSlug && !c.isPast && isBookable(c.status),
  );
  if (!card) return [];
  const sold = card.advertisers
    .map(advertiserCategory)
    .filter((c): c is string => !!c);
  return uniqueCategories([...sold, ...(await heldCategoriesForCard(card.id))]);
}

/**
 * The same question as getTakenCategories, answered honestly.
 *
 * The two functions above return an empty array for three situations
 * that are not the same thing: Mission Control could not be reached, the
 * card id matched nothing, and the card genuinely has no advertisers
 * yet. For anything that draws a screen that conflation is harmless and
 * deliberate, because a card that renders as empty during an outage is a
 * cosmetic problem.
 *
 * For a sale it is not harmless. Treating "we could not ask" as "nothing
 * is taken" is how two plumbers end up on one card, and category
 * exclusivity is the entire product. The clash does surface later, when
 * the paid order is pushed to Mission Control, but later means after the
 * customer's money is taken and the fix is a refund and an apology.
 *
 * So the checkout uses this instead, and refuses rather than guesses. A
 * customer asked to try again in a minute is a far smaller cost than a
 * printed card carrying two of the same trade.
 */
export type TakenCheck =
  | { ok: true; taken: string[] }
  | { ok: false; reason: "unreachable" | "unknown-card" };

/**
 * Whether a card can still be sold, checked against Mission Control
 * rather than trusted from the page that submitted the order.
 *
 * The picker already filters to `!isPast && isBookable(status)`, but
 * filtering a list is not enforcing a rule: the page a customer is
 * looking at may have been rendered before the card closed. A tab left
 * open on Monday will happily post an order on Thursday for a card that
 * went to print on Wednesday.
 */
export type CardSaleState =
  | { ok: true; zoneSlug: string; status: UpcomingMailing["status"] }
  | { ok: false; reason: "unreachable" | "unknown-card" | "not-bookable" };

export async function checkCardForSale(cardId: string): Promise<CardSaleState> {
  const cards = await fetchCards();
  if (!cards) return { ok: false, reason: "unreachable" };
  const card = cards.find((c) => String(c.id) === String(cardId));
  if (!card) return { ok: false, reason: "unknown-card" };
  if (card.isPast || !isBookable(card.status)) {
    return { ok: false, reason: "not-bookable" };
  }
  return { ok: true, zoneSlug: card.zoneSlug, status: card.status };
}

export async function checkTakenForCard(cardId: string): Promise<TakenCheck> {
  const cards = await fetchCards();
  if (!cards) return { ok: false, reason: "unreachable" };
  const card = cards.find((c) => String(c.id) === String(cardId));
  if (!card) return { ok: false, reason: "unknown-card" };
  const sold = card.advertisers
    .map(advertiserCategory)
    .filter((c): c is string => !!c);
  return {
    ok: true,
    taken: uniqueCategories([...sold, ...(await heldCategoriesForCard(card.id))]),
  };
}

export async function checkTakenForZone(zoneSlug: string): Promise<TakenCheck> {
  const cards = await fetchCards();
  if (!cards) {
    // Without Mission Control configured at all this is local
    // development, where the sample list is the intended behaviour and
    // there is no real money to protect.
    return mcEnabled()
      ? { ok: false, reason: "unreachable" }
      : { ok: true, taken: ["Plumbing", "Dental"] };
  }
  const card = cards.find(
    (c) => c.zoneSlug === zoneSlug && !c.isPast && isBookable(c.status),
  );
  // No open card in the zone is a real answer, not a failure: there is
  // nothing to clash with because there is nothing to sell.
  if (!card) return { ok: true, taken: [] };
  const sold = card.advertisers
    .map(advertiserCategory)
    .filter((c): c is string => !!c);
  return {
    ok: true,
    taken: uniqueCategories([...sold, ...(await heldCategoriesForCard(card.id))]),
  };
}

/**
 * Postcard appearances for a business (any card, past or upcoming),
 * matched by email or normalized business name. Powers the "As seen on
 * the … Spotlight card" badge on directory listings.
 */
export async function advertiserAppearances(match: {
  name?: string;
  email?: string;
}): Promise<
  {
    cardId: string;
    cardName?: string;
    zoneName: string;
    mailMonth: string;
    mailDateIso: string;
  }[]
> {
  const cards = await fetchCards();
  if (!cards) return [];
  const email = match.email?.toLowerCase();
  const seen: {
    cardId: string;
    cardName?: string;
    zoneName: string;
    mailMonth: string;
    mailDateIso: string;
  }[] = [];
  for (const card of cards) {
    for (const a of card.advertisers) {
      // Names differ between the two systems more often than not, so an
      // exact compare quietly denies a listing the card it was on.
      if (
        (email && a.email?.toLowerCase() === email) ||
        (match.name && a.businessName && sameBusiness(match.name, a.businessName))
      ) {
        seen.push({
          cardId: String(card.id),
          cardName: card.cardName || undefined,
          zoneName: card.zoneName,
          mailMonth: card.mailMonth,
          mailDateIso: card.mailDateIso,
        });
        break;
      }
    }
  }
  // Deduped by card, not by zone and month. A zone can print two cards
  // in the same month, and a business on both really did ride two cards;
  // collapsing them undercounts what they paid for. The listing tells
  // them apart by card name. Newest first.
  const unique = new Map<string, (typeof seen)[number]>();
  for (const a of seen) {
    if (!unique.has(a.cardId)) unique.set(a.cardId, a);
  }
  return [...unique.values()].sort((a, b) =>
    (b.mailDateIso ?? "").localeCompare(a.mailDateIso ?? ""),
  );
}

/* ---------- writes ---------- */

type SignupEvent = {
  type: "checkout_started" | "order_paid" | "waitlist_joined" | "lead";
  businessName?: string;
  email?: string;
  phone?: string;
  category?: string;
  zoneSlug?: string;
  /**
   * The exact card bought, carried from checkout through Stripe
   * metadata. A zone is not a card: Summerville has two filling at
   * once, and picking by zone alone put a paid advertiser on whichever
   * one came back first, locking their category on the wrong card.
   */
  cardId?: string;
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
  // Writes are blocked at the fetch boundary rather than here, so a
  // read-only environment still runs the whole sequence and logs every
  // request it would have made. See mcWritesBlocked.
  try {
    if (event.type === "order_paid" && (event.cardId || event.zoneSlug)) {
      const cards = await fetchCards();
      // The card they actually bought, by id. Falling back to the zone
      // is for older orders that predate the id being carried through;
      // with two cards filling in one zone that fallback is a coin
      // flip, so it warns rather than passing silently.
      let card = event.cardId
        ? cards?.find((c) => String(c.id) === String(event.cardId))
        : undefined;
      if (!card) {
        if (event.cardId) {
          console.error(
            `[mission-control] order ${event.reference ?? "?"} names card ${event.cardId}, which MC does not have. Falling back to zone.`,
          );
        }
        // !isPast matters as much as the status: a mailed card
        // normalizes to "open", so without it a paid advertiser could be
        // written onto a card that was already printed and delivered.
        const open = cards?.filter(
          (c) => c.zoneSlug === event.zoneSlug && !c.isPast && isBookable(c.status),
        );
        if (open && open.length > 1) {
          console.error(
            `[mission-control] order ${event.reference ?? "?"} has no card id and ${event.zoneSlug} has ${open.length} cards open. Placing on ${open[0].id}; verify by hand.`,
          );
        }
        card = open?.[0];
      }
      if (!card) {
        throw new Error(
          `no MC card for order ${event.reference ?? "?"} (card ${event.cardId ?? "none"}, zone ${event.zoneSlug ?? "none"})`,
        );
      }

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
            // Both, because they mean different things to MC. Its
            // handler treats `exclusivity` as a boolean flag, so a
            // category name sent there is coerced to `true` and the
            // category never reaches the advertiser row. The site still
            // resolved it, by enriching from the account MC creates
            // alongside, but MC's own views read the row and showed a
            // blank category on a paid advertiser.
            category: event.category,
            primaryCategory: event.category,
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

/**
 * Every card an advertiser is on, current and past, for the portal.
 * Matching is by email first (exact), then by normalized business name,
 * mirroring how advertiserAppearances resolves identity.
 */
export type AdvertiserCard = {
  cardId: string;
  zoneSlug: string;
  zoneName: string;
  mailMonth: string;
  mailDateIso: string;
  artworkDeadline?: string;
  households?: string;
  spotsTotal: number;
  spotsTaken: number;
  isPast: boolean;
  status: UpcomingMailing["status"];
  /** The advertiser's own record on that card. */
  adSize: string;
  category: string;
  amountCents?: number;
  amountPaidCents?: number;
  paymentStatus?: string;
  /** Mission Control's artwork state for this advertiser on this card. */
  artStatus: string;
};

export async function getAdvertiserCards(match: {
  name?: string;
  email?: string;
}): Promise<AdvertiserCard[]> {
  const cards = await fetchCards();
  if (!cards) return [];
  const email = match.email?.toLowerCase();

  const out: AdvertiserCard[] = [];
  for (const card of cards) {
    const mine = card.advertisers.find(
      (a) =>
        // A prospect is a row we parked to hold a category, not something
        // the business bought. Showing it here tells them they are on a
        // card they have never agreed to, which is worse than showing
        // nothing at all.
        !isProspectRow(a) &&
        ((email && a.email?.toLowerCase() === email) ||
          (match.name && a.businessName && sameBusiness(match.name, a.businessName))),
    );
    if (!mine) continue;
    out.push({
      cardId: String(card.id),
      zoneSlug: card.zoneSlug,
      zoneName: card.zoneName,
      mailMonth: card.mailMonth,
      mailDateIso: card.mailDateIso,
      artworkDeadline: card.artworkDeadline,
      households: card.households,
      spotsTotal: card.spotsTotal,
      spotsTaken: card.spotsTaken,
      isPast: card.isPast,
      status: card.status,
      adSize: str(mine.adSize, "Spot"),
      category: str(mine.category ?? mine.primaryCategory),
      amountCents:
        typeof mine.totalAmount === "number"
          ? Math.round(mine.totalAmount * 100)
          : undefined,
      amountPaidCents:
        typeof mine.amountPaid === "number"
          ? Math.round(mine.amountPaid * 100)
          : undefined,
      paymentStatus: mine.paymentStatus,
      artStatus: str(mine.artStatus).trim().toLowerCase(),
    });
  }
  return out.sort((a, b) => b.mailDateIso.localeCompare(a.mailDateIso));
}

/**
 * The category vocabulary Mission Control actually uses.
 *
 * Exclusivity is checked against MC's category strings, so the site has
 * to offer the same names or nothing ever matches. Derived from the
 * advertiser records rather than a hardcoded list, so a category added
 * in MC shows up here on its own. "Other" sorts last because it is a
 * catch-all, not a trade.
 */
export type CategoryVocabulary = {
  /** Where the words came from, so the admin can see sync is working. */
  source: "registry" | "derived" | "none";
  categories: {
    name: string;
    /** A business in MC carries this category. */
    onAccounts: boolean;
    /** Someone has bought this category on a card. */
    onCards: boolean;
    /** An admin reserved it on a card in MC. */
    held: boolean;
  }[];
};

const sortCategories = (all: string[]): string[] => {
  const unique = uniqueCategories(all);
  // "Other" is a catch-all, so it belongs at the bottom of the picker
  // rather than alphabetically among real trades.
  const other = unique.filter((c) => c.toLowerCase() === "other");
  const rest = unique
    .filter((c) => c.toLowerCase() !== "other")
    .sort((a, b) => a.localeCompare(b));
  return [...rest, ...other];
};

/**
 * The category vocabulary the site sells against.
 *
 * Mission Control owns it. If MC grows a managed registry at
 * /api/categories that becomes the sole source, which is what lets a new
 * category added in MC appear here without a deploy. Until then the
 * vocabulary is derived from the snapshot, and derived widely on
 * purpose: an account carrying a category, an advertiser already on a
 * card, and a category an admin has held all count, so a trade shows up
 * on the site as soon as MC knows the word, not only after it has sold.
 */
export async function getMcCategories(): Promise<string[]> {
  if (!mcEnabled()) return [];

  // Preferred: a registry MC manages deliberately.
  try {
    const registry = (await mcFetch("/api/categories")) as
      | string[]
      | { categories?: unknown; name?: unknown }[]
      | { categories?: unknown[] };
    const rows = Array.isArray(registry)
      ? registry
      : Array.isArray(registry?.categories)
        ? registry.categories
        : [];
    const names = rows
      .map((r) =>
        typeof r === "string"
          ? r
          : String(
              (r as { name?: unknown; label?: unknown; category?: unknown })?.name ??
                (r as { label?: unknown })?.label ??
                (r as { category?: unknown })?.category ??
                "",
            ),
      )
      .filter(Boolean);
    if (names.length) return sortCategories(names);
  } catch {
    // No registry yet. Fall through to deriving from the snapshot.
  }

  const store = await fetchStore();
  if (!store) return [];
  const fromAccounts = (store.accounts ?? []).flatMap((a) => [
    a.category ?? "",
    a.primaryCategory ?? "",
  ]);
  const fromAdvertisers = (store.pipelineAdvertisers ?? []).flatMap((a) => [
    a.category ?? "",
    a.primaryCategory ?? "",
  ]);
  const fromHolds = (store.spotlightHolds ?? []).map((h) => h.category ?? "");
  return sortCategories(
    [...fromAccounts, ...fromAdvertisers, ...fromHolds]
      .map((c) => c.trim())
      .filter(Boolean),
  );
}

/**
 * The same vocabulary, annotated with where each word came from. The
 * admin Categories screen uses this to prove the sync: add a category in
 * Mission Control and it appears here, and on the checkout picker,
 * within the 60 second cache window.
 */
export async function getCategoryVocabulary(): Promise<CategoryVocabulary> {
  const names = await getMcCategories();
  if (names.length === 0) return { source: "none", categories: [] };

  const store = await fetchStore();
  const set = (values: string[]) =>
    new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean));
  const accounts = set(
    (store?.accounts ?? []).flatMap((a) => [a.category ?? "", a.primaryCategory ?? ""]),
  );
  const cards = set(
    (store?.pipelineAdvertisers ?? []).flatMap((a) => [
      a.category ?? "",
      a.primaryCategory ?? "",
    ]),
  );
  const holds = set((store?.spotlightHolds ?? []).map((h) => h.category ?? ""));

  const categories = names.map((name) => {
    const key = name.toLowerCase();
    return {
      name,
      onAccounts: accounts.has(key),
      onCards: cards.has(key),
      held: holds.has(key),
    };
  });
  // If a name is in the list that no snapshot record explains, it can
  // only have come from a managed registry.
  const source: CategoryVocabulary["source"] = categories.some(
    (c) => !c.onAccounts && !c.onCards && !c.held,
  )
    ? "registry"
    : "derived";
  return { source, categories };
}

/**
 * One card by Mission Control id, past ones included, with the
 * advertisers that rode it.
 *
 * A mailed card is public by definition: it went to thousands of
 * mailboxes. Only the business name and category come back, which is
 * what was printed on it. Payment state, amounts and contact details
 * stay where they belong.
 */
export async function getMcCardById(cardId: string): Promise<
  | {
      cardId: string;
      cardName?: string;
      zoneSlug: string;
      zoneName: string;
      mailMonth: string;
      mailDateIso: string;
      households?: string;
      routes: CardRoute[];
      advertisers: { businessName: string; category?: string }[];
    }
  | undefined
> {
  const cards = await fetchCards();
  const card = cards?.find((c) => String(c.id) === String(cardId));
  if (!card) return undefined;
  const seen = new Set<string>();
  const advertisers = card.advertisers
    .map((a) => ({
      businessName: (a.businessName ?? "").trim(),
      category: (a.category ?? a.primaryCategory ?? "").trim() || undefined,
    }))
    .filter((a) => {
      const key = a.businessName.toLowerCase();
      if (!a.businessName || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return {
    cardId: String(card.id),
    cardName: card.cardName || undefined,
    zoneSlug: card.zoneSlug,
    zoneName: card.zoneName,
    mailMonth: card.mailMonth,
    mailDateIso: card.mailDateIso,
    households: card.households,
    routes: card.routes,
    advertisers,
  };
}

/** Every card Mission Control knows about, newest first. Powers the
 *  admin picker, which has to offer cards that have already mailed. */
export async function getAllMcCards(): Promise<
  {
    cardId: string;
    cardName?: string;
    zoneSlug: string;
    zoneName: string;
    mailMonth: string;
    mailDateIso: string;
    isPast: boolean;
  }[]
> {
  const cards = await fetchCards();
  if (!cards) return [];
  return cards
    .filter((c) => c.zoneName)
    .sort((a, b) => b.mailDateIso.localeCompare(a.mailDateIso))
    .map((c) => ({
      cardId: String(c.id),
      cardName: c.cardName || undefined,
      zoneSlug: c.zoneSlug,
      zoneName: c.zoneName,
      mailMonth: c.mailMonth,
      mailDateIso: c.mailDateIso,
      isPast: c.isPast,
    }));
}

/**
 * Who is riding a card that has not printed yet, with the address we
 * would have to chase for artwork.
 *
 * Deliberately includes advertisers with no email on file. They are the
 * ones most at risk of a card going to print with a hole in it, and
 * leaving them out of the list is how they stay missed.
 */
export type RosterCard = {
  cardId: string;
  cardName: string;
  zoneName: string;
  mailMonth: string;
  mailDateIso: string;
  artworkDeadline?: string;
  advertisers: {
    businessName: string;
    email: string;
    phone: string;
    adSize: string;
    /** Mission Control's own artwork state: approved, received,
     *  requested, in_revision, not_requested. It is maintained by hand
     *  and it is the answer for the great majority of advertisers, who
     *  sent their file long before this app could take one. */
    artStatus: string;
    /** Parked for prospecting. Holds its spot and category, but has
     *  bought nothing, so nobody should be chased for artwork. */
    isProspect: boolean;
  }[];
};

/** Null, not an empty array, when Mission Control could not be read. The
 *  difference is "nobody owes artwork" versus "we cannot tell", and a
 *  print deadline is the wrong place to confuse the two. */
export async function getUpcomingCardRoster(): Promise<RosterCard[] | null> {
  const cards = await fetchCards();
  if (!cards) return null;
  return cards
    .filter((c) => !c.isPast && c.zoneName)
    .sort((a, b) => a.mailDateIso.localeCompare(b.mailDateIso))
    .map((c) => ({
      cardId: String(c.id),
      cardName: c.cardName || `${c.zoneName}, ${c.mailMonth}`,
      zoneName: c.zoneName,
      mailMonth: c.mailMonth,
      mailDateIso: c.mailDateIso,
      artworkDeadline: c.artworkDeadline,
      advertisers: c.advertisers
        .filter((a) => (a.businessName ?? "").trim())
        .map((a) => ({
          businessName: str(a.businessName).trim(),
          email: str(a.email).trim(),
          phone: str(a.phone).trim(),
          adSize: str(a.adSize, "Spot"),
          artStatus: str(a.artStatus).trim().toLowerCase(),
          isProspect: isProspectRow(a),
        })),
    }));
}

/**
 * Did a paid order actually land on its card in Mission Control?
 *
 * The webhook fires the placement as fire-and-forget, inside the
 * markPaid idempotency guard. That guard is right, since without it a
 * Stripe retry would put the advertiser on the card twice, but it means
 * the push gets exactly one attempt. If it fails, the customer has paid,
 * the order says paid, and nobody is on the card. The only trace is a
 * line in a log nobody reads at two in the morning.
 *
 * So ask the question directly, from the order rather than from the log.
 */
export type PlacementCheck =
  | { state: "placed"; cardId: string; cardName?: string }
  | { state: "missing"; cardId: string; cardName?: string }
  | { state: "no-card" }
  | { state: "unknown" };

export async function checkOrderPlacement(order: {
  cardId?: string;
  zoneSlug?: string;
  businessName: string;
  email?: string;
}): Promise<PlacementCheck> {
  const cards = await fetchCards();
  // Mission Control unreachable is not the same as an order gone
  // missing, and reporting it as one would cry wolf on every blip.
  if (!cards) return { state: "unknown" };

  let card = order.cardId
    ? cards.find((c) => String(c.id) === String(order.cardId))
    : undefined;
  if (!card && order.zoneSlug) {
    // Orders taken before the card id was recorded only know their
    // zone. Check every card in it: the advertiser being on any of them
    // means the placement worked, even if we cannot say which one was
    // bought.
    const inZone = cards.filter((c) => c.zoneSlug === order.zoneSlug);
    const found = inZone.find((c) => cardHasAdvertiser(c, order));
    if (found) return { state: "placed", cardId: String(found.id), cardName: found.cardName || undefined };
    card = inZone.find((c) => !c.isPast && isBookable(c.status)) ?? inZone[0];
  }
  if (!card) return { state: "no-card" };

  return {
    state: cardHasAdvertiser(card, order) ? "placed" : "missing",
    cardId: String(card.id),
    cardName: card.cardName || undefined,
  };
}

/**
 * Email first and exact, then the conservative name matcher, mirroring
 * how the portal resolves the same identity. A buyer who typed a
 * different email at checkout than the one on their MC account is
 * common enough that name matching has to be the fallback.
 */
function cardHasAdvertiser(
  card: McCard,
  order: { businessName: string; email?: string },
): boolean {
  const email = order.email?.trim().toLowerCase();
  return card.advertisers.some(
    (a) =>
      (!!email && a.email?.trim().toLowerCase() === email) ||
      (!!a.businessName && sameBusiness(order.businessName, a.businessName)),
  );
}
