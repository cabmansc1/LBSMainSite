import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
} from "drizzle-orm/mysql-core";

/**
 * Legacy tables the PHP site owns, mirrored 1:1 so the new app reads the
 * same data (column names verified against Business.php and config.php).
 * The PHP admin keeps writing these until Phase 6; the new app treats
 * them as read-mostly. `drizzle-kit pull` against staging later verifies
 * this mapping byte for byte.
 */

export const businesses = mysqlTable("directory_businesses", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id"),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  category: varchar("category", { length: 128 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 512 }),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 8 }),
  zipCode: varchar("zip_code", { length: 16 }),
  locationArea: varchar("location_area", { length: 128 }),
  description: text("description"),
  extendedDescription: text("extended_description"),
  planType: varchar("plan_type", { length: 32 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isHidden: boolean("is_hidden"),
  isActive: boolean("is_active"),
  isVerified: boolean("is_verified"),
  isFeatured: boolean("is_featured"),
  showHours: boolean("show_hours"),
  viewsCount: int("views_count"),
  inquiriesCount: int("inquiries_count"),
  facebookUrl: varchar("facebook_url", { length: 512 }),
  instagramUrl: varchar("instagram_url", { length: 512 }),
  tiktokUrl: varchar("tiktok_url", { length: 512 }),
  youtubeUrl: varchar("youtube_url", { length: 512 }),
  // Collected by the old signup form and carried by the table since,
  // but read by nothing after the migration, so every LinkedIn URL a
  // business gave us sat in here invisible.
  linkedinUrl: varchar("linkedin_url", { length: 512 }),
  createdAt: timestamp("created_at"),
});

export const blogCategories = mysqlTable("directory_blog_categories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull(),
  displayOrder: int("display_order"),
  isActive: boolean("is_active"),
});

export const blogPosts = mysqlTable("directory_blog_posts", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 280 }).notNull(),
  content: text("content"),
  excerpt: text("excerpt"),
  metaDescription: varchar("meta_description", { length: 320 }),
  featuredImage: varchar("featured_image", { length: 255 }),
  categoryId: int("category_id"),
  status: varchar("status", { length: 16 }),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at"),
});

/* Taxonomy DDL verified against config.php ensureDirectoryTaxonomyTables
   and the live staging error logs: display_name, not name. */
export const categories = mysqlTable("directory_categories", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 150 }).notNull(),
  displayOrder: int("display_order"),
  isActive: boolean("is_active"),
});

export const locations = mysqlTable("directory_locations", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 150 }).notNull(),
  displayOrder: int("display_order"),
  isActive: boolean("is_active"),
});

export const tags = mysqlTable("directory_tags", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 150 }).notNull(),
  categorySlug: varchar("category_slug", { length: 100 }),
  displayOrder: int("display_order"),
  isActive: boolean("is_active"),
});

export const businessTags = mysqlTable("directory_business_tags", {
  businessId: int("business_id").notNull(),
  tagId: int("tag_id").notNull(),
});

/* Columns verified against Business.php getBusinessPhotos ordering and
   business.php photo_type/alt_text usage. */
export const businessPhotos = mysqlTable("directory_business_photos", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  filename: varchar("filename", { length: 255 }),
  altText: varchar("alt_text", { length: 255 }),
  photoType: varchar("photo_type", { length: 32 }),
  isPrimary: boolean("is_primary"),
  sortOrder: int("sort_order"),
  uploadedAt: timestamp("uploaded_at"),
});

export const businessHours = mysqlTable("directory_business_hours", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  dayOfWeek: int("day_of_week").notNull(),
  openTime: varchar("open_time", { length: 16 }),
  closeTime: varchar("close_time", { length: 16 }),
  isClosed: boolean("is_closed"),
});

export const businessOffers = mysqlTable("directory_business_offers", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  terms: text("terms"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active"),
  createdAt: timestamp("created_at"),
});

export const businessInquiries = mysqlTable("directory_business_inquiries", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
