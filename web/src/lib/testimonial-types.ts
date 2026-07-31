/**
 * The shape of a testimonial, with no data access attached.
 *
 * Separate from lib/testimonials.ts because the admin editor is a
 * client component and that module is server-only: importing the type
 * from there drags a database driver across the client boundary and
 * fails the build with a message that names neither file.
 */
export type Testimonial = {
  id?: number;
  quote: string;
  author: string;
  detail: string;
  placements: string[];
  /** 1 to 5, or null when the review did not carry one. */
  rating?: number | null;
  approved?: boolean;
  /** Always shown first, ahead of the rotation. */
  pinned?: boolean;
};
