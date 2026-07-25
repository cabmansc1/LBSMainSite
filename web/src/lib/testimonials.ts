/**
 * Placeholder testimonials. Replace quotes and names with real customer
 * quotes during the Phase 2 content pass; the layout is final.
 * Rendered only where placement matches, mirroring the planned
 * testimonials table (placements column).
 */
export type Testimonial = {
  quote: string;
  author: string;
  detail: string;
  placements: string[];
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Our first mailing paid for itself in the first week. We have been on every Summerville card since.",
    author: "[Owner name]",
    detail: "Home services, Summerville",
    placements: ["home", "pricing", "zone:summerville"],
  },
  {
    quote:
      "Being the only dentist on the card is the whole point. New patients mention the postcard at the front desk.",
    author: "[Owner name]",
    detail: "Dental practice, Mount Pleasant",
    placements: ["home", "zone:mount-pleasant"],
  },
  {
    quote:
      "They designed the ad, tracked the calls, and the QR code proved it worked. Easiest marketing we do.",
    author: "[Owner name]",
    detail: "Restaurant, Daniel Island",
    placements: ["home", "pricing", "zone:daniel-island"],
  },
];

export const testimonialsFor = (placement: string) =>
  TESTIMONIALS.filter((t) => t.placements.includes(placement));
