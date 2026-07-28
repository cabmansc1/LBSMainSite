import { NextResponse } from "next/server";
import { issueLoginCode, CODE_TTL } from "@/lib/login-codes";
import { sendEmail } from "@/lib/email";

/**
 * Emails a sign-in code.
 *
 * Always answers the same way, whatever happens. Telling a caller that
 * an address is unknown turns this endpoint into a way to discover who
 * your customers are, and the wording is chosen so the honest answer
 * and the evasive one are the same sentence.
 */
const SAME_ANSWER = {
  ok: true,
  message: "If that email has an account, a code is on its way.",
};

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 422 },
    );
  }

  const issued = await issueLoginCode(email);
  if (!issued.ok) {
    // Rate limiting is worth saying out loud: the person is looking at
    // their inbox wondering where the mail is, and silence would have
    // them request more codes and dig deeper into the limit.
    if (issued.reason === "rate-limited") {
      return NextResponse.json(
        { error: "Too many codes requested. Wait a few minutes and try again." },
        { status: 429 },
      );
    }
    return NextResponse.json(SAME_ANSWER);
  }

  await sendEmail({
    to: email,
    subject: `${issued.code} is your sign-in code`,
    text: [
      `Your sign-in code is ${issued.code}`,
      "",
      `It works for the next ${CODE_TTL} minutes and can only be used once.`,
      "",
      "If you did not ask to sign in, you can ignore this. Nobody can get",
      "into your account without the code above.",
      "",
      "Lowcountry Business Spotlight",
    ].join("\n"),
  });

  return NextResponse.json(SAME_ANSWER);
}
