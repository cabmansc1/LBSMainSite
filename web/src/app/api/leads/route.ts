import { after, NextResponse } from "next/server";
import { ghlConfigured, ghlSend } from "@/lib/ghl";
import { recordLead, type LeadInput } from "@/lib/leads";
import { CONTACT_PHONE, SITE_URL } from "@/lib/seo";
import { buildTags, tagFields } from "@/lib/ghl-tags";

/**
 * Lead capture, replacing process_form.php and save-quiz-lead.php.
 *
 * Both PHP endpoints did the same two things in the same order: insert
 * into `leads`, then push the contact to GoHighLevel. The push ran after
 * finishRequestAndContinue() so nobody waited on a webhook; after() is
 * the equivalent here, and the GHL payload keys are copied field for
 * field so the automations already running against them keep working.
 *
 * Three surfaces post here and each keeps its own GHL key, because the
 * live account routes them to different workflows:
 *
 *   advertise  the contact form            (GHL_WEBHOOK_ADVERTISE)
 *   quiz       the Find Your Ad quiz       (GHL_WEBHOOK_QUIZ)
 *   roi        the ROI calculator          (GHL_WEBHOOK_ROI)
 *
 * The ROI calculator is new: the PHP version captured nothing, so there
 * is no legacy payload to match and the shape follows the other two.
 */

type Source = "advertise" | "quiz" | "roi";

const SOURCES: Source[] = ["advertise", "quiz", "roi"];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v: unknown, max = 500) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const count = (n: number) => Math.round(n).toLocaleString("en-US");
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * The first hop is the visitor. Everything after it is our own proxy
 * chain, and REMOTE_ADDR on the PHP host was that same first hop.
 */
const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("x-real-ip")?.trim() ||
  null;

/**
 * reCAPTCHA v3, ported from includes/recaptcha.php with its fail-open
 * behaviour intact: no secret configured, or Google unreachable, means
 * the submission goes through. A spam form is a nuisance; a form that
 * silently rejects real customers because a key expired is lost revenue.
 *
 * Unset RECAPTCHA_SECRET is the expected state, so this costs nothing
 * until an operator turns it on. The honeypot below runs either way.
 */
