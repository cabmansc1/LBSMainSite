import "server-only";
import { ghlSendDetailed, ghlWebhookUrl, describeWebhook } from "@/lib/ghl";
import { buildTags, tagFields } from "@/lib/ghl-tags";
import { composeOrderPush } from "@/lib/order-ghl";

/**
 * Sample payloads, for building the GoHighLevel mapping.
 *
 * An inbound webhook trigger will not let you map fields until it has
 * seen a request, so setting up six workflows otherwise means submitting
 * six real forms and then cleaning up six real leads. This fires the
 * same shapes on demand.
 *
 * Every sample is loudly a sample. The email is on a reserved example
 * domain that can never receive mail, the business name says so, and an
 * `lbs-test` tag makes the lot selectable and deletable in one filter if
 * any reach a live workflow. Building a mapping should not leave debris
 * that looks like a customer.
 */

export const GHL_SURFACES = [
  "advertise",
  "quiz",
  "roi",
  "newsletter",
  "waitlist",
  "order",
] as const;

export type GhlSurface = (typeof GHL_SURFACES)[number];

const TEST_EMAIL = "sample@example.com";
const TEST_NAME = "SAMPLE PAYLOAD, not a real lead";

const withTest = (tags: string[]) => tagFields([...tags, "lbs-test"].sort());

export function sampleFor(surface: GhlSurface): Record<string, unknown> {
  const submitted_at = new Date().toISOString();

  switch (surface) {
    case "advertise":
      return {
        firstName: "Sample",
        lastName: "Payload",
        name: TEST_NAME,
        email: TEST_EMAIL,
        phone: "(843) 555-0100",
        companyName: TEST_NAME,
        source: "Ad Lead: Summerville",
        category: "Plumbing",
        location: "Summerville",
        message: "This is a sample submission used to set up field mapping.",
        package: "",
        ad_size: "",
        distribution_reach: "",
        ad_price: 0,
        ...withTest(
          buildTags({
            kind: "advertise",
            zoneSlug: "summerville",
            category: "Plumbing",
          }),
        ),
        submitted_at,
      };

    case "quiz":
      return {
        email: TEST_EMAIL,
        source: "Quiz Lead: Home Services",
        business_type: "Home Services",
        goal: "Generate Leads",
        mailing_size: 5000,
        budget: 500,
        recommended_ad: "Medium (3x4)",
        recommended_price: 349,
        ...withTest(
          buildTags({
            kind: "quiz",
            category: "Home Services",
            adSize: "Medium (3x4)",
          }),
        ),
        submitted_at,
      };

    case "roi":
      return {
        email: TEST_EMAIL,
        source: "ROI Calculator Lead",
        ad_size: "Large (4x6)",
        distribution_reach: 5000,
        ad_price: 599,
        response_rate: 0.01,
        average_sale: 450,
        projected_customers: 50,
        projected_revenue: 22500,
        projected_roi: 3656,
        ...withTest(buildTags({ kind: "roi", adSize: "Large (4x6)" })),
        submitted_at,
      };

    case "newsletter":
      return {
        email: TEST_EMAIL,
        source: "Newsletter: summerville-direct-mail-marketing",
        signup_type: "newsletter",
        origin: "summerville-direct-mail-marketing",
        ...withTest(
          buildTags({
            kind: "newsletter",
            page: "summerville-direct-mail-marketing",
          }),
        ),
        submitted_at,
      };

    case "waitlist":
      return {
        email: TEST_EMAIL,
        name: TEST_NAME,
        companyName: TEST_NAME,
        source: "Waitlist: Automotive - Repair in Mount Pleasant",
        signup_type: "waitlist",
        category: "Automotive - Repair",
        location: "Mount Pleasant",
        zone: "mount-pleasant",
        ...withTest(
          buildTags({
            kind: "waitlist-category",
            zoneSlug: "mount-pleasant",
            category: "Automotive - Repair",
          }),
        ),
        submitted_at,
      };

    case "order": {
      // Built by the real composer, so the sample cannot drift away from
      // what a genuine purchase sends. That is the whole value of a
      // sample: mapping against it has to mean mapping against the thing.
      const real = composeOrderPush({
        reference: "LBS-SAMPLE",
        email: TEST_EMAIL,
        businessName: TEST_NAME,
        phone: "(843) 555-0100",
        category: "Plumbing",
        zoneSlug: "summerville",
        cardId: "card_sample",
        cardName: "Nexton/Cane Bay",
        mailMonth: "September 2026",
        spot: "medium",
        amountCents: 34900,
      });
      const tags = [...((real.tags as string[]) ?? []), "lbs-test"].sort();
      return { ...real, ...tagFields(tags) };
    }
  }
}

export type SampleResult = {
  surface: GhlSurface;
  configured: boolean;
  accepted: boolean;
  status?: number;
  /** What GoHighLevel answered. A 200 with the wrong body is the tell. */
  reply?: string;
  /** Host and path shape, with the secret segments replaced by lengths. */
  endpoint: string;
  payload: Record<string, unknown>;
};

export async function sendSample(surface: GhlSurface): Promise<SampleResult> {
  const payload = sampleFor(surface);
  const url = ghlWebhookUrl(surface);
  if (!url) {
    return {
      surface,
      configured: false,
      accepted: false,
      endpoint: "not set",
      payload,
    };
  }
  const res = await ghlSendDetailed(payload, surface);
  return {
    surface,
    configured: true,
    accepted: res.ok,
    status: res.status,
    reply: res.body,
    endpoint: res.endpoint || describeWebhook(url),
    payload,
  };
}
