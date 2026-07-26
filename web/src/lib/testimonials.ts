/**
 * Layout samples only. These quotes are NOT from real customers, so they
 * stay hidden unless SHOW_SAMPLE_TESTIMONIALS=1 is set (useful for
 * reviewing the design). Real quotes belong in the testimonials table
 * via the admin, and sections self-hide until there are some.
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

const samplesVisible = () => process.env.SHOW_SAMPLE_TESTIMONIALS === "1";

export const testimonialsFor = (placement: string) =>
  samplesVisible()
    ? TESTIMONIALS.filter((t) => t.placements.includes(placement))
    : [];

/** True when a placement has quotes worth rendering a section for. */
export const hasTestimonials = (placement: string) =>
  testimonialsFor(placement).length > 0;
