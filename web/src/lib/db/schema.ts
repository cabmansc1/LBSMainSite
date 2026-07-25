import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

/**
 * Tables the NEW app owns (new features). Legacy directory_* and card
 * tables are introspected with `drizzle-kit pull` against staging and
 * land in a generated schema file; they are not redefined by hand here.
 *
 * Naming keeps the existing `directory_` prefix convention where the
 * table is user-facing data, matching getTable() in the PHP config.
 */

export const mailingZones = mysqlTable("mailing_zones", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  zipCodes: varchar("zip_codes", { length: 255 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const postcardMailings = mysqlTable(
  "postcard_mailings",
  {
    id: int("id").primaryKey().autoincrement(),
    zoneId: int("zone_id").notNull(),
    mailDate: timestamp("mail_date").notNull(),
    artworkDeadline: timestamp("artwork_deadline").notNull(),
    reach: varchar("reach", { length: 8 }).notNull().default("5k"),
    status: varchar("status", { length: 16 }).notNull().default("open"),
  },
  (t) => [index("idx_mailings_zone").on(t.zoneId)],
);

export const postcardSpotInventory = mysqlTable(
  "postcard_spot_inventory",
  {
    id: int("id").primaryKey().autoincrement(),
    mailingId: int("mailing_id").notNull(),
    spotSize: varchar("spot_size", { length: 16 }).notNull(),
    capacity: int("capacity").notNull(),
    priceCents: int("price_cents").notNull(),
  },
  (t) => [uniqueIndex("uq_inventory_spot").on(t.mailingId, t.spotSize)],
);

export const postcardOrders = mysqlTable(
  "postcard_orders",
  {
    id: int("id").primaryKey().autoincrement(),
    mailingId: int("mailing_id").notNull(),
    spotSize: varchar("spot_size", { length: 16 }).notNull(),
    userId: int("user_id"),
    businessName: varchar("business_name", { length: 255 }).notNull(),
    categoryId: int("category_id").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    stripeSessionId: varchar("stripe_session_id", { length: 255 }),
    priceCents: int("price_cents").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    holdExpiresAt: timestamp("hold_expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_orders_mailing").on(t.mailingId),
    index("idx_orders_user").on(t.userId),
    // Category exclusivity: one business per category per mailing is
    // enforced in the checkout transaction (FOR UPDATE) because the
    // uniqueness must ignore canceled/expired rows.
    index("idx_orders_category").on(t.mailingId, t.categoryId),
  ],
);

export const testimonials = mysqlTable("testimonials", {
  id: int("id").primaryKey().autoincrement(),
  quote: text("quote").notNull(),
  authorName: varchar("author_name", { length: 128 }).notNull(),
  businessName: varchar("business_name", { length: 128 }),
  businessType: varchar("business_type", { length: 128 }),
  zoneSlug: varchar("zone_slug", { length: 64 }),
  placements: varchar("placements", { length: 255 }).notNull().default("home"),
  sortOrder: int("sort_order").notNull().default(0),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const waitlistEntries = mysqlTable(
  "waitlist_entries",
  {
    id: int("id").primaryKey().autoincrement(),
    zoneId: int("zone_id").notNull(),
    categoryId: int("category_id").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    businessName: varchar("business_name", { length: 255 }),
    notifiedAt: timestamp("notified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_waitlist").on(t.zoneId, t.categoryId, t.email)],
);

export const referrals = mysqlTable("referrals", {
  id: int("id").primaryKey().autoincrement(),
  referrerUserId: int("referrer_user_id").notNull(),
  referredEmail: varchar("referred_email", { length: 255 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("invited"),
  creditCents: int("credit_cents").notNull().default(5000),
  redeemedOrderId: int("redeemed_order_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const qrPages = mysqlTable("qr_pages", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  headline: varchar("headline", { length: 255 }),
  offerText: varchar("offer_text", { length: 255 }),
  destinationUrl: varchar("destination_url", { length: 512 }),
  phone: varchar("phone", { length: 32 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const qrScans = mysqlTable(
  "qr_scans",
  {
    id: int("id").primaryKey().autoincrement(),
    qrPageId: int("qr_page_id").notNull(),
    scannedAt: timestamp("scanned_at").notNull().defaultNow(),
    referer: varchar("referer", { length: 255 }),
  },
  (t) => [index("idx_scans_page").on(t.qrPageId)],
);