async function humanScore(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET?.trim();
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: ip ?? "",
      }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const data = (await res.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
      "error-codes"?: string[];
    };
    const ok =
      !!data.success && (data.score ?? 0) >= 0.5 && data.action === "lead_submit";
    if (!ok) {
      console.warn(
        `[leads] reCAPTCHA rejected: success=${data.success} score=${data.score} action=${data.action} errors=${(data["error-codes"] ?? []).join(",") || "none"}`,
      );
    }
    return ok;
  } catch (e) {
    console.error("[leads] reCAPTCHA verify unreachable, failing open:", e);
    return true;
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot filled means bot: answer success, store nothing. Same
  // silent handling the PHP gave a failed reCAPTCHA score, which sent
  // the bot to the thank-you page so it never learned it was caught.
  if (str(body.company_website) !== "") {
    return NextResponse.json({ ok: true });
  }

  const source = SOURCES.includes(body.source as Source)
    ? (body.source as Source)
    : "advertise";
  const email = str(body.email, 190);
  if (!EMAIL.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 422 },
    );
  }

  const ipAddress = clientIp(req);
  if (!(await humanScore(str(body.recaptchaToken, 8000), ipAddress))) {
    // Nothing stored, nothing pushed, and no hint that the score failed.
    return NextResponse.json({ ok: true });
  }

  const built =
    source === "quiz"
      ? buildQuiz(body, email)
      : source === "roi"
        ? buildRoi(body, email)
        : buildAdvertise(body, email);
  if ("error" in built) {
    return NextResponse.json({ error: built.error }, { status: 422 });
  }

  const submittedAt = new Date().toISOString();
  after(() => ghlSend({ ...built.ghl, submitted_at: submittedAt }, source));

  // The alerts the PHP sent and this app was not. A lead nobody is told
  // about is a lead nobody works, whatever the database says. Scheduled
  // after the response for the same reason the GHL push is: the PHP put
  // both behind finishRequestAndContinue() so nobody waits on SMTP.
  //
  // Deliberately outside the DB_HOST check below. These do not depend on
  // the insert, and in preview mode the bodies still print to the log,
  // which is how the copy gets reviewed before a key exists.
  after(async () => {
    const { sendAdvertiseLeadAlert, sendQuizLeadEmails } = await import(
      "@/lib/lead-emails"
    );
    if (source === "quiz") {
      await sendQuizLeadEmails(
        {
          email,
          businessLabel: str(body.businessTypeLabel, 120) || undefined,
          goalLabel: str(body.goalLabel, 120) || undefined,
          mailingSize: num(body.mailingSize) || undefined,
          budget: num(body.budget) || undefined,
          recommendedAd: str(body.recommendedAdSize, 80) || undefined,
          recommendedPrice: num(body.recommendedPrice) || undefined,
          ipAddress,
          submittedAt,
        },
        SITE_URL,
      );
      return;
    }
    // The ROI calculator has no legacy equivalent, so it borrows the
    // contact alert rather than going unannounced. Its own fields land
    // in the message body.
    await sendAdvertiseLeadAlert({
      companyName: str(body.companyName, 190) || "Not given",
      contactName: str(body.contactName, 190) || "Not given",
      email,
      phone: str(body.phone, 40) || undefined,
      category: str(body.category, 120) || undefined,
      location:
        str(body.location, 120) ||
        (source === "roi" ? "ROI Calculator" : undefined),
      message: str(body.message, 4000) || undefined,
      ipAddress,
      submittedAt,
    });
  });

  // No database configured (local preview): the GHL push above is still
  // the real one, so say the submission landed rather than erroring.
  if (!process.env.DB_HOST) {
    return NextResponse.json({ ok: true, preview: true });
  }

  const saved = await recordLead({
    ...built.lead,
    ipAddress,
    userAgent: req.headers.get("user-agent"),
  });

  // A failed insert with a webhook configured still put the lead in the
  // CRM, which is where it gets worked from, so the visitor is told the
  // truth: we have it. With no webhook the local table was the only
  // copy, and promising a callback nobody is holding is worse than
  // asking them to phone.
  if (!saved && !ghlConfigured(source)) {
    return NextResponse.json(
      { error: `We could not save that. Please call us on ${CONTACT_PHONE}.` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

type Built =
  | {
      lead: Omit<LeadInput, "ipAddress" | "userAgent">;
      ghl: Record<string, unknown>;
    }
  | { error: string };

/**
 * The contact form, matching process_form.php.
 *
 * The legacy advertise form carried a chosen package, so it filled
 * ad_size, distribution_reach, ad_price and built package_description
 * from them. Nobody picks a package on the contact page, so those stay
 * empty and package_description names the surface instead, which is what
 * the admin's interest column shows.
 */
function buildAdvertise(body: Record<string, unknown>, email: string): Built {
  const companyName = str(body.companyName, 190);
  const contactName = str(body.contactName, 190);
  const phone = str(body.phone, 40);
  const category = str(body.category, 120);
  const location = str(body.location, 120);
  const message = str(body.message, 4000);

  if (!companyName || !contactName) {
    return { error: "Business name, your name, and email are all required." };
  }

  // There is no category column, and there never was: the legacy form
  // put the category in notes and sent it to GHL separately. Same here,
  // with the message and the area of interest alongside it.
  const notes = [
    category ? `Category: ${category}` : "",
    location ? `Interested in: ${location}` : "",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  // GHL wants the name split. The legacy split on the first run of
  // whitespace and let everything after it be the surname, so "Mary Beth
  // Van Horn" keeps three words in lastName rather than losing two.
  const parts = contactName.split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");

  return {
    lead: {
      companyName,
      contactName,
      email,
      phone,
      notes,
      location,
      distributionReach: "",
      adSize: "",
      adPrice: 0,
      packageDescription: "Contact form",
    },
    ghl: {
      firstName,
      lastName,
      name: contactName,
      email,
      phone,
      companyName,
      source: location ? `Ad Lead: ${location}` : "Ad Lead",
      ...tagFields(
        buildTags({ kind: "advertise", zoneSlug: location, category }),
      ),
      category,
      location,
      // What they actually typed. It was going to the database and the
      // admin alert and stopping there, so the CRM held a lead with a
      // category and a neighborhood and no idea what they asked for.
      message,
      package: "",
      ad_size: "",
      distribution_reach: "",
      ad_price: 0,
    },
  };
}

/**
 * The Find Your Ad quiz, matching save-quiz-lead.php.
 *
 * That endpoint recorded the email and the four answers and nothing
 * else: no name, no phone, no business name. The quiz asks four
 * questions and then one for an email, and adding fields to the one
 * screen that stands between somebody and their answer is how a quiz
 * stops being finished.
 *
 * The labels come from the client because the quiz owns its option
 * lists. They are display strings only, capped like every other field.
 */
function buildQuiz(body: Record<string, unknown>, email: string): Built {
  const businessLabel = str(body.businessTypeLabel, 120) || "Business";
  const goalLabel = str(body.goalLabel, 120);
  const mailingSize = num(body.mailingSize);
  const budget = num(body.budget);
  const adSize = str(body.recommendedAdSize, 80);
  const price = num(body.recommendedPrice);

  const notes = [
    "Find Your Perfect Ad Quiz Lead",
    "------------------------------",
    `Business Type: ${businessLabel}`,
    `Goal: ${goalLabel}`,
    `Mailing Size: ${count(mailingSize)} households`,
    `Budget: ${money(budget)}`,
    "",
    "Recommendation:",
    `Ad Size: ${adSize || "N/A"}`,
    `Price: ${money(price)}`,
  ].join("\n");

  return {
    lead: {
      companyName: `Quiz Lead - ${businessLabel}`,
      contactName: "",
      email,
      phone: "",
      notes,
      location: "Find Your Ad Quiz",
      distributionReach: String(Math.round(mailingSize)),
      adSize: adSize || "Quiz",
      adPrice: budget,
      packageDescription: `Quiz Lead - ${count(mailingSize)} households, ${money(budget)} budget`,
    },
    ghl: {
      email,
      source: `Quiz Lead: ${businessLabel}`,
      ...tagFields(
        buildTags({ kind: "quiz", category: businessLabel, adSize }),
      ),
      business_type: businessLabel,
      goal: goalLabel,
      mailing_size: mailingSize,
      budget,
      recommended_ad: adSize,
      recommended_price: price,
    },
  };
}

/**
 * The ROI calculator. New capture, so the shape is ours: the numbers on
 * screen when they asked for the estimate, because those are the numbers
 * the follow-up call is about.
 */
function buildRoi(body: Record<string, unknown>, email: string): Built {
  const households = num(body.households);
  const adSize = str(body.adSize, 80);
  const price = num(body.price);
  const responseRate = num(body.responseRate);
  const avgSale = num(body.avgSale);
  const customers = num(body.customers);
  const revenue = num(body.revenue);
  const roi = num(body.roi);
  const ratePct = `${(responseRate * 100).toFixed(2)}%`;

  const notes = [
    "ROI Calculator Lead",
    "------------------------------",
    `Reach: ${count(households)} households`,
    `Ad Size: ${adSize || "N/A"}`,
    `Investment: ${money(price)}`,
    `Response Rate: ${ratePct}`,
    `Average Sale: ${money(avgSale)}`,
    "",
    "Projection:",
    `New Customers: ${count(customers)}`,
    `Revenue: ${money(revenue)}`,
    `Return: ${count(roi)}%`,
  ].join("\n");

  return {
    lead: {
      companyName: "ROI Calculator Lead",
      contactName: "",
      email,
      phone: "",
      notes,
      location: "ROI Calculator",
      distributionReach: String(Math.round(households)),
      adSize: adSize || "ROI",
      adPrice: price,
      packageDescription: `ROI Calculator - ${adSize || "ad"} at ${count(households)} households`,
    },
    ghl: {
      email,
      source: "ROI Calculator Lead",
      ...tagFields(buildTags({ kind: "roi", adSize })),
      ad_size: adSize,
      distribution_reach: households,
      ad_price: price,
      response_rate: responseRate,
      average_sale: avgSale,
      projected_customers: customers,
      projected_revenue: revenue,
      projected_roi: roi,
    },
  };
}
