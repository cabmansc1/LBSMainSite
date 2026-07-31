/**
 * Types only, with no `server-only` import and no database access.
 *
 * The admin component is a client component, and importing the real
 * module for a type would drag mysql2 and sharp into the browser bundle
 * and fail the build. That has happened twice on this project, so the
 * shape lives on its own and both sides import it from here.
 */

export type Category = "business_photos" | "blog" | "card_ads";

export type CategorySurvey = {
  category: Category;
  label: string;
  remaining: number;
  done: number;
  missing: number;
  failed: number;
};
